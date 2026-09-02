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
import { type AppConfig, type Action, migrateAppConfig } from "./types/types";

const DEFAULT_CONFIG: AppConfig = migrateAppConfig({
  version: 2,
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
  theme: "system",
  pages: [{
    id: "music",
    name: "Music",
    icon: "music-2",
    type: "music",
    enabled: true,
    items: [
      { id: "music-play", name: "Play", type: "media", target: "playpause", icon: "play", enabled: true },
      { id: "music-next", name: "Next", type: "media", target: "next", icon: "skip-forward", enabled: true },
      { id: "music-repeat", name: "Repeat", type: "media", target: "repeat", icon: "repeat", enabled: true },
      { id: "music-shuffle", name: "Shuffle", type: "media", target: "shuffle", icon: "shuffle", enabled: true },
      { id: "music-previous", name: "Previous", type: "media", target: "previous", icon: "skip-back", enabled: true },
    ],
  }, {
    id: "applications",
    name: "Applications",
    icon: "grid-3x3",
    type: "launcher",
    enabled: true,
    items: [
      { id: "browser", name: "Browser", type: "url", target: "https://google.com", enabled: true },
      { id: "vscode", name: "VS Code", type: "application", target: "code", enabled: true },
      { id: "terminal", name: "Terminal", type: "command", target: "bash", enabled: true },
      {
        id: "ai",
        name: "AI",
        type: "menu",
        target: "",
        enabled: true,
        children: [
          { id: "chatgpt", name: "ChatGPT", type: "url", target: "https://chat.openai.com", enabled: true },
          { id: "claude", name: "Claude", type: "url", target: "https://claude.ai", enabled: true },
          { id: "gemini", name: "Gemini", type: "url", target: "https://gemini.google.com", enabled: true },
          { id: "perplexity", name: "Perplexity", type: "url", target: "https://perplexity.ai", enabled: true },
        ],
      },
    ],
  }],
  defaultPageId: "music",
});

