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

interface ActionsSettingsProps {
  items: Action[];
  onChange: (items: Action[]) => void;
  onOpenNestedEditor: (action: Action) => void;
}

export const ActionsSettings: React.FC<ActionsSettingsProps> = ({
  items,
  onChange,
  onOpenNestedEditor,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [editingAction, setEditingAction] = useState<Action | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [deletingActionId, setDeletingActionId] = useState<string | null>(null);

  // Filtered items
  const filteredItems = items.filter(
    (item) =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.target.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Toggle single action enabled state
  const handleToggleEnabled = (id: string) => {
    const updated = items.map((item) =>
      item.id === id ? { ...item, enabled: !item.enabled } : item
    );
    onChange(updated);
  };

  // Reorder action up or down
  const handleMove = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= items.length) return;

    const newItems = [...items];
    const [moved] = newItems.splice(index, 1);
    newItems.splice(targetIndex, 0, moved);
    onChange(newItems);
  };

  // Duplicate action
  const handleDuplicate = (item: Action) => {
    const newItem: Action = {
      ...item,
      id: `action-${Date.now()}`,
      name: `${item.name} (Copy)`,
      children: item.children ? JSON.parse(JSON.stringify(item.children)) : undefined,
    };
    onChange([...items, newItem]);
  };

  // Delete action
  const handleConfirmDelete = () => {
    if (!deletingActionId) return;
    const updated = items.filter((item) => item.id !== deletingActionId);
    onChange(updated);
    setDeletingActionId(null);
  };

  // Save edited action
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

  return (
    <div className="orbit-section-panel">
      <div className="orbit-section-header">
        <div>
          <h2>Root Wheel Actions</h2>
          <p>
            Manage actions displayed in the main radial menu. Order here matches the wheel order.
          </p>
        </div>
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

      {/* SEARCH AND BAR */}
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

      {/* ACTIONS LIST */}
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
                {/* REORDER BUTTONS */}
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

                {/* ICON & MAIN INFO */}
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

                {/* CONTROLS */}
                <div className="orbit-action-controls">
                  {/* ENABLED TOGGLE */}
                  <label className="orbit-switch orbit-switch-sm" title="Enable/Disable action">
                    <input
                      type="checkbox"
                      checked={item.enabled}
                      onChange={() => handleToggleEnabled(item.id)}
                    />
                    <span className="orbit-slider" />
                  </label>

                  {/* NESTED MENU BUTTON */}
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

                  {/* EDIT BUTTON */}
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

                  {/* DUPLICATE BUTTON */}
                  <button
                    type="button"
                    className="orbit-btn orbit-btn-ghost orbit-btn-icon orbit-btn-sm"
                    onClick={() => handleDuplicate(item)}
                    title="Duplicate action"
                  >
                    <Copy size={14} />
                  </button>

                  {/* DELETE BUTTON */}
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

      {/* ACTION EDITOR MODAL */}
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

      {/* CONFIRM DELETE DIALOG */}
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



