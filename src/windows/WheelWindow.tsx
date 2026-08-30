import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

import { RadialWheel } from "../components/wheel/RadialWheel";
import { type AppConfig } from "../types/types";

interface LocalWheelState {
  selectedIndex: number;
  hoveredIndex: number | null;
}

export function WheelWindow() {
  const [config, setConfig] = useState<AppConfig | null>(null);

  const [wheel, setWheel] = useState<LocalWheelState>({
    selectedIndex: -1,
    hoveredIndex: null,
  });

  const closingRef = useRef(false);

  /* ========================================================
     TRANSPARENT OVERLAY SETUP
     ======================================================== */

  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;

    html.style.margin = "0";
    html.style.padding = "0";
    html.style.width = "100%";
    html.style.height = "100%";
    html.style.overflow = "hidden";
    html.style.background = "transparent";

    body.style.margin = "0";
    body.style.padding = "0";
    body.style.width = "100%";
    body.style.height = "100%";
    body.style.overflow = "hidden";
    body.style.background = "transparent";

    return () => {
      html.style.overflow = "";
      body.style.overflow = "";
    };
  }, []);

  /* ========================================================
     LOAD CONFIG & LISTEN TO LIVE CONFIG UPDATES
     ======================================================== */

  useEffect(() => {
    invoke<AppConfig>("load_configuration")
      .then(setConfig)
      .catch((error) => {
        console.error("[Orbit] Failed to load configuration:", error);
      });
  }, []);

  useEffect(() => {
    let unlistenConfig: (() => void) | undefined;
    let unlistenEnabled: (() => void) | undefined;
    let unlistenTrigger: (() => void) | undefined;

    const setupListeners = async () => {
      try {
        unlistenConfig = await listen<AppConfig>("orbit-config-changed", (event) => {
          console.log("[Orbit WheelWindow] Configuration updated live:", event.payload);
          setConfig(event.payload);
        });

        unlistenEnabled = await listen<boolean>("tray-enabled-changed", (event) => {
          setConfig((prev) => (prev ? { ...prev, enabled: event.payload } : prev));
        });

        unlistenTrigger = await listen("orbit-trigger", () => {
          closingRef.current = false;
          setWheel({
            selectedIndex: -1,
            hoveredIndex: null,
          });
        });
      } catch (error) {
        console.error("[Orbit WheelWindow] Failed to setup listeners:", error);
      }
    };

    setupListeners();

    return () => {
      unlistenConfig?.();
      unlistenEnabled?.();
      unlistenTrigger?.();
    };
  }, []);

  /* ========================================================
     CLOSE WHEEL
     ======================================================== */

  const closeWheel = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;

    invoke("close_wheel").catch((error) => {
      console.error("[Orbit] Failed to close wheel:", error);
      closingRef.current = false;
    });
  }, []);

  /* ========================================================
     ENABLED ITEMS
     ======================================================== */

  const enabledItems = (config?.items ?? []).filter((item) => item.enabled);

  /* ========================================================
     SELECT ACTION
     ======================================================== */

  const handleItemSelect = useCallback(
    async (index: number, childIndex?: number) => {
      const item = enabledItems[index];

      if (!item) {
        console.warn("[Orbit] Invalid wheel index:", index);
        closeWheel();
        return;
      }

      /* Parent item with children -> open nested menu */
      if (childIndex === undefined && item.children && item.children.length > 0) {
        return;
      }

      let targetItem = item;

      /* Nested child selection */
      if (childIndex !== undefined && item.children && item.children[childIndex]) {
        targetItem = item.children[childIndex];
      }

      console.log("[Orbit] Selected:", targetItem.name);

      /* Close wheel before executing action */
      closeWheel();

      try {
        await invoke("execute_action", {
          action: targetItem,
        });
      } catch (error) {
        console.error("[Orbit] Failed to execute action:", error);
      }
    },
    [enabledItems, closeWheel]
  );

  /* ========================================================
     HOVER
     ======================================================== */

  const handleItemHover = useCallback((index: number | null) => {
    setWheel((prev) => ({
      ...prev,
      hoveredIndex: index,
    }));
  }, []);

  if (!config) return null;

  /* ========================================================
     RENDER RADIAL OVERLAY
     ======================================================== */

  return (
    <div
      className="wheel-window-root"
      style={{
        position: "relative",
        width: "100vw",
        height: "100vh",
        minWidth: 0,
        minHeight: 0,
        margin: 0,
        padding: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "transparent",
        overflow: "visible",
        pointerEvents: "none",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          position: "relative",
          width: "fit-content",
          height: "fit-content",
          flex: "0 0 auto",
          display: "block",
          overflow: "visible",
          pointerEvents: "auto",
        }}
      >
        <RadialWheel
          items={enabledItems.map((item) => ({
            id: item.id,
            name: item.name,
            type: item.type,
            target: item.target,
            icon: item.icon ?? undefined,
            enabled: item.enabled,
            children: item.children?.map((child) => ({
              id: child.id,
              name: child.name,
              type: child.type,
              target: child.target,
              icon: child.icon ?? undefined,
              enabled: child.enabled,
            })),
          }))}
          selectedIndex={wheel.selectedIndex}
          hoveredIndex={wheel.hoveredIndex}
          onItemSelect={handleItemSelect}
          onItemHover={handleItemHover}
          onClose={closeWheel}
          radius={config.radius}
          deadZone={config.deadZone}
          showCenter={config.showCenter ?? true}
          centerIcon={config.centerIcon ?? "×"}
        />
      </div>
    </div>
  );
}
