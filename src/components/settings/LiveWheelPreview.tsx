import React, { useState } from "react";
import { RadialWheel } from "../wheel/RadialWheel";
import { type AppConfig } from "../../types/types";

interface LiveWheelPreviewProps {
  config: AppConfig;
}

export const LiveWheelPreview: React.FC<LiveWheelPreviewProps> = ({ config }) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const enabledItems = config.items.filter((item) => item.enabled);

  const wheelItems = enabledItems.map((item) => ({
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
  }));

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
            items={wheelItems}
            selectedIndex={-1}
            hoveredIndex={hoveredIndex}
            onItemSelect={handleItemSelect}
            onItemHover={(index) => setHoveredIndex(index)}
            onClose={() => console.log("[Orbit Live Preview] Center closed")}
            radius={config.radius}
            deadZone={config.deadZone}
            showCenter={config.showCenter}
            centerIcon={config.centerIcon}
          />
        </div>
      </div>
    </div>
  );
};
