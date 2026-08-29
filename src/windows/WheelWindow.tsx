import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

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

export function WheelWindow() {
  const [config, setConfig] =
    useState<WheelAppConfig | null>(null);

  const [wheel, setWheel] =
    useState<LocalWheelState>({
      selectedIndex: -1,
      hoveredIndex: null,
    });

  const closingRef =
    useRef(false);

  /* ========================================================
     MAKE THE TAURI WEBVIEW A TRUE TRANSPARENT OVERLAY
     ======================================================== */

  useEffect(() => {
    const html =
      document.documentElement;

    const body =
      document.body;

    html.style.margin = "0";
    html.style.padding = "0";

    html.style.width = "100%";
    html.style.height = "100%";

    html.style.overflow = "hidden";

    html.style.background =
      "transparent";

    body.style.margin = "0";
    body.style.padding = "0";

    body.style.width = "100%";
    body.style.height = "100%";

    body.style.overflow = "hidden";

    body.style.background =
      "transparent";

    return () => {
      html.style.overflow = "";
      body.style.overflow = "";
    };
  }, []);

  /* ========================================================
     LOAD CONFIG
     ======================================================== */

  useEffect(() => {
    invoke<WheelAppConfig>(
      "load_configuration"
    )
      .then(setConfig)
      .catch((error) => {
        console.error(
          "[Orbit] Failed to load configuration:",
          error
        );
      });
  }, []);

  /* ========================================================
     TRIGGER
     ======================================================== */

  useEffect(() => {
    let unlisten:
      (() => void) | undefined;

    listen(
      "orbit-trigger",
      () => {
        closingRef.current = false;

        setWheel({
          selectedIndex: -1,
          hoveredIndex: null,
        });
      }
    ).then((fn) => {
      unlisten = fn;
    });

    return () => {
      unlisten?.();
    };
  }, []);

  /* ========================================================
     ENABLED STATE
     ======================================================== */

  useEffect(() => {
    let unlisten:
      (() => void) | undefined;

    listen<boolean>(
      "tray-enabled-changed",
      (event) => {
        setConfig((prev) =>
          prev
            ? {
                ...prev,
                enabled:
                  event.payload,
              }
            : prev
        );
      }
    ).then((fn) => {
      unlisten = fn;
    });

    return () => {
      unlisten?.();
    };
  }, []);

  /* ========================================================
     CLOSE
     ======================================================== */

  const closeWheel =
    useCallback(() => {
      if (closingRef.current) {
        return;
      }

      closingRef.current = true;

      invoke("close_wheel").catch(
        (error) => {
          console.error(
            "[Orbit] Failed to close wheel:",
            error
          );

          closingRef.current = false;
        }
      );
    }, []);

  /* ========================================================
     ENABLED ITEMS
     ======================================================== */

  const enabledItems =
    (config?.items ?? [])
      .filter(
        (item) =>
          item.enabled
      );

  /* ========================================================
     SELECT
     ======================================================== */

 const handleItemSelect = useCallback(
  async (
    index: number,
    childIndex?: number,
  ) => {
    const item = enabledItems[index];

    if (!item) {
      console.warn(
        "[Orbit] Invalid wheel index:",
        index,
      );

      closeWheel();
      return;
    }

    /*
     * Parent item with children:
     *
     * Clicking AI should OPEN the nested menu,
     * not close the wheel.
     */
    if (
      childIndex === undefined &&
      item.children &&
      item.children.length > 0
    ) {
      return;
    }

    let targetItem = item;

    /*
     * Nested child selection.
     */
    if (
      childIndex !== undefined &&
      item.children &&
      item.children[childIndex]
    ) {
      targetItem =
        item.children[childIndex];
    }

    console.log(
      "[Orbit] Selected:",
      targetItem.name,
    );

    /*
     * =====================================================
     * CLOSE FIRST
     * =====================================================
     *
     * This is intentionally BEFORE execute_action.
     *
     * The UI lifecycle must not depend on whether the
     * command succeeds or fails.
     */
    closeWheel();

    /*
     * Execute after requesting the wheel to close.
     */
    try {
      await invoke("execute_action", {
        action: targetItem,
      });
    } catch (error) {
      console.error(
        "[Orbit] Failed to execute action:",
        error,
      );
    }
  },
  [
    enabledItems,
    closeWheel,
  ],
);

  /* ========================================================
     HOVER
     ======================================================== */

  const handleItemHover =
    useCallback(
      (
        index: number | null
      ) => {
        setWheel((prev) => ({
          ...prev,
          hoveredIndex: index,
        }));
      },
      []
    );

  /* ========================================================
     WAIT FOR CONFIG
     ======================================================== */

  if (!config) {
    return null;
  }

  /* ========================================================
     RENDER
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

        background:
          "transparent",

        overflow: "visible",

        pointerEvents:
          "none",

        boxSizing:
          "border-box",
      }}
    >
      <div
        style={{
          position: "relative",

          width: "fit-content",
          height: "fit-content",

          flex: "0 0 auto",

          display: "block",

          overflow:
            "visible",

          pointerEvents:
            "auto",
        }}
      >
        <RadialWheel
          items={enabledItems.map(
            (item) => ({
              id: item.id,
              name: item.name,
              type: item.type,
              target: item.target,

              icon:
                item.icon ??
                undefined,

              enabled:
                item.enabled,

              children:
                item.children?.map(
                  (child) => ({
                    id: child.id,
                    name: child.name,
                    type: child.type,
                    target:
                      child.target,

                    icon:
                      child.icon ??
                      undefined,

                    enabled:
                      child.enabled,
                  })
                ),
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

          onClose={
            closeWheel
          }

          radius={
            config.radius
          }

          deadZone={
            config.deadZone
          }

          showCenter={true}

          centerIcon="x"
        />
      </div>
    </div>
  );
}