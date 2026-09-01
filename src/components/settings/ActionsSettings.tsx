import React, { useState } from "react";
import {
  Plus,
  Search,
  GripVertical,
  Edit3,
  Copy,
  Trash2,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Globe,
  Code,
  Terminal,
  Folder,
  File,
  Layers,
  Keyboard,
} from "lucide-react";

import { ActionEditor } from "./ActionEditor";
import { ConfirmDialog } from "./ConfirmDialog";
import { type Action } from "../../types/types";

interface PageConfig {
  id: string;
  name: string;
  enabled: boolean;
  items: Action[];
}

interface ActionsSettingsProps {
  items: Action[];
  pages?: PageConfig[];
  pageName?: string;
  pageOptions?: Array<{ id: string; name: string }>;
  selectedPageId?: string | null;
  onSelectPage?: (pageId: string) => void;
  onChange: (items: Action[]) => void;
  onOpenNestedEditor: (action: Action) => void;
  onAddPage?: (name: string, enabled: boolean) => void;
  onUpdatePage?: (pageId: string, updates: Partial<{ name: string; enabled: boolean }>) => void;
  onDuplicatePage?: (pageId: string) => void;
  onDeletePage?: (pageId: string) => void;
  onMovePage?: (pageId: string, direction: "up" | "down") => void;
}

