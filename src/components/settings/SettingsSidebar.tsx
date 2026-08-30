import React from "react";
import {
  Sliders,
  Compass,
  Zap,
  FolderTree,
  Palette,
  ShieldAlert,
} from "lucide-react";

export type SettingsTab =
  | "general"
  | "wheel"
  | "actions"
  | "nested"
  | "appearance"
  | "advanced";

interface SettingsSidebarProps {
  activeTab: SettingsTab;
  onSelectTab: (tab: SettingsTab) => void;
  rootActionCount: number;
  nestedActionCount: number;
}

export const SettingsSidebar: React.FC<SettingsSidebarProps> = ({
  activeTab,
  onSelectTab,
  rootActionCount,
  nestedActionCount,
}) => {
  const tabs: {
    id: SettingsTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number | string;
  }[] = [
    { id: "general", label: "General", icon: Sliders },
    { id: "wheel", label: "Wheel", icon: Compass },
    { id: "actions", label: "Actions", icon: Zap, badge: rootActionCount },
    { id: "nested", label: "Nested Menus", icon: FolderTree, badge: nestedActionCount },
    { id: "appearance", label: "Appearance", icon: Palette },
    { id: "advanced", label: "Advanced", icon: ShieldAlert },
  ];

  return (
    <aside className="orbit-settings-sidebar">
      <div className="orbit-sidebar-header">
        <div className="orbit-app-brand">
          <div className="orbit-brand-logo">
            <span className="orbit-ring-icon">✦</span>
          </div>
          <div className="orbit-brand-info">
            <span className="orbit-brand-title">Orbit</span>
            <span className="orbit-brand-subtitle">v0.1.0 • Settings</span>
          </div>
        </div>
      </div>

      <nav className="orbit-sidebar-nav" aria-label="Settings navigation">
        <div className="orbit-nav-group-title">Configuration</div>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              className={`orbit-sidebar-item ${isActive ? "is-active" : ""}`}
              onClick={() => onSelectTab(tab.id)}
            >
              <Icon className="orbit-nav-icon" />
              <span className="orbit-nav-label">{tab.label}</span>
              {tab.badge !== undefined && tab.badge !== 0 && (
                <span className="orbit-nav-badge">{tab.badge}</span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="orbit-sidebar-footer">
        <div className="orbit-footer-tip">
          <kbd>Ctrl</kbd> + <kbd>Space</kbd> to trigger wheel
        </div>
      </div>
    </aside>
  );
};
