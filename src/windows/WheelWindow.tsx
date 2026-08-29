import { useCallback, useEffect, useRef, useState } from "react";

import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

import { RadialWheel } from "../components/wheel/RadialWheel";
import { type Action } from "../types/types";

interface WheelAppConfig {
  enabled: boolean;
  trigger: string;
  radius: number;
  deadZone: number;
  items: Action[];
  theme: string;
}

interface LocalWheelState {
  selectedIndex: number;
  hoveredIndex: number | null;
}

/**
 * Root component for the dedicated "wheel" window (index.html#/wheel).
 *
 * This window is transparent, undecorated, always-on-top and hidden by
 * default — src-tauri positions it on the cursor and shows it when the
 * global shortcut fires, so the wheel appears as an overlay above
 * whatever app currently has focus (Chrome, VS Code, etc.) instead of
 * bringing Orbit's own window to the front.
 *
 * The window is hidden (not destroyed) on close, so this component's
 * state persists between openings — the "orbit-trigger" listener below
 * resets selection state each time it's shown again.
 */
export function WheelWindow() {
  const [config, setConfig] = useState<WheelAppConfig | null>(null);
  const [wheel, setWheel] = useState<LocalWheelState>({
    selectedIndex: -1,
    hoveredIndex: null,
  });

  // Guards against double-invoking close_wheel (e.g. Escape firing while
  // a selection is already closing the window).
  const closingRef = useRef(false);

  // This window has no visible chrome of its own — only the wheel
  // should be visible, so the page background must stay fully
  // transparent (the settings window, loaded without the #/wheel hash,
  // is unaffected since this effect only runs here).
  useEffect(() => {
    document.documentElement.style.background = "transparent";
    document.body.style.background = "transparent";
  }, []);

  useEffect(() => {
    invoke<WheelAppConfig>("load_configuration")
      .then(setConfig)
      .catch((error) => console.error("[Orbit] Failed to load configuration:", error));
  }, []);

  useEffect(() => {
    let unlistenTrigger: (() => void) | undefined;

    listen("orbit-trigger", () => {
      closingRef.current = false;
      setWheel({ selectedIndex: -1, hoveredIndex: null });
    }).then((fn) => {
      unlistenTrigger = fn;
    });

    return () => {
      unlistenTrigger?.();
    };
  }, []);

  // Picks config back up if it changes while the window sits hidden
  // (e.g. items edited from the settings window).
  useEffect(() => {
    let unlistenEnabledChanged: (() => void) | undefined;

    listen<boolean>("tray-enabled-changed", (event) => {
      setConfig((prev) => (prev ? { ...prev, enabled: event.payload } : prev));
    }).then((fn) => {
      unlistenEnabledChanged = fn;
    });

    return () => {
      unlistenEnabledChanged?.();
    };
  }, []);

  const closeWheel = useCallback(() => {
    if (closingRef.current) {
      return;
    }

    closingRef.current = true;

    invoke("close_wheel").catch((error) => {
      console.error("[Orbit] Failed to close wheel:", error);
      closingRef.current = false;
    });
  }, []);

  const enabledItems = (config?.items ?? []).filter((item) => item.enabled);

  const handleItemSelect = useCallback(
    async (index: number) => {
      const item = enabledItems[index];

      if (!item) {
        console.warn("[Orbit] Invalid wheel index:", index);
        return;
      }

      console.log("[Orbit] Selected:", item.name);

      try {
        await invoke("execute_action", { action: item });
      } catch (error) {
        console.error("[Orbit] Failed to execute action:", error);
      } finally {
        closeWheel();
      }
    },
    [enabledItems, closeWheel],
  );

  const handleItemHover = useCallback((index: number | null) => {
    setWheel((prev) => ({ ...prev, hoveredIndex: index }));
  }, []);

  // Config hasn't loaded yet (very first launch) — render nothing rather
  // than a wheel with zero items.
  if (!config) {
    return null;
  }

  return (
    <div
      style={{
        width: "fit-content",
        height: "fit-content",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "transparent",
        overflow: "hidden"
      }}
    >
      <RadialWheel
        items={enabledItems.map((item) => ({
          id: item.id,
          name: item.name,
          type: item.type,
          target: item.target,
          icon: item.icon ?? "/orbit-icon.png",
          enabled: item.enabled,
        }))}
        selectedIndex={wheel.selectedIndex}
        hoveredIndex={wheel.hoveredIndex}
        onItemSelect={handleItemSelect}
        onItemHover={handleItemHover}
        onClose={closeWheel}
        radius={config.radius}
        deadZone={config.deadZone}
        showCenter={true}
        centerIcon="x"
      />
    </div>
  );
}