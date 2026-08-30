import React, { useState } from "react";
import {
  Download,
  Upload,
  RotateCcw,
  Copy,
  Check,
  Code,
  AlertTriangle,
  FolderOpen,
} from "lucide-react";
import { ConfirmDialog } from "./ConfirmDialog";
import { type AppConfig } from "../../types/types";

interface AdvancedSettingsProps {
  config: AppConfig;
  onExport: () => void;
  onImport: (importedConfig: AppConfig) => void;
  onReset: () => void;
}

export const AdvancedSettings: React.FC<AdvancedSettingsProps> = ({
  config,
  onExport,
  onImport,
  onReset,
}) => {
  const [copiedPath, setCopiedPath] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [showDebugJson, setShowDebugJson] = useState(false);

  const handleCopyPath = () => {
    if (config.configPath) {
      navigator.clipboard.writeText(config.configPath);
      setCopiedPath(true);
      setTimeout(() => setCopiedPath(false), 2000);
    }
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImportError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);

        // Validate basic configuration fields
        if (
          typeof parsed !== "object" ||
          parsed === null ||
          typeof parsed.enabled !== "boolean" ||
          !Array.isArray(parsed.items)
        ) {
          throw new Error("Invalid Orbit configuration file format.");
        }

        onImport(parsed as AppConfig);
      } catch (err: any) {
        setImportError(err.message || "Failed to parse imported JSON file.");
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="orbit-section-panel">
      <div className="orbit-section-header">
        <div>
          <h2>Advanced Configuration</h2>
          <p>Export, import, inspect, or reset your Orbit configuration.</p>
        </div>
      </div>

      <div className="orbit-card-grid">
        {/* CONFIG FILE LOCATION */}
        <div className="orbit-setting-card">
          <div className="orbit-card-left">
            <div className="orbit-card-icon">
              <FolderOpen size={18} />
            </div>
            <div className="orbit-card-content">
              <h4>Configuration Location</h4>
              <p className="orbit-code-path">{config.configPath || "orbit.json"}</p>
            </div>
          </div>
          <button
            type="button"
            className="orbit-btn orbit-btn-secondary orbit-btn-sm"
            onClick={handleCopyPath}
          >
            {copiedPath ? <Check size={14} /> : <Copy size={14} />}
            {copiedPath ? "Copied!" : "Copy Path"}
          </button>
        </div>

        {/* EXPORT & IMPORT */}
        <div className="orbit-setting-card">
          <div className="orbit-card-left">
            <div className="orbit-card-icon">
              <Download size={18} />
            </div>
            <div className="orbit-card-content">
              <h4>Backup & Restore Configuration</h4>
              <p>Export your wheel layout to JSON or import from a backup.</p>
            </div>
          </div>
          <div className="orbit-btn-group">
            <button
              type="button"
              className="orbit-btn orbit-btn-secondary orbit-btn-sm"
              onClick={onExport}
            >
              <Download size={14} /> Export JSON
            </button>
            <label className="orbit-btn orbit-btn-secondary orbit-btn-sm orbit-btn-file">
              <Upload size={14} /> Import JSON
              <input
                type="file"
                accept=".json"
                onChange={handleFileImport}
                style={{ display: "none" }}
              />
            </label>
          </div>
        </div>

        {importError && (
          <div className="orbit-error-banner">
            <AlertTriangle size={16} />
            <span>{importError}</span>
          </div>
        )}

        {/* DEBUG RAW JSON */}
        <div className="orbit-setting-card">
          <div className="orbit-card-left">
            <div className="orbit-card-icon">
              <Code size={18} />
            </div>
            <div className="orbit-card-content">
              <h4>Debug Information</h4>
              <p>Inspect current raw JSON configuration data.</p>
            </div>
          </div>
          <button
            type="button"
            className="orbit-btn orbit-btn-secondary orbit-btn-sm"
            onClick={() => setShowDebugJson(!showDebugJson)}
          >
            {showDebugJson ? "Hide JSON" : "View JSON"}
          </button>
        </div>

        {showDebugJson && (
          <div className="orbit-json-preview-card">
            <pre>{JSON.stringify(config, null, 2)}</pre>
          </div>
        )}

        {/* DANGER ZONE - RESET CONFIG */}
        <div className="orbit-setting-card orbit-danger-card">
          <div className="orbit-card-left">
            <div className="orbit-card-icon orbit-danger-icon">
              <RotateCcw size={18} />
            </div>
            <div className="orbit-card-content">
              <h4>Reset Orbit Settings</h4>
              <p>Restore default wheel configuration and clear custom actions.</p>
            </div>
          </div>
          <button
            type="button"
            className="orbit-btn orbit-btn-danger"
            onClick={() => setIsResetModalOpen(true)}
          >
            <RotateCcw size={14} /> Reset Settings
          </button>
        </div>
      </div>

      {/* CONFIRM RESET MODAL */}
      <ConfirmDialog
        isOpen={isResetModalOpen}
        title="Reset Orbit Settings?"
        message="Are you sure you want to reset all Orbit settings? This will restore default actions and wheel preferences."
        confirmLabel="Reset Everything"
        onConfirm={() => {
          setIsResetModalOpen(false);
          onReset();
        }}
        onCancel={() => setIsResetModalOpen(false)}
      />
    </div>
  );
};
