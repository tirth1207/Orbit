import { useState, useEffect, useCallback } from "react";

import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

import "./App.css";
import { type Action } from "./types/types";

interface AppConfig {
  enabled: boolean;
  trigger: string;
  radius: number;
  deadZone: number;
  items: Action[];
  theme: string;
}

/**
 * Root component for the "main" window — Orbit's settings UI.
 *
 * This window is hidden by default (see src-tauri/tauri.conf.json) and
 * only shown via the tray menu's "Open Settings" item. It has nothing
 * to do with the radial wheel itself anymore — that lives in its own
 * always-on-top overlay window (see src/windows/WheelWindow.tsx), so
 * the wheel can appear over whatever app currently has focus instead of
 * bringing this window to the front.
 */
function App() {
  const [config, setConfig] = useState<AppConfig>({
    enabled: true,

    // MUST MATCH RUST
    trigger: "ctrl+space",

    radius: 180,
    deadZone: 60,
    items: [],
    theme: "system",
  });

  const [settingsVisible, setSettingsVisible] = useState(false);

  const enabledItems = config.items.filter((item) => item.enabled);

  // ==================================================
  // LOAD CONFIGURATION
  // ==================================================

  useEffect(() => {
    const loadConfig = async () => {
      try {
        console.log("[Orbit] Loading configuration...");

        const result = await invoke<AppConfig>("load_configuration");

        console.log("[Orbit] Configuration:", result);

        setConfig(result);
      } catch (error) {
        console.error("[Orbit] Failed to load configuration:", error);
      }
    };

    loadConfig();
  }, []);

  // ==================================================
  // TAURI EVENT LISTENERS
  // ==================================================

  useEffect(() => {
    let unlistenEnabledChanged: (() => void) | undefined;

    const setupListeners = async () => {
      try {
        unlistenEnabledChanged = await listen<boolean>("tray-enabled-changed", (event) => {
          setConfig((prev) => ({
            ...prev,
            enabled: event.payload,
          }));
        });

        console.log("[Orbit] Settings window listeners registered");
      } catch (error) {
        console.error("[Orbit] Listener setup failed:", error);
      }
    };

    setupListeners();

    return () => {
      unlistenEnabledChanged?.();
      console.log("[Orbit] Settings window listeners cleaned up");
    };
  }, []);

  // ==================================================
  // TOGGLE ENABLED
  // ==================================================

  const toggleEnabled = useCallback(async () => {
    const newEnabled = !config.enabled;

    try {
      await invoke("toggle_enabled", {
        enabled: newEnabled,
      });

      setConfig((prev) => ({
        ...prev,
        enabled: newEnabled,
      }));
    } catch (error) {
      console.error("[Orbit] Toggle failed:", error);
    }
  }, [config.enabled]);

  // ==================================================
  // SETTINGS
  // ==================================================

  const openSettings = useCallback(() => {
    setSettingsVisible(true);
  }, []);

  const closeSettings = useCallback(() => {
    setSettingsVisible(false);
  }, []);

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

        <p>Radial utility launcher</p>

        <p>
          Trigger: <strong>Ctrl + Space</strong>
        </p>

        <p>
          Status: <strong>{config.enabled ? "Enabled" : "Disabled"}</strong>
        </p>

        <button onClick={openSettings}>Open Settings</button>

        <button onClick={toggleEnabled}>{config.enabled ? "Disable Orbit" : "Enable Orbit"}</button>
      </div>
      
      {/* ========================================= */}
      {/* SETTINGS                                  */}
      {/* ========================================= */}

      {settingsVisible && (
        <div className="settings-overlay">
          <div className="settings-window">
            <div className="settings-header">
              <h2>Orbit Settings</h2>

              <button onClick={closeSettings} aria-label="Close settings">
                ✕
              </button>
            </div>

            <div className="settings-content">
              <p>
                Current trigger: <strong>Ctrl + Space</strong>
              </p>

              <p>
                Radius: <strong>{config.radius}px</strong>
              </p>

              <p>
                Dead zone: <strong>{config.deadZone}px</strong>
              </p>

              <p>
                Total actions: <strong>{config.items.length}</strong>
              </p>

              <p>
                Enabled actions: <strong>{enabledItems.length}</strong>
              </p>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default App;