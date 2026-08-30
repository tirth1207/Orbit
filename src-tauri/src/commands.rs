use serde::{Deserialize, Serialize};
use tauri::{Emitter, Manager};

use crate::config::{self, ConfigState};
use crate::types::*;

/// Frontend-facing application configuration.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppConfig {
    pub enabled: bool,
    pub trigger: String,
    pub radius: f64,
    pub dead_zone: f64,
    pub item_size: f64,
    pub icon_size: f64,
    pub animation_speed: f64,
    pub stagger_delay: f64,
    pub show_labels: bool,
    pub show_center: bool,
    pub center_icon: String,
    pub enable_hover_animation: bool,
    pub enable_stagger_animation: bool,
    pub enable_nested_animation: bool,
    pub start_with_os: bool,
    pub launch_settings_on_startup: bool,
    pub wheel_style: String,
    pub opacity: f64,
    pub border: bool,
    pub blur: bool,
    pub items: Vec<Action>,
    pub theme: String,
    pub config_path: Option<String>,
}

pub fn config_to_app_config(cfg: &Config) -> AppConfig {
    AppConfig {
        enabled: cfg.settings.enabled,
        trigger: cfg.settings.trigger.clone(),
        radius: cfg.settings.appearance.radius,
        dead_zone: cfg.settings.appearance.dead_zone,
        item_size: cfg.settings.appearance.item_size,
        icon_size: cfg.settings.appearance.icon_size,
        animation_speed: cfg.settings.wheel.animation_speed,
        stagger_delay: cfg.settings.wheel.stagger_delay,
        show_labels: cfg.settings.appearance.show_labels,
        show_center: cfg.settings.appearance.show_center,
        center_icon: cfg.settings.appearance.center_icon.clone(),
        enable_hover_animation: cfg.settings.wheel.enable_hover_animation,
        enable_stagger_animation: cfg.settings.wheel.enable_stagger_animation,
        enable_nested_animation: cfg.settings.wheel.enable_nested_animation,
        start_with_os: cfg.settings.startup.start_with_os,
        launch_settings_on_startup: cfg.settings.startup.launch_settings_on_startup,
        wheel_style: cfg.settings.appearance.wheel_style.clone(),
        opacity: cfg.settings.appearance.opacity,
        border: cfg.settings.appearance.border,
        blur: cfg.settings.appearance.blur,
        items: cfg.items.clone(),
        theme: cfg.settings.appearance.theme.clone(),
        config_path: Some(config::config_path().to_string_lossy().to_string()),
    }
}

pub fn app_config_to_config(app_config: &AppConfig) -> Config {
    Config {
        version: 1,
        settings: Settings {
            enabled: app_config.enabled,
            trigger: app_config.trigger.clone(),
            appearance: AppearanceSettings {
                theme: app_config.theme.clone(),
                radius: app_config.radius,
                dead_zone: app_config.dead_zone,
                item_size: app_config.item_size,
                icon_size: app_config.icon_size,
                show_labels: app_config.show_labels,
                show_center: app_config.show_center,
                center_icon: app_config.center_icon.clone(),
                wheel_style: app_config.wheel_style.clone(),
                opacity: app_config.opacity,
                border: app_config.border,
                blur: app_config.blur,
            },
            wheel: WheelSettings {
                enabled: true,
                animation_speed: app_config.animation_speed,
                stagger_delay: app_config.stagger_delay,
                enable_hover_animation: app_config.enable_hover_animation,
                enable_stagger_animation: app_config.enable_stagger_animation,
                enable_nested_animation: app_config.enable_nested_animation,
            },
            startup: StartupSettings {
                start_with_os: app_config.start_with_os,
                launch_settings_on_startup: app_config.launch_settings_on_startup,
            },
        },
        items: app_config.items.clone(),
    }
}

/// Load configuration for the React frontend.
#[tauri::command]
pub fn load_configuration(app: tauri::AppHandle) -> Result<AppConfig, String> {
    println!("[Orbit] load_configuration called");
    let cfg_state = app.state::<ConfigState>();
    let cfg = cfg_state.0.lock().unwrap();
    Ok(config_to_app_config(&cfg))
}

/// Save configuration from React frontend.
#[tauri::command]
pub fn save_configuration(app: tauri::AppHandle, config: AppConfig) -> Result<AppConfig, String> {
    println!("[Orbit] save_configuration called");
    let new_cfg = app_config_to_config(&config);

    config::save_to_disk(&new_cfg)?;

    {
        let cfg_state = app.state::<ConfigState>();
        let mut cfg = cfg_state.0.lock().unwrap();
        *cfg = new_cfg.clone();
    }

    let result_app_config = config_to_app_config(&new_cfg);

    // Broadcast configuration-changed to all windows
    let _ = app.emit("orbit-config-changed", &result_app_config);
    let _ = app.emit("tray-enabled-changed", result_app_config.enabled);

    Ok(result_app_config)
}

/// Reset configuration to default values.
#[tauri::command]
pub fn reset_configuration(app: tauri::AppHandle) -> Result<AppConfig, String> {
    println!("[Orbit] reset_configuration called");
    let mut default_config = Config::default();
    default_config.items = config::default_items();

    config::save_to_disk(&default_config)?;

    {
        let cfg_state = app.state::<ConfigState>();
        let mut cfg = cfg_state.0.lock().unwrap();
        *cfg = default_config.clone();
    }

    let result_app_config = config_to_app_config(&default_config);

    let _ = app.emit("orbit-config-changed", &result_app_config);
    let _ = app.emit("tray-enabled-changed", result_app_config.enabled);

    Ok(result_app_config)
}

