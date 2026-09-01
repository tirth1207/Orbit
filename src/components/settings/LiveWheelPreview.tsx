import React from "react";
import { RadialWheel } from "../wheel/RadialWheel";
import { type AppConfig } from "../../types/types";

interface LiveWheelPreviewProps {
  config: AppConfig;
}

export const LiveWheelPreview: React.FC<LiveWheelPreviewProps> = ({ config }) => {
  const currentPage = config.pages.find((page) => page.id === config.defaultPageId) ?? config.pages[0];
  const enabledItems = currentPage?.items.filter((item) => item.enabled) ?? [];

  const handleItemSelect = (index: number, childIndex?: number) => {
    const item = enabledItems[index];
    if (!item) return;

    if (childIndex !== undefined && item.children?.[childIndex]) {
      const child = item.children[childIndex];
      console.log("[Orbit Live Preview] Selected child action:", child.name);
    } else {
      console.log("[Orbit Live Preview] Selected root action:", item.name);
    }
  };

  return (
    <div className="orbit-live-preview-card">
      <div className="orbit-preview-header">
        <span className="orbit-preview-tag">● Interactive Live Preview</span>
        <span className="orbit-preview-subtitle">
          {enabledItems.length} active items ({config.radius}px radius)
        </span>
      </div>

      <div className="orbit-preview-viewport">
        <div
          className="orbit-preview-wheel-wrapper"
          style={{
            transform: "scale(0.85)",
            transformOrigin: "center center",
          }}
        >
          <RadialWheel
            pages={config.pages}
            currentPageId={config.defaultPageId ?? config.pages[0]?.id ?? "applications"}
            config={config}
            onPageChange={() => undefined}
            onItemSelect={handleItemSelect}
            onItemHover={() => undefined}
            onClose={() => console.log("[Orbit Live Preview] Center closed")}
          />
        </div>
      </div>
    </div>
  );
};



