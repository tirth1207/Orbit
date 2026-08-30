import React, { useEffect, useCallback } from "react";
import { Save, RefreshCw, CheckCircle2, AlertCircle } from "lucide-react";
import { SettingsSidebar, type SettingsTab } from "./SettingsSidebar";
import { type AppConfig } from "../../types/types";

interface SettingsLayoutProps {
  activeTab: SettingsTab;
  onSelectTab: (tab: SettingsTab) => void;
  config: AppConfig;
  hasUnsavedChanges: boolean;
  isSaving: boolean;
  saveStatusMessage: string | null;
  saveErrorMessage: string | null;
  onSave: () => void;
  onDiscard: () => void;
  children: React.ReactNode;
}

export const SettingsLayout: React.FC<SettingsLayoutProps> = ({
  activeTab,
  onSelectTab,
  config,
  hasUnsavedChanges,
  isSaving,
  saveStatusMessage,
  saveErrorMessage,
  onSave,
  onDiscard,
  children,
}) => {
  // Count root actions and nested child actions
  const rootActionCount = config.items.length;
  const nestedActionCount = config.items.reduce(
    (acc, item) => acc + (item.children?.length ?? 0),
    0
  );

  // Global Ctrl+S shortcut listener
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (hasUnsavedChanges && !isSaving) {
          onSave();
        }
      }
    },
    [hasUnsavedChanges, isSaving, onSave]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className="orbit-settings-app">
      {/* SIDEBAR */}
      <SettingsSidebar
        activeTab={activeTab}
        onSelectTab={onSelectTab}
        rootActionCount={rootActionCount}
        nestedActionCount={nestedActionCount}
      />

      {/* MAIN CONTENT WRAPPER */}
      <div className="orbit-settings-main">
        {/* HEADER BAR */}
        <header className="orbit-settings-header">
          <div className="orbit-header-left">
            <span
              className={`orbit-status-pill ${
                config.enabled ? "is-enabled" : "is-disabled"
              }`}
            >
              <span className="orbit-status-dot" />
              {config.enabled ? "Orbit Active" : "Disabled"}
            </span>

            {hasUnsavedChanges && (
              <span className="orbit-unsaved-badge">
                ● Unsaved Changes
              </span>
            )}
          </div>

          <div className="orbit-header-right">
            {saveStatusMessage && (
              <span className="orbit-toast-message is-success">
                <CheckCircle2 size={14} /> {saveStatusMessage}
              </span>
            )}

            {saveErrorMessage && (
              <span className="orbit-toast-message is-error">
                <AlertCircle size={14} /> {saveErrorMessage}
              </span>
            )}

            {hasUnsavedChanges && (
              <div className="orbit-save-actions">
                <button
                  type="button"
                  className="orbit-btn orbit-btn-ghost orbit-btn-sm"
                  onClick={onDiscard}
                  disabled={isSaving}
                >
                  <RefreshCw size={13} /> Discard
                </button>

                <button
                  type="button"
                  className="orbit-btn orbit-btn-primary orbit-btn-sm"
                  onClick={onSave}
                  disabled={isSaving}
                >
                  <Save size={13} /> {isSaving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            )}
          </div>
        </header>

        {/* CONTENT SECTION */}
        <main className="orbit-settings-content">{children}</main>
      </div>
    </div>
  );
};