/// Enable or disable Orbit.
#[tauri::command]
pub fn toggle_enabled(app: tauri::AppHandle, enabled: bool) -> Result<bool, String> {
    println!("[Orbit] toggle_enabled: {}", enabled);
    config::set_enabled(&app, enabled)?;

    let cfg_state = app.state::<ConfigState>();
    let cfg = cfg_state.0.lock().unwrap();
    let app_cfg = config_to_app_config(&cfg);

    let _ = app.emit("orbit-config-changed", &app_cfg);
    let _ = app.emit("tray-enabled-changed", enabled);

    Ok(enabled)
}

/// Native file picker.
#[tauri::command]
pub fn pick_file(title: Option<String>) -> Result<Option<String>, String> {
    let mut dialog = rfd::FileDialog::new();
    if let Some(t) = title {
        dialog = dialog.set_title(t);
    }
    let res = dialog.pick_file();
    Ok(res.map(|p| p.to_string_lossy().to_string()))
}

/// Native folder picker.
#[tauri::command]
pub fn pick_folder(title: Option<String>) -> Result<Option<String>, String> {
    let mut dialog = rfd::FileDialog::new();
    if let Some(t) = title {
        dialog = dialog.set_title(t);
    }
    let res = dialog.pick_folder();
    Ok(res.map(|p| p.to_string_lossy().to_string()))
}

/// Execute an Orbit action.
#[tauri::command]
pub fn execute_action(action: Action) -> Result<(), String> {
    println!(
        "[Orbit] Executing action: {} (type: {}) -> {}",
        action.name, action.r#type, action.target
    );

    let target = action.target.trim();
    let action_type = action.r#type.to_lowercase();

    if target.is_empty() && action_type != "menu" && action_type != "shortcut" {
        return Err("Action target is empty".to_string());
    }

    match action_type.as_str() {
        "url" => {
            if target.starts_with("http://") || target.starts_with("https://") {
                open::that(target).map_err(|e| format!("Failed to open URL: {}", e))?;
            } else {
                let formatted = format!("https://{}", target);
                open::that(&formatted).map_err(|e| format!("Failed to open URL: {}", e))?;
            }
            Ok(())
        }
        "folder" | "file" => {
            open::that(target).map_err(|e| format!("Failed to open target path: {}", e))?;
            Ok(())
        }
        "application" => {
            use std::process::Command;
            let mut cmd = Command::new(target);
            if let Some(ref args_str) = action.args {
                if !args_str.trim().is_empty() {
                    let parts: Vec<&str> = args_str.split_whitespace().collect();
                    cmd.args(&parts);
                }
            }
            if let Some(ref dir) = action.working_directory {
                if !dir.trim().is_empty() {
                    cmd.current_dir(dir);
                }
            }
            cmd.spawn()
                .map_err(|e| format!("Failed to launch application: {}", e))?;
            Ok(())
        }
        "command" => {
            use std::process::Command;
            let parts: Vec<&str> = target.split_whitespace().collect();
            if parts.is_empty() {
                return Err("Empty command".to_string());
            }
            let mut cmd = Command::new(parts[0]);
            cmd.args(&parts[1..]);
            if let Some(ref dir) = action.working_directory {
                if !dir.trim().is_empty() {
                    cmd.current_dir(dir);
                }
            }
            cmd.spawn()
                .map_err(|e| format!("Failed to execute command: {}", e))?;
            Ok(())
        }
        "shortcut" => {
            println!("[Orbit] Triggered shortcut action: {:?}", action.shortcut);
            Ok(())
        }
        "menu" => {
            println!("[Orbit] Menu action triggered (container)");
            Ok(())
        }
        _ => {
            if target.starts_with("http://") || target.starts_with("https://") {
                open::that(target).map_err(|e| format!("Failed to open URL: {}", e))?;
                Ok(())
            } else {
                open::that(target).map_err(|e| format!("Failed to launch target: {}", e))?;
                Ok(())
            }
        }
    }
}

/// Show the radial wheel at screen coordinates.
#[tauri::command]
pub fn open_wheel(app: tauri::AppHandle, x: f64, y: f64) -> Result<(), String> {
    println!("[Orbit] Opening wheel at ({}, {})", x, y);

    let window = app
        .get_webview_window("wheel")
        .ok_or_else(|| "Wheel window not found".to_string())?;

    let cfg_state = app.state::<ConfigState>();
    let cfg = cfg_state.0.lock().unwrap();
    crate::place_wheel_window(&window, x, y, cfg.settings.appearance.radius);

    let focus_state = app.state::<crate::PreviousForeground>();
    crate::capture_foreground_window(&focus_state);

    window.show().map_err(|e| format!("Failed to show window: {}", e))?;
    window.set_focus().map_err(|e| format!("Failed to focus window: {}", e))?;
    window
        .emit("orbit-trigger", serde_json::json!({ "x": x, "y": y }))
        .map_err(|e| format!("Failed to emit orbit-trigger: {}", e))?;
    Ok(())
}

/// Hide the radial wheel and restore foreground focus.
#[tauri::command]
pub fn close_wheel(app: tauri::AppHandle) -> Result<(), String> {
    println!("[Orbit] Closing wheel");

    let window = app
        .get_webview_window("wheel")
        .ok_or_else(|| "Wheel window not found".to_string())?;

    window.hide().map_err(|e| format!("Failed to hide window: {}", e))?;

    let focus_state = app.state::<crate::PreviousForeground>();
    crate::restore_foreground_window(&focus_state);

    Ok(())
}