function App() {
  const [activeTab, setActiveTab] = useState<SettingsTab>("general");
  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG);
  const [dirtyConfig, setDirtyConfig] = useState<AppConfig>(DEFAULT_CONFIG);
  const [selectedPageId, setSelectedPageId] = useState<string | null>(
    DEFAULT_CONFIG.defaultPageId ?? DEFAULT_CONFIG.pages[0]?.id ?? null
  );

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
      const migrated = migrateAppConfig(loaded);
      console.log("[Orbit] Configuration loaded successfully:", migrated);
      setConfig(migrated);
      setDirtyConfig(migrated);
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

  const activePage =
    dirtyConfig.pages.find((page) => page.id === selectedPageId) ??
    dirtyConfig.pages[0] ??
    null;

  useEffect(() => {
    if (!dirtyConfig.pages.length) return;
    if (!selectedPageId || !dirtyConfig.pages.some((page) => page.id === selectedPageId)) {
      setSelectedPageId(dirtyConfig.pages[0].id);
    }
  }, [dirtyConfig.pages, selectedPageId]);

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
      const resetConfig = migrateAppConfig(
        await invoke<AppConfig>("reset_configuration")
      );
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

  const applyPageListUpdate = (
    updater: (pages: AppConfig["pages"]) => AppConfig["pages"]
  ) => {
    setDirtyConfig((prev) => {
      const nextPages = updater(prev.pages);
      const validDefaultPageId =
        nextPages.some((page) => page.id === prev.defaultPageId)
          ? prev.defaultPageId
          : nextPages[0]?.id ?? null;

      return {
        ...prev,
        pages: nextPages,
        items: nextPages.flatMap((page) => page.items ?? []),
        defaultPageId: validDefaultPageId ?? undefined,
      };
    });
  };

  const handleCreatePage = (name: string, enabled: boolean) => {
    const newPageId = `page-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;

    setDirtyConfig((prev) => {
      const nextPages = [
        ...prev.pages,
        {
          id: newPageId,
          name: name.trim() || `Page ${prev.pages.length + 1}`,
          icon: "grid-3x3",
          type: "custom",
          enabled,
          items: [],
        },
      ];

      return {
        ...prev,
        pages: nextPages,
        items: nextPages.flatMap((page) => page.items),
        defaultPageId: prev.defaultPageId ?? newPageId,
      };
    });

    setSelectedPageId(newPageId);
  };

  const handleUpdatePage = (
    pageId: string,
    updates: Partial<{ name: string; enabled: boolean }>
  ) => {
    setDirtyConfig((prev) => {
      const nextPages = prev.pages.map((page) =>
        page.id === pageId ? { ...page, ...updates } : page
      );

      return {
        ...prev,
        pages: nextPages,
        items: nextPages.flatMap((page) => page.items),
      };
    });
  };

  const handleDuplicatePage = (pageId: string) => {
    const sourcePage = dirtyConfig.pages.find((page) => page.id === pageId);
    if (!sourcePage) return;

    const duplicatedPage = {
      ...sourcePage,
      id: `page-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
      name: `${sourcePage.name} Copy`,
      items: sourcePage.items.map((item) => ({
        ...item,
        id: `${item.id}-copy-${Date.now()}`,
        children: item.children
          ? item.children.map((child) => ({
              ...child,
              id: `${child.id}-copy-${Date.now()}`,
              children: child.children ? [...child.children] : undefined,
            }))
          : undefined,
      })),
    };

    const nextPages = [...dirtyConfig.pages, duplicatedPage];
    setDirtyConfig((prev) => ({
      ...prev,
      pages: nextPages,
      items: nextPages.flatMap((page) => page.items),
      defaultPageId: prev.defaultPageId ?? duplicatedPage.id,
    }));
    setSelectedPageId(duplicatedPage.id);
  };

  const handleDeletePage = (pageId: string) => {
    if (dirtyConfig.pages.length <= 1) return;

    const filteredPages = dirtyConfig.pages.filter((page) => page.id !== pageId);
    const nextDefaultPageId =
      dirtyConfig.defaultPageId === pageId
        ? filteredPages[0]?.id ?? null
        : dirtyConfig.defaultPageId ?? filteredPages[0]?.id ?? null;

    setDirtyConfig((prev) => ({
      ...prev,
      pages: filteredPages,
      items: filteredPages.flatMap((page) => page.items),
      defaultPageId: nextDefaultPageId ?? undefined,
    }));

    setSelectedPageId(nextDefaultPageId ?? filteredPages[0]?.id ?? null);
  };

  const handleMovePage = (pageId: string, direction: "up" | "down") => {
    const currentIndex = dirtyConfig.pages.findIndex((page) => page.id === pageId);
    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= dirtyConfig.pages.length) return;

    applyPageListUpdate((pages) => {
      const nextPages = [...pages];
      const [movedPage] = nextPages.splice(currentIndex, 1);
      nextPages.splice(targetIndex, 0, movedPage);
      return nextPages;
    });
  };

  const handleUpdateActions = (items: Action[]) => {
    setDirtyConfig((prev) => {
      const targetPageId = selectedPageId ?? prev.defaultPageId ?? prev.pages[0]?.id;
      const targetPage = prev.pages.find((page) => page.id === targetPageId) ?? prev.pages[0];
      if (!targetPage) return prev;

      return {
        ...prev,
        pages: prev.pages.map((page) =>
          page.id === targetPage.id ? { ...page, items } : page
        ),
        items: prev.pages.flatMap((page) =>
          page.id === targetPage.id ? items : page.items
        ),
      };
    });
  };

  const handleUpdateParentChildren = (parentId: string, children: Action[]) => {
    setDirtyConfig((prev) => {
      const targetPageId = selectedPageId ?? prev.defaultPageId ?? prev.pages[0]?.id;
      const targetPage = prev.pages.find((page) => page.id === targetPageId) ?? prev.pages[0];
      if (!targetPage) return prev;

      const updatedPageItems = targetPage.items.map((item) =>
        item.id === parentId ? { ...item, children } : item
      );

      return {
        ...prev,
        pages: prev.pages.map((page) =>
          page.id === targetPage.id ? { ...page, items: updatedPageItems } : page
        ),
        items: prev.pages.flatMap((page) =>
          page.id === targetPage.id ? updatedPageItems : page.items
        ),
      };
    });
  };

  const handleOpenNestedEditor = (action: Action) => {
    setActiveParentId(action.id);
    setActiveTab("nested");
  };

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
      <div className="orbit-tab-view has-preview">
        {/* LIVE PREVIEW: persistent on every settings tab */}
        <div className="orbit-preview-side-panel">
          <LiveWheelPreview config={dirtyConfig} />
        </div>

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

          {activeTab === "actions" && activePage && (
            <ActionsSettings
              items={activePage.items}
              pages={dirtyConfig.pages}
              pageName={activePage.name}
              pageOptions={dirtyConfig.pages.map((page) => ({
                id: page.id,
                name: page.name,
              }))}
              selectedPageId={selectedPageId}
              onSelectPage={setSelectedPageId}
              onChange={handleUpdateActions}
              onOpenNestedEditor={handleOpenNestedEditor}
              onAddPage={handleCreatePage}
              onUpdatePage={handleUpdatePage}
              onDuplicatePage={handleDuplicatePage}
              onDeletePage={handleDeletePage}
              onMovePage={handleMovePage}
            />
          )}

          {activeTab === "nested" && activePage && (
            <NestedActionsEditor
              rootItems={activePage.items}
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

      </div>
    </SettingsLayout>
  );
}

export default App;



