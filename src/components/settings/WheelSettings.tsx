import React from "react";
import { Compass, Zap } from "lucide-react";
import { type AppConfig } from "../../types/types";

interface WheelSettingsProps {
  config: AppConfig;
  onChange: (updated: Partial<AppConfig>) => void;
}

export const WheelSettings: React.FC<WheelSettingsProps> = ({
  config,
  onChange,
}) => {
  return (
    <div className="orbit-section-panel">
      <div className="orbit-section-header">
        <div>
          <h2>Radial Wheel Geometry & Behavior</h2>
          <p>Customize dimensions, dead zone, sizing, and animations.</p>
        </div>
      </div>

      <div className="orbit-settings-grid-2col">
        {/* GEOMETRY CARD */}
        <div className="orbit-card">
          <div className="orbit-card-title-bar">
            <Compass size={18} />
            <h3>Dimensions & Sizing</h3>
          </div>

          <div className="orbit-card-body">
            {/* RADIUS */}
            <div className="orbit-slider-field">
              <div className="orbit-slider-header">
                <label>Wheel Radius</label>
                <span className="orbit-slider-value">{config.radius} px</span>
              </div>
              <input
                type="range"
                min={110}
                max={300}
                step={5}
                className="orbit-range"
                value={config.radius}
                onChange={(e) => onChange({ radius: Number(e.target.value) })}
              />
              <span className="orbit-field-hint">
                Distance from center to main wheel outer edge.
              </span>
            </div>

            {/* DEAD ZONE */}
            <div className="orbit-slider-field">
              <div className="orbit-slider-header">
                <label>Dead Zone</label>
                <span className="orbit-slider-value">{config.deadZone} px</span>
              </div>
              <input
                type="range"
                min={20}
                max={100}
                step={2}
                className="orbit-range"
                value={config.deadZone}
                onChange={(e) => onChange({ deadZone: Number(e.target.value) })}
              />
              <span className="orbit-field-hint">
                Center region radius where mouse interaction is ignored.
              </span>
            </div>

            {/* ITEM SIZE */}
            <div className="orbit-slider-field">
              <div className="orbit-slider-header">
                <label>Item Sector Size</label>
                <span className="orbit-slider-value">{config.itemSize} px</span>
              </div>
              <input
                type="range"
                min={52}
                max={96}
                step={2}
                className="orbit-range"
                value={config.itemSize}
                onChange={(e) => onChange({ itemSize: Number(e.target.value) })}
              />
            </div>

            {/* ICON SIZE */}
            <div className="orbit-slider-field">
              <div className="orbit-slider-header">
                <label>Icon Size</label>
                <span className="orbit-slider-value">{config.iconSize} px</span>
              </div>
              <input
                type="range"
                min={18}
                max={48}
                step={2}
                className="orbit-range"
                value={config.iconSize}
                onChange={(e) => onChange({ iconSize: Number(e.target.value) })}
              />
            </div>
          </div>
        </div>

        {/* ANIMATIONS & TOGGLES */}
        <div className="orbit-card">
          <div className="orbit-card-title-bar">
            <Zap size={18} />
            <h3>Animations & Toggles</h3>
          </div>

          <div className="orbit-card-body">
            {/* ANIMATION SPEED */}
            <div className="orbit-slider-field">
              <div className="orbit-slider-header">
                <label>Animation Speed</label>
                <span className="orbit-slider-value">{config.animationSpeed} ms</span>
              </div>
              <input
                type="range"
                min={80}
                max={400}
                step={10}
                className="orbit-range"
                value={config.animationSpeed}
                onChange={(e) =>
                  onChange({ animationSpeed: Number(e.target.value) })
                }
              />
            </div>

            {/* STAGGER DELAY */}
            <div className="orbit-slider-field">
              <div className="orbit-slider-header">
                <label>Item Stagger Delay</label>
                <span className="orbit-slider-value">{config.staggerDelay} ms</span>
              </div>
              <input
                type="range"
                min={10}
                max={100}
                step={5}
                className="orbit-range"
                value={config.staggerDelay}
                onChange={(e) =>
                  onChange({ staggerDelay: Number(e.target.value) })
                }
              />
            </div>

            {/* TOGGLE ROWS */}
            <div className="orbit-toggle-list">
              <div className="orbit-toggle-row">
                <span className="orbit-row-title">Show Action Labels</span>
                <label className="orbit-switch orbit-switch-sm">
                  <input
                    type="checkbox"
                    checked={config.showLabels}
                    onChange={(e) => onChange({ showLabels: e.target.checked })}
                  />
                  <span className="orbit-slider" />
                </label>
              </div>

              <div className="orbit-toggle-row">
                <span className="orbit-row-title">Show Center Button</span>
                <label className="orbit-switch orbit-switch-sm">
                  <input
                    type="checkbox"
                    checked={config.showCenter}
                    onChange={(e) => onChange({ showCenter: e.target.checked })}
                  />
                  <span className="orbit-slider" />
                </label>
              </div>

              {config.showCenter && (
                <div className="orbit-sub-field">
                  <label>Center Button Icon</label>
                  <input
                    type="text"
                    className="orbit-input orbit-input-sm"
                    value={config.centerIcon}
                    onChange={(e) => onChange({ centerIcon: e.target.value })}
                  />
                </div>
              )}

              <div className="orbit-toggle-row">
                <span className="orbit-row-title">Enable Hover Scale</span>
                <label className="orbit-switch orbit-switch-sm">
                  <input
                    type="checkbox"
                    checked={config.enableHoverAnimation}
                    onChange={(e) =>
                      onChange({ enableHoverAnimation: e.target.checked })
                    }
                  />
                  <span className="orbit-slider" />
                </label>
              </div>

              <div className="orbit-toggle-row">
                <span className="orbit-row-title">Enable Stagger Animation</span>
                <label className="orbit-switch orbit-switch-sm">
                  <input
                    type="checkbox"
                    checked={config.enableStaggerAnimation}
                    onChange={(e) =>
                      onChange({ enableStaggerAnimation: e.target.checked })
                    }
                  />
                  <span className="orbit-slider" />
                </label>
              </div>

              <div className="orbit-toggle-row">
                <span className="orbit-row-title">Enable Submenu Animation</span>
                <label className="orbit-switch orbit-switch-sm">
                  <input
                    type="checkbox"
                    checked={config.enableNestedAnimation}
                    onChange={(e) =>
                      onChange({ enableNestedAnimation: e.target.checked })
                    }
                  />
                  <span className="orbit-slider" />
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};



