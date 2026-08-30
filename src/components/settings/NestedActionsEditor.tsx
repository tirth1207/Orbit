import React, { useState } from "react";
import {
  ArrowLeft,
  Plus,
  Layers,
  Edit3,
  Trash2,
  Copy,
  ChevronUp,
  ChevronDown,
  Globe,
  Code,
  Terminal,
  Folder,
  File,
  Keyboard,
} from "lucide-react";
import { ActionEditor } from "./ActionEditor";
import { ConfirmDialog } from "./ConfirmDialog";
import { type Action } from "../../types/types";

interface NestedActionsEditorProps {
  rootItems: Action[];
  activeParentId: string | null;
  onSelectParent: (parentId: string) => void;
  onUpdateParentChildren: (parentId: string, children: Action[]) => void;
  onBackToRoot: () => void;
}

export const NestedActionsEditor: React.FC<NestedActionsEditorProps> = ({
  rootItems,
  activeParentId,
  onSelectParent,
  onUpdateParentChildren,
  onBackToRoot,
}) => {
  const [editingChild, setEditingChild] = useState<Action | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [deletingChildId, setDeletingChildId] = useState<string | null>(null);

  // Find parent items (items with children or type === 'menu')
  const menuParents = rootItems.filter(
    (item) => item.type === "menu" || (item.children && item.children.length > 0)
  );

  const selectedParent = rootItems.find((item) => item.id === activeParentId) || menuParents[0] || null;
  const children = selectedParent?.children || [];

  const handleToggleEnabled = (childId: string) => {
    if (!selectedParent) return;
    const updated = children.map((c) =>
      c.id === childId ? { ...c, enabled: !c.enabled } : c
    );
    onUpdateParentChildren(selectedParent.id, updated);
  };

  const handleMove = (index: number, direction: "up" | "down") => {
    if (!selectedParent) return;
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= children.length) return;

    const newChildren = [...children];
    const [moved] = newChildren.splice(index, 1);
    newChildren.splice(targetIndex, 0, moved);
    onUpdateParentChildren(selectedParent.id, newChildren);
  };

  const handleDuplicate = (child: Action) => {
    if (!selectedParent) return;
    const newChild: Action = {
      ...child,
      id: `child-${Date.now()}`,
      name: `${child.name} (Copy)`,
    };
    onUpdateParentChildren(selectedParent.id, [...children, newChild]);
  };

  const handleConfirmDelete = () => {
    if (!selectedParent || !deletingChildId) return;
    const updated = children.filter((c) => c.id !== deletingChildId);
    onUpdateParentChildren(selectedParent.id, updated);
    setDeletingChildId(null);
  };

  const handleSaveChild = (savedChild: Action) => {
    if (!selectedParent) return;
    const existingIndex = children.findIndex((c) => c.id === savedChild.id);
    if (existingIndex >= 0) {
      const updated = [...children];
      updated[existingIndex] = savedChild;
      onUpdateParentChildren(selectedParent.id, updated);
    } else {
      onUpdateParentChildren(selectedParent.id, [...children, savedChild]);
    }
    setIsEditorOpen(false);
    setEditingChild(null);
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

  if (!selectedParent && menuParents.length === 0) {
    return (
      <div className="orbit-section-panel">
        <div className="orbit-section-header">
          <div>
            <h2>Nested Menus</h2>
            <p>Configure child actions that appear inside menu items.</p>
          </div>
        </div>
        <div className="orbit-empty-state">
          <Layers size={36} className="orbit-empty-icon" />
          <h4>No Menu Parent Actions</h4>
          <p>
            To create a nested radial menu, add an action of type <strong>Nested Menu (Parent)</strong> in the Actions tab.
          </p>
          <button
            type="button"
            className="orbit-btn orbit-btn-secondary"
            onClick={onBackToRoot}
          >
            <ArrowLeft size={15} /> Go to Actions
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="orbit-section-panel">
      {/* HEADER */}
      <div className="orbit-section-header">
        <div>
          <h2>Nested Menu Manager</h2>
          <p>Configure actions inside child radial menus.</p>
        </div>
        <div className="orbit-header-controls">
          <button
            type="button"
            className="orbit-btn orbit-btn-secondary"
            onClick={onBackToRoot}
          >
            <ArrowLeft size={15} /> Back to Actions
          </button>
          <button
            type="button"
            className="orbit-btn orbit-btn-primary"
            onClick={() => {
              setEditingChild(null);
              setIsEditorOpen(true);
            }}
          >
            <Plus size={15} /> Add Child Action
          </button>
        </div>
      </div>

      {/* PARENT SELECTOR BAR */}
      <div className="orbit-parent-selector-card">
        <label htmlFor="parent-action-select">Selecting Parent Action:</label>
        <select
          id="parent-action-select"
          className="orbit-select"
          value={selectedParent?.id || ""}
          onChange={(e) => onSelectParent(e.target.value)}
        >
          {menuParents.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} ({p.children?.length ?? 0} child items)
            </option>
          ))}
        </select>
      </div>

      {/* CHILDREN LIST */}
      {children.length === 0 ? (
        <div className="orbit-empty-state">
          <Layers size={36} className="orbit-empty-icon" />
          <h4>No child actions in "{selectedParent?.name}"</h4>
          <p>Add child items that appear when selecting this menu in Orbit.</p>
          <button
            type="button"
            className="orbit-btn orbit-btn-primary"
            onClick={() => {
              setEditingChild(null);
              setIsEditorOpen(true);
            }}
          >
            <Plus size={15} /> Add Child Action
          </button>
        </div>
      ) : (
        <div className="orbit-actions-list">
          {children.map((child, index) => (
            <div
              key={child.id}
              className={`orbit-action-item ${!child.enabled ? "is-disabled" : ""}`}
            >
              {/* REORDER BUTTONS */}
              <div className="orbit-action-reorder">
                <button
                  type="button"
                  className="orbit-btn-icon-subtle"
                  onClick={() => handleMove(index, "up")}
                  disabled={index === 0}
                  title="Move Up"
                >
                  <ChevronUp size={13} />
                </button>
                <button
                  type="button"
                  className="orbit-btn-icon-subtle"
                  onClick={() => handleMove(index, "down")}
                  disabled={index === children.length - 1}
                  title="Move Down"
                >
                  <ChevronDown size={13} />
                </button>
              </div>

              {/* ICON & DETAILS */}
              <div className="orbit-action-main">
                <div className="orbit-action-icon-badge">
                  {child.icon ? (
                    <span className="orbit-custom-icon">{child.icon}</span>
                  ) : (
                    getActionTypeIcon(child.type)
                  )}
                </div>

                <div className="orbit-action-details">
                  <div className="orbit-action-title-row">
                    <span className="orbit-action-name">{child.name}</span>
                    <span className="orbit-type-tag">{child.type}</span>
                  </div>
                  <span className="orbit-action-target" title={child.target}>
                    {child.target || "(No target path)"}
                  </span>
                </div>
              </div>

              {/* CONTROLS */}
              <div className="orbit-action-controls">
                <label className="orbit-switch orbit-switch-sm" title="Enable/Disable action">
                  <input
                    type="checkbox"
                    checked={child.enabled}
                    onChange={() => handleToggleEnabled(child.id)}
                  />
                  <span className="orbit-slider" />
                </label>

                <button
                  type="button"
                  className="orbit-btn orbit-btn-ghost orbit-btn-icon orbit-btn-sm"
                  onClick={() => {
                    setEditingChild(child);
                    setIsEditorOpen(true);
                  }}
                  title="Edit child action"
                >
                  <Edit3 size={14} />
                </button>

                <button
                  type="button"
                  className="orbit-btn orbit-btn-ghost orbit-btn-icon orbit-btn-sm"
                  onClick={() => handleDuplicate(child)}
                  title="Duplicate child action"
                >
                  <Copy size={14} />
                </button>

                <button
                  type="button"
                  className="orbit-btn orbit-btn-ghost orbit-btn-icon orbit-btn-sm orbit-btn-danger-ghost"
                  onClick={() => setDeletingChildId(child.id)}
                  title="Delete child action"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CHILD ACTION EDITOR MODAL */}
      <ActionEditor
        action={editingChild}
        isOpen={isEditorOpen}
        onSave={handleSaveChild}
        onClose={() => {
          setIsEditorOpen(false);
          setEditingChild(null);
        }}
      />

      {/* CONFIRM DELETE DIALOG */}
      <ConfirmDialog
        isOpen={Boolean(deletingChildId)}
        title="Delete Child Action?"
        message="Are you sure you want to remove this child action from the nested menu?"
        confirmLabel="Delete Action"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeletingChildId(null)}
      />
    </div>
  );
};
