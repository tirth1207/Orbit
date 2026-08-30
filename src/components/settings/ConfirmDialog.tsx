import React, { useEffect } from "react";
import { AlertTriangle, X } from "lucide-react";

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDanger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  isDanger = true,
  onConfirm,
  onCancel,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === "Escape") {
        onCancel();
      } else if (e.key === "Enter") {
        onConfirm();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onConfirm, onCancel]);

  if (!isOpen) return null;

  return (
    <div className="orbit-modal-overlay" onClick={onCancel} role="dialog" aria-modal="true">
      <div
        className="orbit-modal-container"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="orbit-modal-header">
          <div className="orbit-modal-title-wrap">
            {isDanger && <AlertTriangle className="orbit-icon-danger" />}
            <h3>{title}</h3>
          </div>
          <button
            type="button"
            className="orbit-modal-close"
            onClick={onCancel}
            aria-label="Close dialog"
          >
            <X size={16} />
          </button>
        </div>

        <div className="orbit-modal-body">
          <p>{message}</p>
        </div>

        <div className="orbit-modal-footer">
          <button
            type="button"
            className="orbit-btn orbit-btn-secondary"
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`orbit-btn ${isDanger ? "orbit-btn-danger" : "orbit-btn-primary"}`}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};



