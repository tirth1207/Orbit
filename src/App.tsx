import { useState, useEffect, useCallback } from "react";

import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

import "./App.css";
import { RadialWheel } from "./components/wheel/RadialWheel";

interface Action {
  id: string;
  name: string;
  actionType: string;
  target: string;
  icon: string | null;
  enabled: boolean;
}

interface AppConfig {
  enabled: boolean;
  trigger: string;
  radius: number;
  deadZone: number;
  items: Action[];
  theme: string;
}

interface WheelState {
  open: boolean;
  selectedIndex: number;
  hoveredIndex: number | null;
  itemCount: number;
}

interface OrbitTriggerPayload {
  x: number;
  y: number;
}

function App() {
  const [config, setConfig] =
    useState<AppConfig>({
      enabled: true,

      // MUST MATCH RUST
      trigger: "ctrl+space",

      radius: 180,
      deadZone: 60,
      items: [],
      theme: "system",
    });

  const [wheel, setWheel] =
    useState<WheelState>({
      open: false,
      selectedIndex: -1,
      hoveredIndex: null,
      itemCount: 0,
    });

  const [settingsVisible, setSettingsVisible] =
    useState(false);

  // ==================================================
  // ENABLED ITEMS
  // ==================================================

  const enabledItems = config.items.filter(
    (item) => item.enabled
  );

  // ==================================================
  // LOAD CONFIGURATION
  // ==================================================

  useEffect(() => {
    const loadConfig = async () => {
      try {
        console.log(
          "[Orbit] Loading configuration..."
        );

        const result =
          await invoke<AppConfig>(
            "load_configuration"
          );

        console.log(
          "[Orbit] Configuration:",
          result
        );

        setConfig(result);

        setWheel((prev) => ({
          ...prev,
          itemCount: result.items.filter(
            (item) => item.enabled
          ).length,
        }));
      } catch (error) {
        console.error(
          "[Orbit] Failed to load configuration:",
          error
        );
      }
    };

    loadConfig();
  }, []);

  // ==================================================
  // TAURI EVENT LISTENERS
  // ==================================================

  useEffect(() => {
    let unlistenTrigger:
      | (() => void)
      | undefined;

    let unlistenWheelOpen:
      | (() => void)
      | undefined;

    let unlistenWheelClose:
      | (() => void)
      | undefined;

    let unlistenActionExecute:
      | (() => void)
      | undefined;

    let unlistenEnabledChanged:
      | (() => void)
      | undefined;

    const setupListeners = async () => {
      try {
        // --------------------------------------------
        // GLOBAL SHORTCUT
        // --------------------------------------------

        unlistenTrigger =
          await listen<OrbitTriggerPayload>(
            "orbit-trigger",
            (event) => {
              console.log(
                "================================"
              );

              console.log(
                "[Orbit] GLOBAL SHORTCUT RECEIVED"
              );

              console.log(
                "[Orbit] Payload:",
                event.payload
              );

              console.log(
                "================================"
              );

              if (!config.enabled) {
                console.log(
                  "[Orbit] Disabled - ignoring shortcut"
                );

                return;
              }

              setWheel((prev) => ({
                ...prev,
                open: true,
                selectedIndex: -1,
                hoveredIndex: null,
              }));
            }
          );

        // --------------------------------------------
        // WHEEL OPEN
        // --------------------------------------------

        unlistenWheelOpen =
          await listen<OrbitTriggerPayload>(
            "wheel-open",
            (event) => {
              console.log(
                "[Orbit] wheel-open:",
                event.payload
              );

              setWheel((prev) => ({
                ...prev,
                open: true,
                selectedIndex: -1,
                hoveredIndex: null,
              }));
            }
          );

        // --------------------------------------------
        // WHEEL CLOSE
        // --------------------------------------------

        unlistenWheelClose =
          await listen(
            "wheel-close",
            () => {
              console.log(
                "[Orbit] wheel-close"
              );

              setWheel((prev) => ({
                ...prev,
                open: false,
                selectedIndex: -1,
                hoveredIndex: null,
              }));
            }
          );

        // --------------------------------------------
        // ACTION EXECUTE
        // --------------------------------------------

        unlistenActionExecute =
          await listen<Action>(
            "action-execute",
            async (event) => {
              const action =
                event.payload;

              if (!action) {
                return;
              }

              console.log(
                "[Orbit] Executing:",
                action.name
              );

              try {
                await invoke(
                  "execute_action",
                  {
                    action,
                  }
                );

                setWheel((prev) => ({
                  ...prev,
                  open: false,
                  selectedIndex: -1,
                  hoveredIndex: null,
                }));
              } catch (error) {
                console.error(
                  "[Orbit] Action execution failed:",
                  error
                );
              }
            }
          );

        // --------------------------------------------
        // ENABLED CHANGED
        // --------------------------------------------

        unlistenEnabledChanged =
          await listen<boolean>(
            "tray-enabled-changed",
            (event) => {
              setConfig((prev) => ({
                ...prev,
                enabled: event.payload,
              }));
            }
          );

        console.log(
          "[Orbit] All Tauri listeners registered"
        );
      } catch (error) {
        console.error(
          "[Orbit] Listener setup failed:",
          error
        );
      }
    };

    setupListeners();

    return () => {
      unlistenTrigger?.();
      unlistenWheelOpen?.();
      unlistenWheelClose?.();
      unlistenActionExecute?.();
      unlistenEnabledChanged?.();

      console.log(
        "[Orbit] Tauri listeners cleaned up"
      );
    };
  }, [config.enabled]);

  // ==================================================
  // TOGGLE ENABLED
  // ==================================================

  const toggleEnabled =
    useCallback(async () => {
      const newEnabled =
        !config.enabled;

      try {
        await invoke(
          "toggle_enabled",
          {
            enabled: newEnabled,
          }
        );

        setConfig((prev) => ({
          ...prev,
          enabled: newEnabled,
        }));
      } catch (error) {
        console.error(
          "[Orbit] Toggle failed:",
          error
        );
      }
    }, [config.enabled]);

  // ==================================================
  // SETTINGS
  // ==================================================

  const openSettings =
    useCallback(() => {
      setSettingsVisible(true);
    }, []);

  const closeSettings =
    useCallback(() => {
      setSettingsVisible(false);
    }, []);

  // ==================================================
  // SELECT WHEEL ITEM
  // ==================================================

  const handleItemSelect =
    useCallback(
      async (index: number) => {
        // IMPORTANT:
        // Use enabledItems instead of config.items
        // because RadialWheel displays enabledItems.

        const item =
          enabledItems[index];

        if (!item) {
          console.warn(
            "[Orbit] Invalid wheel index:",
            index
          );

          return;
        }

        console.log(
          "[Orbit] Selected:",
          item.name
        );

        try {
          await invoke(
            "execute_action",
            {
              action: item,
            }
          );

          setWheel((prev) => ({
            ...prev,
            open: false,
            selectedIndex: -1,
            hoveredIndex: null,
          }));
        } catch (error) {
          console.error(
            "[Orbit] Failed to execute action:",
            error
          );
        }
      },
      [enabledItems]
    );

  // ==================================================
  // HOVER
  // ==================================================

  const handleItemHover =
    useCallback(
      (index: number | null) => {
        setWheel((prev) => ({
          ...prev,
          hoveredIndex: index,
        }));
      },
      []
    );

  // ==================================================
  // CLOSE WHEEL
  // ==================================================

  const closeWheel =
    useCallback(() => {
      setWheel((prev) => ({
        ...prev,
        open: false,
        selectedIndex: -1,
        hoveredIndex: null,
      }));
    }, []);

  // ==================================================
  // ESCAPE
  // ==================================================

  useEffect(() => {
    const handleKeyDown =
      (event: KeyboardEvent) => {
        if (
          event.key === "Escape" &&
          wheel.open
        ) {
          closeWheel();
        }
      };

    document.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () => {
      document.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, [wheel.open, closeWheel]);

  // ==================================================
  // RENDER
  // ==================================================

  return (
    <main className="container">

      {/* ========================================= */}
      {/* APP INFO                                  */}
      {/* ========================================= */}

      <div className="orbit-info">
        <h2>Orbit</h2>

        <p>
          Radial utility launcher
        </p>

        <p>
          Trigger:{" "}
          <strong>
            Ctrl + Space
          </strong>
        </p>

        <p>
          Status:{" "}
          <strong>
            {config.enabled
              ? "Enabled"
              : "Disabled"}
          </strong>
        </p>

        <button
          onClick={openSettings}
        >
          Open Settings
        </button>

        <button
          onClick={toggleEnabled}
        >
          {config.enabled
            ? "Disable Orbit"
            : "Enable Orbit"}
        </button>
      </div>

      {/* ========================================= */}
      {/* RADIAL WHEEL                              */}
      {/* ========================================= */}

      {wheel.open && (
        <RadialWheel
          items={enabledItems.map(
            (item) => ({
              id: item.id,
              name: item.name,
              type: item.actionType,
              target: item.target,
              icon:
                item.icon ??
                "/orbit-icon.png",
              enabled: item.enabled,
            })
          )}

          selectedIndex={
            wheel.selectedIndex
          }

          hoveredIndex={
            wheel.hoveredIndex
          }

          onItemSelect={
            handleItemSelect
          }

          onItemHover={
            handleItemHover
          }

          onClose={closeWheel}

          radius={config.radius}

          deadZone={
            config.deadZone
          }

          showCenter={true}

          centerIcon="🛰️"
        />
      )}

      {/* ========================================= */}
      {/* SETTINGS                                  */}
      {/* ========================================= */}

      {settingsVisible && (
        <div className="settings-overlay">
          <div className="settings-window">

            <div className="settings-header">
              <h2>
                Orbit Settings
              </h2>

              <button
                onClick={
                  closeSettings
                }
                aria-label="Close settings"
              >
                ✕
              </button>
            </div>

            <div className="settings-content">

              <p>
                Current trigger:{" "}
                <strong>
                  Ctrl + Space
                </strong>
              </p>

              <p>
                Radius:{" "}
                <strong>
                  {config.radius}px
                </strong>
              </p>

              <p>
                Dead zone:{" "}
                <strong>
                  {config.deadZone}px
                </strong>
              </p>

              <p>
                Total actions:{" "}
                <strong>
                  {config.items.length}
                </strong>
              </p>

              <p>
                Enabled actions:{" "}
                <strong>
                  {enabledItems.length}
                </strong>
              </p>

            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default App;