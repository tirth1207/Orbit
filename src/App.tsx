import { useState, useEffect, useCallback, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

import "./App.css";
import { SettingsLayout } from "./components/settings/SettingsLayout";
import { type SettingsTab } from "./components/settings/SettingsSidebar";
import { GeneralSettings } from "./components/settings/GeneralSettings";
import { WheelSettings } from "./components/settings/WheelSettings";
import { ActionsSettings } from "./components/settings/ActionsSettings";
import { NestedActionsEditor } from "./components/settings/NestedActionsEditor";
import { AppearanceSettings } from "./components/settings/AppearanceSettings";
import { AdvancedSettings } from "./components/settings/AdvancedSettings";
import { LiveWheelPreview } from "./components/settings/LiveWheelPreview";
import { type AppConfig, type Action } from "./types/types";

const DEFAULT_CONFIG: AppConfig = {
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
  items: [
    { id: "browser", name: "Browser", type: "url", target: "https://google.com", enabled: true },
    { id: "vscode", name: "VS Code", type: "app", target: "code", enabled: true },
    { id: "terminal", name: "Terminal", type: "command", target: "bash", enabled: true },
    {
      id: "ai", name: "AI", type: "menu", target: "", enabled: true,
      children: [
        { id: "chatgpt", name: "ChatGPT", type: "url", target: "https://chat.openai.com", enabled: true },
        { id: "claude", name: "Claude", type: "url", target: "https://claude.ai", enabled: true },
        { id: "gemini", name: "Gemini", type: "url", target: "https://gemini.google.com", enabled: true },
        { id: "perplexity", name: "Perplexity", type: "url", target: "https://perplexity.ai", enabled: true },
      ],
    },
  ],
  theme: "system",
};

function App() {
  const [activeTab, setActiveTab] = useState<SettingsTab>("general");
  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG);
  const [dirtyConfig, setDirtyConfig] = useState<AppConfig>(DEFAULT_CONFIG);

  const [activeParentId, setActiveParentId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatusMessage, setSaveStatusMessage] = useState<string | null>(null);
  const [saveErrorMessage, setSaveErrorMessage] = useState<string | null>(null);

  // Track dirty state via Ref so event listeners registered once don't re-trigger unnecessarily
  const hasUnsavedChanges = JSON.stringify(config) !== JSON.stringify(dirtyConfig);
  const hasUnsavedChangesRef = useRef(hasUnsavedChanges);
  hasUnsavedChangesRef.current = hasUnsavedChanges;

  // ==================================================
  // LOAD CONFIGURATION
  // ==================================================

  const loadConfig = useCallback(async () => {
    try {
      console.log("[Orbit] Loading configuration...");
      const loaded = await invoke<AppConfig>("load_configuration");
      console.log("[Orbit] Configuration loaded successfully:", loaded);
      setConfig(loaded);
      setDirtyConfig(loaded);
    } catch (error) {
      console.error("[Orbit] Failed to load configuration:", error);
    }
  }, []);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  // ==================================================
  // TAURI EVENT LISTENERS (REGISTERED ONCE)
  // ==================================================

  useEffect(() => {
    let unlistenConfig: (() => void) | undefined;
    let unlistenEnabled: (() => void) | undefined;

    const setupListeners = async () => {
      try {
        unlistenConfig = await listen<AppConfig>("orbit-config-changed", (event) => {
          console.log("[Orbit App] Configuration updated live:", event.payload);
          setConfig(event.payload);
          if (!hasUnsavedChangesRef.current) {
            setDirtyConfig(event.payload);
          }
        });

        unlistenEnabled = await listen<boolean>("tray-enabled-changed", (event) => {
          setConfig((prev) => ({ ...prev, enabled: event.payload }));
          setDirtyConfig((prev) => ({ ...prev, enabled: event.payload }));
        });
      } catch (error) {
        console.error("[Orbit App] Listener setup failed:", error);
      }
    };

    setupListeners();

    return () => {
      unlistenConfig?.();
      unlistenEnabled?.();
    };
  }, []);

  // ==================================================
  // SAVE CONFIGURATION
  // ==================================================

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    setSaveErrorMessage(null);
    setSaveStatusMessage(null);

    try {
      console.log("[Orbit] Saving configuration...", dirtyConfig);
      const saved = await invoke<AppConfig>("save_configuration", {
        config: dirtyConfig,
      });

      setConfig(saved);
      setDirtyConfig(saved);
      setSaveStatusMessage("Settings saved!");

      setTimeout(() => setSaveStatusMessage(null), 3000);
    } catch (error: any) {
      console.error("[Orbit] Failed to save configuration:", error);
      setSaveErrorMessage(error?.toString() || "Failed to save settings.");
      setTimeout(() => setSaveErrorMessage(null), 4000);
    } finally {
      setIsSaving(false);
    }
  }, [dirtyConfig]);

  // ==================================================
  // DISCARD CHANGES
  // ==================================================

  const handleDiscard = useCallback(() => {
    setDirtyConfig(config);
    setSaveStatusMessage("Changes discarded.");
    setTimeout(() => setSaveStatusMessage(null), 2500);
  }, [config]);

  // ==================================================
  // RESET CONFIGURATION
  // ==================================================

  const handleReset = useCallback(async () => {
    try {
      console.log("[Orbit] Resetting configuration...");
      const resetConfig = await invoke<AppConfig>("reset_configuration");
      setConfig(resetConfig);
      setDirtyConfig(resetConfig);
      setSaveStatusMessage("Settings reset to defaults.");
      setTimeout(() => setSaveStatusMessage(null), 3000);
    } catch (error: any) {
      console.error("[Orbit] Reset failed:", error);
      setSaveErrorMessage("Failed to reset settings.");
      setTimeout(() => setSaveErrorMessage(null), 4000);
    }
  }, []);

  // ==================================================
  // EXPORT CONFIGURATION
  // ==================================================

  const handleExport = useCallback(() => {
    const jsonString = JSON.stringify(dirtyConfig, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "orbit-config.json";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setSaveStatusMessage("Exported orbit-config.json");
    setTimeout(() => setSaveStatusMessage(null), 3000);
  }, [dirtyConfig]);

  // ==================================================
  // IMPORT CONFIGURATION
  // ==================================================

  const handleImport = useCallback((imported: AppConfig) => {
    setDirtyConfig(imported);
    setSaveStatusMessage("Imported configuration loaded. Click Save to apply.");
    setTimeout(() => setSaveStatusMessage(null), 4000);
  }, []);

  // ==================================================
  // UPDATE PARTIAL DIRTY CONFIG
  // ==================================================

  const updateDirtyConfig = (partial: Partial<AppConfig>) => {
    setDirtyConfig((prev) => ({ ...prev, ...partial }));
  };

  // ==================================================
  // UPDATE ACTIONS / NESTED CHILDREN
  // ==================================================

  const handleUpdateActions = (items: Action[]) => {
    setDirtyConfig((prev) => ({ ...prev, items }));
  };

  const handleUpdateParentChildren = (parentId: string, children: Action[]) => {
    setDirtyConfig((prev) => ({
      ...prev,
      items: prev.items.map((item) =>
        item.id === parentId ? { ...item, children } : item
      ),
    }));
  };

  const handleOpenNestedEditor = (action: Action) => {
    setActiveParentId(action.id);
    setActiveTab("nested");
  };

  // Determine if live preview should be displayed alongside settings
  const showLivePreview =
    activeTab === "wheel" || activeTab === "appearance" || activeTab === "actions";

  return (
    <SettingsLayout
      activeTab={activeTab}
      onSelectTab={setActiveTab}
      config={dirtyConfig}
      hasUnsavedChanges={hasUnsavedChanges}
      isSaving={isSaving}
      saveStatusMessage={saveStatusMessage}
      saveErrorMessage={saveErrorMessage}
      onSave={handleSave}
      onDiscard={handleDiscard}
    >
      <div className={`orbit-tab-view ${showLivePreview ? "has-preview" : ""}`}>
        <div className="orbit-tab-content-panel">
          {activeTab === "general" && (
            <GeneralSettings
              config={dirtyConfig}
              onChange={updateDirtyConfig}
            />
          )}

          {activeTab === "wheel" && (
            <WheelSettings
              config={dirtyConfig}
              onChange={updateDirtyConfig}
            />
          )}

          {activeTab === "actions" && (
            <ActionsSettings
              items={dirtyConfig.items}
              onChange={handleUpdateActions}
              onOpenNestedEditor={handleOpenNestedEditor}
            />
          )}

          {activeTab === "nested" && (
            <NestedActionsEditor
              rootItems={dirtyConfig.items}
              activeParentId={activeParentId}
              onSelectParent={setActiveParentId}
              onUpdateParentChildren={handleUpdateParentChildren}
              onBackToRoot={() => setActiveTab("actions")}
            />
          )}

          {activeTab === "appearance" && (
            <AppearanceSettings
              config={dirtyConfig}
              onChange={updateDirtyConfig}
            />
          )}

          {activeTab === "advanced" && (
            <AdvancedSettings
              config={dirtyConfig}
              onExport={handleExport}
              onImport={handleImport}
              onReset={handleReset}
            />
          )}
        </div>

        {/* LIVE PREVIEW SIDE PANEL */}
        {showLivePreview && (
          <div className="orbit-preview-side-panel">
            <LiveWheelPreview config={dirtyConfig} />
          </div>
        )}
      </div>
    </SettingsLayout>
  );
}

export default App;
