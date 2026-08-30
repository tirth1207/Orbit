import React, { useState } from "react";
import {
  Code,
  Terminal,
  Globe,
  Folder,
  File,
  Sparkles,
  Bot,
  Brain,
  Search,
  Copy,
  Settings,
  Play,
  Star,
  Heart,
  Zap,
  Smile,
  X,
  Upload,
} from "lucide-react";

interface IconPickerProps {
  value: string | null;
  onChange: (icon: string | null) => void;
}

const PRESET_ICONS = [
  { name: "code", Icon: Code },
  { name: "terminal", Icon: Terminal },
  { name: "globe", Icon: Globe },
  { name: "folder", Icon: Folder },
  { name: "file", Icon: File },
  { name: "sparkles", Icon: Sparkles },
  { name: "bot", Icon: Bot },
  { name: "brain", Icon: Brain },
  { name: "search", Icon: Search },
  { name: "copy", Icon: Copy },
  { name: "settings", Icon: Settings },
  { name: "play", Icon: Play },
  { name: "star", Icon: Star },
  { name: "heart", Icon: Heart },
  { name: "zap", Icon: Zap },
  { name: "smile", Icon: Smile },
];

export const IconPicker: React.FC<IconPickerProps> = ({ value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [customPath, setCustomPath] = useState(value || "");

  const handleSelectPreset = (iconName: string) => {
    onChange(iconName);
    setIsOpen(false);
  };

  const handleCustomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setCustomPath(val);
    onChange(val ? val : null);
  };

  const handleClear = () => {
    setCustomPath("");
    onChange(null);
  };

  // Render current icon preview
  const renderPreview = () => {
    if (!value) {
      return <span className="orbit-icon-placeholder">✦</span>;
    }

    const preset = PRESET_ICONS.find((i) => i.name === value);
    if (preset) {
      const IconComponent = preset.Icon;
      return <IconComponent size={18} />;
    }

    // Check if image URL or file path
    if (
      value.startsWith("http://") ||
      value.startsWith("https://") ||
      value.startsWith("data:") ||
      value.endsWith(".png") ||
      value.endsWith(".svg") ||
      value.endsWith(".ico")
    ) {
      return (
        <img
          src={value}
          alt="icon preview"
          className="orbit-custom-icon-img"
          onError={(e) => {
            (e.currentTarget as HTMLElement).style.display = "none";
          }}
        />
      );
    }

    // Otherwise emoji or text
    return <span className="orbit-emoji-icon">{value}</span>;
  };

  return (
    <div className="orbit-icon-picker-container">
      <div className="orbit-icon-picker-field">
        <div className="orbit-icon-preview-box">{renderPreview()}</div>

        <button
          type="button"
          className="orbit-btn orbit-btn-secondary orbit-btn-sm"
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? "Close Icon Picker" : "Choose Icon"}
        </button>

        {value && (
          <button
            type="button"
            className="orbit-btn orbit-btn-ghost orbit-btn-icon orbit-btn-sm"
            onClick={handleClear}
            title="Clear icon"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {isOpen && (
        <div className="orbit-icon-picker-dropdown">
          <div className="orbit-icon-grid">
            {PRESET_ICONS.map((preset) => {
              const IconComp = preset.Icon;
              const isSelected = value === preset.name;
              return (
                <button
                  key={preset.name}
                  type="button"
                  className={`orbit-icon-option ${isSelected ? "is-selected" : ""}`}
                  onClick={() => handleSelectPreset(preset.name)}
                  title={preset.name}
                >
                  <IconComp size={18} />
                </button>
              );
            })}
          </div>

          <div className="orbit-custom-icon-input">
            <label>Custom Icon / Image Path / Emoji:</label>
            <div className="orbit-input-with-icon">
              <Upload size={14} className="orbit-input-icon" />
              <input
                type="text"
                className="orbit-input"
                placeholder="https://... or C:\path\icon.png or 🚀"
                value={customPath}
                onChange={handleCustomChange}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
