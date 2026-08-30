import React from "react";
import { Palette, Eye } from "lucide-react";
import { type AppConfig } from "../../types/types";

interface AppearanceSettingsProps {
  config: AppConfig;
  onChange: (updated: Partial<AppConfig>) => void;
}

export const AppearanceSettings: React.FC<AppearanceSettingsProps> = ({
  config,
  onChange,
}) => {
  return (
    <div className="orbit-section-panel">
      <div className="orbit-section-header">
        <div>
          <h2>Appearance & Styling</h2>
          <p>Customize themes, glassmorphism, opacity, and borders.</p>
        </div>
      </div>

      <div className="orbit-settings-grid-2col">
        {/* THEMES & STYLES */}
        <div className="orbit-card">
          <div className="orbit-card-title-bar">
            <Palette size={18} />
            <h3>Theme & Wheel Style</h3>
          </div>

          <div className="orbit-card-body">
            {/* THEME SELECTOR */}
            <div className="orbit-form-field">
              <label>Theme</label>
              <div className="orbit-radio-group">
                {["system", "dark", "light"].map((t) => (
                  <label
                    key={t}
                    className={`orbit-radio-card ${
                      config.theme === t ? "is-selected" : ""
                    }`}
                  >
                    <input
                      type="radio"
                      name="theme"
                      value={t}
                      checked={config.theme === t}
                      onChange={() => onChange({ theme: t })}
                    />
                    <span className="orbit-radio-label">
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* WHEEL STYLE */}
            <div className="orbit-form-field">
              <label>Wheel Style</label>
              <div className="orbit-radio-group">
                {[
                  { id: "glass", name: "Glassmorphism" },
                  { id: "solid", name: "Solid Dark" },
                  { id: "minimal", name: "Minimalist" },
                ].map((st) => (
                  <label
                    key={st.id}
                    className={`orbit-radio-card ${
                      config.wheelStyle === st.id ? "is-selected" : ""
                    }`}
                  >
                    <input
                      type="radio"
                      name="wheelStyle"
                      value={st.id}
                      checked={config.wheelStyle === st.id}
                      onChange={() => onChange({ wheelStyle: st.id })}
                    />
                    <span className="orbit-radio-label">{st.name}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* OPACITY & EFFECTS */}
        <div className="orbit-card">
          <div className="orbit-card-title-bar">
            <Eye size={18} />
            <h3>Visual Effects & Transparency</h3>
          </div>

          <div className="orbit-card-body">
            {/* OPACITY SLIDER */}
            <div className="orbit-slider-field">
              <div className="orbit-slider-header">
                <label>Background Opacity</label>
                <span className="orbit-slider-value">
                  {Math.round(config.opacity * 100)}%
                </span>
              </div>
              <input
                type="range"
                min={0.4}
                max={1.0}
                step={0.02}
                className="orbit-range"
                value={config.opacity}
                onChange={(e) => onChange({ opacity: Number(e.target.value) })}
              />
            </div>

            {/* BORDER TOGGLE */}
            <div className="orbit-toggle-list">
              <div className="orbit-toggle-row">
                <span className="orbit-row-title">Outer Ring Border</span>
                <label className="orbit-switch orbit-switch-sm">
                  <input
                    type="checkbox"
                    checked={config.border}
                    onChange={(e) => onChange({ border: e.target.checked })}
                  />
                  <span className="orbit-slider" />
                </label>
              </div>

              {/* BACKDROP BLUR TOGGLE */}
              <div className="orbit-toggle-row">
                <span className="orbit-row-title">Backdrop Glass Blur</span>
                <label className="orbit-switch orbit-switch-sm">
                  <input
                    type="checkbox"
                    checked={config.blur}
                    onChange={(e) => onChange({ blur: e.target.checked })}
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
