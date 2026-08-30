import React, { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
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
import { validateConfig } from "../../utils/validateConfig";

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

  const handleNativeExport = async () => {
    try {
      const jsonContent = JSON.stringify(config, null, 2);
      const savedPath = await invoke<string | null>("export_configuration_native", {
        jsonContent,
      });
      if (!savedPath) {
        // Fallback to browser download if user cancelled or command unsupported
        onExport();
      }
    } catch (err) {
      console.warn("[Orbit] Native export fallback to browser download:", err);
      onExport();
    }
  };

  const handleNativeImport = async () => {
    setImportError(null);
    try {
      const content = await invoke<string | null>("import_configuration_native");
      if (!content) return; // User cancelled dialog

      const parsed = JSON.parse(content);
      const validation = validateConfig(parsed);

      if (!validation.valid || !validation.normalizedConfig) {
        setImportError(validation.error || "Invalid Orbit configuration file.");
        return;
      }

      onImport(validation.normalizedConfig);
    } catch (err: any) {
      setImportError(err.message || "Failed to import configuration file.");
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
        const validation = validateConfig(parsed);

        if (!validation.valid || !validation.normalizedConfig) {
          setImportError(validation.error || "Invalid Orbit configuration file.");
          return;
        }

        onImport(validation.normalizedConfig);
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
              onClick={handleNativeExport}
            >
              <Download size={14} /> Export JSON
            </button>

            <button
              type="button"
              className="orbit-btn orbit-btn-secondary orbit-btn-sm"
              onClick={handleNativeImport}
            >
              <Upload size={14} /> Import JSON
            </button>

            <label className="orbit-btn orbit-btn-ghost orbit-btn-sm orbit-btn-file" title="Upload JSON file">
              Browser Upload
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



