import { useState, useEffect, useCallback, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

import { RadialWheel } from "../components/wheel/RadialWheel";
import { type AppConfig, migrateAppConfig } from "../types/types";

const SAMPLE_FALLBACK_CONFIG: AppConfig = migrateAppConfig({
  version: 2,
  enabled: true,
  trigger: "ctrl+space",
  radius: 180,
  deadZone: 60,
  itemSize: 76,
  iconSize: 30,
  animationSpeed: 180,
  staggerDelay: 45,
  showLabels: true,
  showCenter: true,
  centerIcon: "×",
  enableHoverAnimation: true,
  enableStaggerAnimation: true,
  enableNestedAnimation: true,
  startWithOs: false,
  launchSettingsOnStartup: false,
  wheelStyle: "glass",
  opacity: 0.98,
  border: true,
  blur: true,
  theme: "system",
  pages: [{
    id: "music",
    name: "Music",
    icon: "music-2",
    type: "music",
    enabled: true,
    items: [
      { id: "music-play", name: "Play", type: "media", target: "playpause", icon: "play", enabled: true },
      { id: "music-next", name: "Next", type: "media", target: "next", icon: "skip-forward", enabled: true },
      { id: "music-repeat", name: "Repeat", type: "media", target: "repeat", icon: "repeat", enabled: true },
      { id: "music-shuffle", name: "Shuffle", type: "media", target: "shuffle", icon: "shuffle", enabled: true },
      { id: "music-previous", name: "Previous", type: "media", target: "previous", icon: "skip-back", enabled: true },
    ],
  }, {
    id: "applications",
    name: "Applications",
    icon: "grid-3x3",
    type: "launcher",
    enabled: true,
    items: [
      { id: "browser", name: "Browser", type: "url", target: "https://google.com", enabled: true },
      { id: "vscode", name: "VS Code", type: "application", target: "code", enabled: true },
      { id: "terminal", name: "Terminal", type: "command", target: "bash", enabled: true },
      {
        id: "ai",
        name: "AI",
        type: "menu",
        target: "",
        enabled: true,
        children: [
          { id: "chatgpt", name: "ChatGPT", type: "url", target: "https://chat.openai.com", enabled: true },
          { id: "claude", name: "Claude", type: "url", target: "https://claude.ai", enabled: true },
          { id: "gemini", name: "Gemini", type: "url", target: "https://gemini.google.com", enabled: true },
          { id: "perplexity", name: "Perplexity", type: "url", target: "https://perplexity.ai", enabled: true },
        ],
      },
    ],
  }],
  defaultPageId: "music",
});

export function WheelWindow() {
  const [config, setConfig] = useState<AppConfig | null>(null);

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
      .then((loaded) => {
        const migrated = loaded ? migrateAppConfig(loaded) : SAMPLE_FALLBACK_CONFIG;
        if (migrated && migrated.pages && migrated.pages.length > 0) {
          setConfig(migrated);
        } else {
          setConfig(SAMPLE_FALLBACK_CONFIG);
        }
      })
      .catch((error) => {
        console.warn("[Orbit] Tauri load_configuration not available, using fallback config:", error);
        setConfig(SAMPLE_FALLBACK_CONFIG);
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
        });
      } catch (error) {
        console.warn("[Orbit WheelWindow] Listener setup warning (non-Tauri environment):", error);
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
      console.warn("[Orbit] Failed to close wheel:", error);
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

      if (targetItem.type === "media") {
        await invoke("media_control", { action: targetItem.target });
        closeWheel();
        return;
      }

      /* Close wheel before executing action */
      closeWheel();

      try {
        await invoke("execute_action", {
          action: targetItem,
        });
      } catch (error) {
        console.warn("[Orbit] Failed to execute action:", error);
      }
    },
    [enabledItems, closeWheel]
  );

  /* ========================================================
     HOVER
     ======================================================== */

  const handleItemHover = useCallback(() => undefined, []);

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
          pages={config.pages}
          currentPageId={config.defaultPageId ?? config.pages[0]?.id ?? "applications"}
          config={config}
          onPageChange={(nextPageId) => {
            if (!config.pages.some((page) => page.id === nextPageId)) return;
            setConfig((current) => (current ? { ...current, defaultPageId: nextPageId } : current));
          }}
          onItemSelect={handleItemSelect}
          onItemHover={handleItemHover}
          onClose={closeWheel}
        />
      </div>
    </div>
  );
}



