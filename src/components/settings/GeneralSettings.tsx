import React from "react";
import { Sliders, Keyboard, Power, Info } from "lucide-react";
import { type AppConfig } from "../../types/types";

interface GeneralSettingsProps {
  config: AppConfig;
  onChange: (updated: Partial<AppConfig>) => void;
}

export const GeneralSettings: React.FC<GeneralSettingsProps> = ({
  config,
  onChange,
}) => {
  return (
    <div className="orbit-section-panel">
      <div className="orbit-section-header">
        <div>
          <h2>General Settings</h2>
          <p>Configure how Orbit behaves on your system.</p>
        </div>
      </div>

      <div className="orbit-card-grid">
        {/* ENABLE ORBIT TOGGLE */}
        <div className="orbit-setting-card">
          <div className="orbit-card-left">
            <div className="orbit-card-icon">
              <Power size={18} />
            </div>
            <div className="orbit-card-content">
              <h4>Enable Orbit</h4>
              <p>Turn radial launcher on or off globally.</p>
            </div>
          </div>
          <label className="orbit-switch">
            <input
              type="checkbox"
              checked={config.enabled}
              onChange={(e) => onChange({ enabled: e.target.checked })}
            />
            <span className="orbit-slider" />
          </label>
        </div>

        {/* TRIGGER SETTING */}
        <div className="orbit-setting-card">
          <div className="orbit-card-left">
            <div className="orbit-card-icon">
              <Keyboard size={18} />
            </div>
            <div className="orbit-card-content">
              <h4>Global Trigger Shortcut</h4>
              <p>Shortcut key combination used to activate Orbit radial wheel.</p>
            </div>
          </div>
          <div className="orbit-shortcut-badge">
            <kbd>Ctrl</kbd> + <kbd>Space</kbd>
          </div>
        </div>

        {/* START WITH OS */}
        <div className="orbit-setting-card">
          <div className="orbit-card-left">
            <div className="orbit-card-icon">
              <Sliders size={18} />
            </div>
            <div className="orbit-card-content">
              <h4>Start on System Startup</h4>
              <p>Automatically launch Orbit when your computer boots up.</p>
            </div>
          </div>
          <label className="orbit-switch">
            <input
              type="checkbox"
              checked={config.startWithOs}
              onChange={(e) => onChange({ startWithOs: e.target.checked })}
            />
            <span className="orbit-slider" />
          </label>
        </div>

        {/* LAUNCH SETTINGS ON STARTUP */}
        <div className="orbit-setting-card">
          <div className="orbit-card-left">
            <div className="orbit-card-icon">
              <Info size={18} />
            </div>
            <div className="orbit-card-content">
              <h4>Show Settings Window on Startup</h4>
              <p>Open this settings window when Orbit launches in background.</p>
            </div>
          </div>
          <label className="orbit-switch">
            <input
              type="checkbox"
              checked={config.launchSettingsOnStartup}
              onChange={(e) =>
                onChange({ launchSettingsOnStartup: e.target.checked })
              }
            />
            <span className="orbit-slider" />
          </label>
        </div>

        {/* TRAY INFO BOX */}
        <div className="orbit-info-card">
          <Info size={18} className="orbit-info-icon" />
          <div>
            <h5>System Tray Utility</h5>
            <p>
              Orbit runs quietly in your system tray. Click the tray icon at any time to re-open this Settings application or quickly enable/disable Orbit.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