export const ActionsSettings: React.FC<ActionsSettingsProps> = ({
  items,
  pages = [],
  pageName,
  pageOptions,
  selectedPageId,
  onSelectPage,
  onChange,
  onOpenNestedEditor,
  onAddPage,
  onUpdatePage,
  onDuplicatePage,
  onDeletePage,
  onMovePage,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [editingAction, setEditingAction] = useState<Action | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [deletingActionId, setDeletingActionId] = useState<string | null>(null);
  const [isAddingPage, setIsAddingPage] = useState(false);
  const [newPageName, setNewPageName] = useState("");
  const [newPageEnabled, setNewPageEnabled] = useState(true);

  const filteredItems = items.filter(
    (item) =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.target.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleToggleEnabled = (id: string) => {
    const updated = items.map((item) =>
      item.id === id ? { ...item, enabled: !item.enabled } : item
    );
    onChange(updated);
  };

  const handleMove = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= items.length) return;

    const newItems = [...items];
    const [moved] = newItems.splice(index, 1);
    newItems.splice(targetIndex, 0, moved);
    onChange(newItems);
  };

  const handleDuplicate = (item: Action) => {
    const newItem: Action = {
      ...item,
      id: `action-${Date.now()}`,
      name: `${item.name} (Copy)`,
      children: item.children ? JSON.parse(JSON.stringify(item.children)) : undefined,
    };
    onChange([...items, newItem]);
  };

  const handleConfirmDelete = () => {
    if (!deletingActionId) return;
    const updated = items.filter((item) => item.id !== deletingActionId);
    onChange(updated);
    setDeletingActionId(null);
  };

  const handleSaveAction = (savedAction: Action) => {
    const existingIndex = items.findIndex((i) => i.id === savedAction.id);
    if (existingIndex >= 0) {
      const updated = [...items];
      updated[existingIndex] = savedAction;
      onChange(updated);
    } else {
      onChange([...items, savedAction]);
    }
    setIsEditorOpen(false);
    setEditingAction(null);
  };

  const getActionTypeIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case "url":
        return <Globe size={15} />;
      case "application":
        return <Code size={15} />;
      case "command":
        return <Terminal size={15} />;
      case "folder":
        return <Folder size={15} />;
      case "file":
        return <File size={15} />;
      case "menu":
        return <Layers size={15} />;
      case "shortcut":
        return <Keyboard size={15} />;
      default:
        return <Code size={15} />;
    }
  };

  const selectedPage = pages.find((page) => page.id === selectedPageId) ?? pages[0];

  const handleCreatePage = () => {
    const trimmedName = newPageName.trim();
    if (!trimmedName || !onAddPage) return;
    onAddPage(trimmedName, newPageEnabled);
    setNewPageName("");
    setNewPageEnabled(true);
    setIsAddingPage(false);
  };

  return (
    <div className="orbit-section-panel">
      <div className="orbit-section-header">
        <div>
          <h2>Pages & Actions</h2>
          <p>Manage the pages in the wheel, then configure each page's actions.</p>
        </div>

        <div className="orbit-header-controls">
          {pageOptions && pageOptions.length > 1 && onSelectPage && (
            <select
              className="orbit-select"
              value={selectedPageId ?? pageOptions[0]?.id ?? ""}
              onChange={(event) => onSelectPage(event.target.value)}
              aria-label="Select wheel page"
            >
              {pageOptions.map((page) => (
                <option key={page.id} value={page.id}>
                  {page.name}
                </option>
              ))}
            </select>
          )}

          <button
            type="button"
            className="orbit-btn orbit-btn-primary"
            onClick={() => {
              setEditingAction(null);
              setIsEditorOpen(true);
            }}
          >
            <Plus size={15} /> Add Action
          </button>
        </div>
      </div>

      {pageName && (
        <div className="orbit-parent-selector-card" style={{ display: "grid", gap: 10 }}>
          <label htmlFor="page-action-select">Editing page:</label>
          <div className="orbit-select-readout" id="page-action-select">
            {pageName}
          </div>
          <div className="orbit-input-row" style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              className="orbit-input"
              value={selectedPage?.name ?? pageName}
              onChange={(event) =>
                selectedPage && onUpdatePage?.(selectedPage.id, { name: event.target.value })
              }
              aria-label="Page name"
            />
            <label className="orbit-switch orbit-switch-sm" title="Enable/Disable page">
              <input
                type="checkbox"
                checked={selectedPage?.enabled ?? true}
                onChange={() =>
                  selectedPage && onUpdatePage?.(selectedPage.id, { enabled: !selectedPage.enabled })
                }
              />
              <span className="orbit-slider" />
            </label>
          </div>
        </div>
      )}

      <div className="orbit-parent-selector-card" style={{ marginTop: 12 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <div>
            <strong>Pages</strong>
          </div>
          <button type="button" className="orbit-btn orbit-btn-secondary orbit-btn-sm" onClick={() => setIsAddingPage((v) => !v)}>
            <Plus size={14} /> {isAddingPage ? "Close" : "Add Page"}
          </button>
        </div>

        {isAddingPage && (
          <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
            <input
              className="orbit-input"
              placeholder="Page name"
              value={newPageName}
              onChange={(event) => setNewPageName(event.target.value)}
            />
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
              <span>Enabled</span>
              <label className="orbit-switch orbit-switch-sm">
                <input type="checkbox" checked={newPageEnabled} onChange={() => setNewPageEnabled((v) => !v)} />
                <span className="orbit-slider" />
              </label>
            </div>
            <button type="button" className="orbit-btn orbit-btn-primary orbit-btn-sm" onClick={handleCreatePage} disabled={!newPageName.trim()}>
              Create Page
            </button>
          </div>
        )}

        {pages.length > 0 && (
          <div style={{ display: "grid", gap: 6, marginTop: 12 }}>
            {pages.map((page, index) => (
              <div
                key={page.id}
                className={`orbit-action-item ${selectedPageId === page.id ? "is-selected" : ""} ${!page.enabled ? "is-disabled" : ""}`}
                style={{ padding: "8px 10px" }}
              >
                <div className="orbit-action-reorder" style={{ minWidth: 68 }}>
                  <button type="button" className="orbit-btn-icon-subtle" onClick={() => onMovePage?.(page.id, "up")} disabled={index === 0} title="Move page up">
                    <ChevronUp size={13} />
                  </button>
                  <GripVertical size={14} className="orbit-drag-handle" />
                  <button type="button" className="orbit-btn-icon-subtle" onClick={() => onMovePage?.(page.id, "down")} disabled={index === pages.length - 1} title="Move page down">
                    <ChevronDown size={13} />
                  </button>
                </div>

                <div className="orbit-action-main" style={{ flex: 1 }}>
                  <button
                    type="button"
                    className="orbit-btn orbit-btn-ghost orbit-btn-sm"
                    onClick={() => onSelectPage?.(page.id)}
                    style={{ justifyContent: "flex-start", width: "100%" }}
                  >
                    {page.name}
                  </button>
                </div>

                <div className="orbit-action-controls">
                  <label className="orbit-switch orbit-switch-sm" title="Enable/Disable page">
                    <input
                      type="checkbox"
                      checked={page.enabled}
                      onChange={() => onUpdatePage?.(page.id, { enabled: !page.enabled })}
                    />
                    <span className="orbit-slider" />
                  </label>
                  <button type="button" className="orbit-btn orbit-btn-ghost orbit-btn-icon orbit-btn-sm" onClick={() => onDuplicatePage?.(page.id)} title="Duplicate page">
                    <Copy size={14} />
                  </button>
                  {pages.length > 1 && (
                    <button type="button" className="orbit-btn orbit-btn-ghost orbit-btn-icon orbit-btn-sm orbit-btn-danger-ghost" onClick={() => onDeletePage?.(page.id)} title="Delete page">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="orbit-actions-toolbar">
        <div className="orbit-input-with-icon orbit-search-bar">
          <Search size={14} className="orbit-input-icon" />
          <input
            type="text"
            className="orbit-input"
            placeholder="Search actions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <span className="orbit-item-count-text">
          Showing {filteredItems.length} of {items.length} items
        </span>
      </div>

      {filteredItems.length === 0 ? (
        <div className="orbit-empty-state">
          <Layers size={36} className="orbit-empty-icon" />
          <h4>No actions found</h4>
          <p>
            {searchQuery
              ? "No actions match your search query."
              : "Add applications, websites, commands, or folders to your wheel."}
          </p>
          <button
            type="button"
            className="orbit-btn orbit-btn-primary"
            onClick={() => {
              setEditingAction(null);
              setIsEditorOpen(true);
            }}
          >
            <Plus size={15} /> Add Action
          </button>
        </div>
      ) : (
        <div className="orbit-actions-list">
          {filteredItems.map((item) => {
            const hasChildren = item.children && item.children.length > 0;
            const originalIndex = items.findIndex((i) => i.id === item.id);

            return (
              <div
                key={item.id}
                className={`orbit-action-item ${!item.enabled ? "is-disabled" : ""}`}
              >
                <div className="orbit-action-reorder">
                  <button
                    type="button"
                    className="orbit-btn-icon-subtle"
                    onClick={() => handleMove(originalIndex, "up")}
                    disabled={originalIndex === 0}
                    title="Move Up"
                  >
                    <ChevronUp size={13} />
                  </button>
                  <GripVertical size={14} className="orbit-drag-handle" />
                  <button
                    type="button"
                    className="orbit-btn-icon-subtle"
                    onClick={() => handleMove(originalIndex, "down")}
                    disabled={originalIndex === items.length - 1}
                    title="Move Down"
                  >
                    <ChevronDown size={13} />
                  </button>
                </div>

                <div className="orbit-action-main">
                  <div className="orbit-action-icon-badge">
                    {item.icon ? (
                      <span className="orbit-custom-icon">{item.icon}</span>
                    ) : (
                      getActionTypeIcon(item.type)
                    )}
                  </div>

                  <div className="orbit-action-details">
                    <div className="orbit-action-title-row">
                      <span className="orbit-action-name">{item.name}</span>
                      <span className="orbit-type-tag">{item.type}</span>
                      {hasChildren && (
                        <span className="orbit-children-tag">
                          {item.children?.length} children
                        </span>
                      )}
                    </div>
                    <span className="orbit-action-target" title={item.target}>
                      {item.target || "(No target path)"}
                    </span>
                  </div>
                </div>

                <div className="orbit-action-controls">
                  <label className="orbit-switch orbit-switch-sm" title="Enable/Disable action">
                    <input
                      type="checkbox"
                      checked={item.enabled}
                      onChange={() => handleToggleEnabled(item.id)}
                    />
                    <span className="orbit-slider" />
                  </label>

                  {(item.type === "menu" || hasChildren) && (
                    <button
                      type="button"
                      className="orbit-btn orbit-btn-secondary orbit-btn-sm"
                      onClick={() => onOpenNestedEditor(item)}
                      title="Manage Child Actions"
                    >
                      Children ({item.children?.length ?? 0}) <ChevronRight size={13} />
                    </button>
                  )}

                  <button
                    type="button"
                    className="orbit-btn orbit-btn-ghost orbit-btn-icon orbit-btn-sm"
                    onClick={() => {
                      setEditingAction(item);
                      setIsEditorOpen(true);
                    }}
                    title="Edit action"
                  >
                    <Edit3 size={14} />
                  </button>

                  <button
                    type="button"
                    className="orbit-btn orbit-btn-ghost orbit-btn-icon orbit-btn-sm"
                    onClick={() => handleDuplicate(item)}
                    title="Duplicate action"
                  >
                    <Copy size={14} />
                  </button>

                  <button
                    type="button"
                    className="orbit-btn orbit-btn-ghost orbit-btn-icon orbit-btn-sm orbit-btn-danger-ghost"
                    onClick={() => setDeletingActionId(item.id)}
                    title="Delete action"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ActionEditor
        action={editingAction}
        isOpen={isEditorOpen}
        onSave={handleSaveAction}
        onClose={() => {
          setIsEditorOpen(false);
          setEditingAction(null);
        }}
        onOpenNestedEditor={(act) => {
          setIsEditorOpen(false);
          onOpenNestedEditor(act);
        }}
      />

      <ConfirmDialog
        isOpen={Boolean(deletingActionId)}
        title="Delete Action?"
        message="Are you sure you want to remove this action from your radial wheel?"
        confirmLabel="Delete Action"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeletingActionId(null)}
      />
    </div>
  );
};



