import React, { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Folder, File, AlertCircle, X, ChevronRight, Layers } from "lucide-react";
import { IconPicker } from "./IconPicker";
import { type Action, type ActionType } from "../../types/types";

interface ActionEditorProps {
  action: Action | null;
  isOpen: boolean;
  onSave: (updatedAction: Action) => void;
  onClose: () => void;
  onOpenNestedEditor?: (action: Action) => void;
}

export const ActionEditor: React.FC<ActionEditorProps> = ({
  action,
  isOpen,
  onSave,
  onClose,
  onOpenNestedEditor,
}) => {
  const [formData, setFormData] = useState<Action>({
    id: `action-${Date.now()}`,
    name: "",
    type: "application",
    target: "",
    icon: null,
    enabled: true,
    description: "",
    args: "",
    workingDirectory: "",
    children: [],
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (action) {
      setFormData({
        ...action,
        description: action.description || "",
        args: action.args || "",
        workingDirectory: action.workingDirectory || "",
        children: action.children || [],
      });
    } else {
      setFormData({
        id: `action-${Date.now()}`,
        name: "",
        type: "application",
        target: "",
        icon: null,
        enabled: true,
        description: "",
        args: "",
        workingDirectory: "",
        children: [],
      });
    }
    setErrors({});
  }, [action, isOpen]);

  if (!isOpen) return null;

  const validate = (): boolean => {
    const errs: Record<string, string> = {};

    if (!formData.name.trim()) {
      errs.name = "Action name cannot be empty.";
    }

    const type = formData.type.toLowerCase();

    if (type === "url") {
      if (!formData.target.trim()) {
        errs.target = "URL cannot be empty.";
      }
    } else if (type === "application") {
      if (!formData.target.trim()) {
        errs.target = "Application path cannot be empty.";
      }
    } else if (type === "folder") {
      if (!formData.target.trim()) {
        errs.target = "Folder path cannot be empty.";
      }
    } else if (type === "file") {
      if (!formData.target.trim()) {
        errs.target = "File path cannot be empty.";
      }
    } else if (type === "command") {
      if (!formData.target.trim()) {
        errs.target = "Command cannot be empty.";
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onSave({
        ...formData,
        name: formData.name.trim(),
        target: formData.target.trim(),
      });
    }
  };

  const handleBrowseFile = async () => {
    try {
      const selected = await invoke<string | null>("pick_file", {
        title: "Select Executable or File",
      });
      if (selected) {
        setFormData((prev) => ({
          ...prev,
          target: selected,
          name: prev.name || selected.split(/[/\\]/).pop() || "",
        }));
      }
    } catch (err) {
      console.error("[Orbit] Pick file error:", err);
    }
  };

  const handleBrowseFolder = async () => {
    try {
      const selected = await invoke<string | null>("pick_folder", {
        title: "Select Folder",
      });
      if (selected) {
        setFormData((prev) => ({
          ...prev,
          target: selected,
          name: prev.name || selected.split(/[/\\]/).pop() || "",
        }));
      }
    } catch (err) {
      console.error("[Orbit] Pick folder error:", err);
    }
  };

  const type = formData.type.toLowerCase();

  return (
    <div className="orbit-modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="orbit-modal-container orbit-editor-container" onClick={(e) => e.stopPropagation()}>
        <div className="orbit-modal-header">
          <h3>{action ? "Edit Action" : "Add Action"}</h3>
          <button type="button" className="orbit-modal-close" onClick={onClose} aria-label="Close editor">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="orbit-modal-body orbit-form-grid">
            {/* NAME */}
            <div className="orbit-form-field">
              <label htmlFor="action-name">
                Name <span className="orbit-required">*</span>
              </label>
              <input
                id="action-name"
                type="text"
                className={`orbit-input ${errors.name ? "is-invalid" : ""}`}
                placeholder="e.g. VS Code, ChatGPT, My Folder"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
              {errors.name && (
                <span className="orbit-field-error">
                  <AlertCircle size={12} /> {errors.name}
                </span>
              )}
            </div>

            {/* ACTION TYPE */}
            <div className="orbit-form-field">
              <label htmlFor="action-type">Action Type</label>
              <select
                id="action-type"
                className="orbit-select"
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as ActionType })}
              >
                <option value="application">Application (.exe / Binary)</option>
                <option value="url">Website URL</option>
                <option value="command">System Command</option>
                <option value="folder">Filesystem Folder</option>
                <option value="file">File</option>
                <option value="menu">Nested Menu (Parent)</option>
              </select>
            </div>

            {/* TARGET FIELDS BASED ON TYPE */}
            {type !== "menu" && (
              <div className="orbit-form-field">
                <label htmlFor="action-target">
                  {type === "application" && "Application Executable Path"}
                  {type === "url" && "Website URL"}
                  {type === "command" && "Command"}
                  {type === "folder" && "Folder Path"}
                  {type === "file" && "File Path"}
                  <span className="orbit-required"> *</span>
                </label>
                <div className="orbit-input-group">
                  <input
                    id="action-target"
                    type="text"
                    className={`orbit-input ${errors.target ? "is-invalid" : ""}`}
                    placeholder={
                      type === "url"
                        ? "https://example.com"
                        : type === "application"
                        ? "C:\\Program Files\\...\\app.exe"
                        : type === "folder"
                        ? "C:\\Users\\...\\Projects"
                        : type === "command"
                        ? "wt or echo hello"
                        : "Path to file"
                    }
                    value={formData.target}
                    onChange={(e) => setFormData({ ...formData, target: e.target.value })}
                  />
                  {(type === "application" || type === "file") && (
                    <button
                      type="button"
                      className="orbit-btn orbit-btn-secondary"
                      onClick={handleBrowseFile}
                    >
                      <File size={14} /> Browse
                    </button>
                  )}
                  {type === "folder" && (
                    <button
                      type="button"
                      className="orbit-btn orbit-btn-secondary"
                      onClick={handleBrowseFolder}
                    >
                      <Folder size={14} /> Browse
                    </button>
                  )}
                </div>
                {errors.target && (
                  <span className="orbit-field-error">
                    <AlertCircle size={12} /> {errors.target}
                  </span>
                )}
              </div>
            )}

            {/* ARGUMENTS FOR APP / COMMAND */}
            {(type === "application" || type === "command") && (
              <div className="orbit-form-field">
                <label htmlFor="action-args">Arguments (optional)</label>
                <input
                  id="action-args"
                  type="text"
                  className="orbit-input"
                  placeholder='--new-window --profile-directory="My Profile"'
                  value={formData.args}
                  onChange={(e) => setFormData({ ...formData, args: e.target.value })}
                />
              </div>
            )}

            {/* WORKING DIRECTORY FOR APP / COMMAND */}
            {(type === "application" || type === "command") && (
              <div className="orbit-form-field">
                <label htmlFor="action-workdir">Working Directory (optional)</label>
                <input
                  id="action-workdir"
                  type="text"
                  className="orbit-input"
                  placeholder="C:\Projects"
                  value={formData.workingDirectory}
                  onChange={(e) => setFormData({ ...formData, workingDirectory: e.target.value })}
                />
              </div>
            )}

            {/* ICON PICKER */}
            <div className="orbit-form-field">
              <label>Icon</label>
              <IconPicker
                value={formData.icon || null}
                onChange={(icon: string | null) => setFormData({ ...formData, icon })}
              />
            </div>

            {/* DESCRIPTION */}
            <div className="orbit-form-field">
              <label htmlFor="action-desc">Description (optional)</label>
              <input
                id="action-desc"
                type="text"
                className="orbit-input"
                placeholder="Brief description or tip"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            {/* ENABLED TOGGLE */}
            <div className="orbit-form-row orbit-toggle-row">
              <div className="orbit-row-info">
                <span className="orbit-row-title">Enable Action</span>
                <span className="orbit-row-desc">Show this action in the radial wheel</span>
              </div>
              <label className="orbit-switch">
                <input
                  type="checkbox"
                  checked={formData.enabled}
                  onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                />
                <span className="orbit-slider" />
              </label>
            </div>

            {/* NESTED ACTIONS BUTTON (IF MENU TYPE OR HAS CHILDREN) */}
            {(type === "menu" || (formData.children && formData.children.length > 0)) && (
              <div className="orbit-nested-section-box">
                <div className="orbit-nested-info">
                  <Layers size={16} />
                  <span>
                    Nested Actions: <strong>{formData.children?.length ?? 0} child items</strong>
                  </span>
                </div>
                {onOpenNestedEditor && (
                  <button
                    type="button"
                    className="orbit-btn orbit-btn-secondary orbit-btn-sm"
                    onClick={() => {
                      onOpenNestedEditor(formData);
                    }}
                  >
                    Manage Children <ChevronRight size={14} />
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="orbit-modal-footer">
            <button type="button" className="orbit-btn orbit-btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="orbit-btn orbit-btn-primary">
              Save Action
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};



