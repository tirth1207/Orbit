// Commands module for Orbit Tauri backend.
// All frontend-facing #[tauri::command] functions are defined here to avoid duplicate registration.

use serde::{Deserialize, Serialize};
use tauri::{Emitter, Manager};

use crate::config;
use crate::types::*;

/// Frontend-facing application configuration.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppConfig {
    pub enabled: bool,
    pub trigger: String,
    pub radius: f64,
    pub dead_zone: f64,
    pub items: Vec<Action>,
    pub theme: String,
}

/// Load configuration for the React frontend.
#[tauri::command]
pub fn load_configuration() -> Result<AppConfig, String> {
    println!("[Orbit] load_configuration called");

    let cfg = config::load_rust_config();

    let trigger = match cfg.settings.trigger.r#type {
        TriggerType::MiddleMouse => "middle_mouse".to_string(),
        TriggerType::KeyboardShortcut => "keyboard_shortcut".to_string(),
    };

    let theme = match cfg.settings.appearance.theme {
        Theme::System => "system".to_string(),
        Theme::Light => "light".to_string(),
        Theme::Dark => "dark".to_string(),
    };

    Ok(AppConfig {
        enabled: cfg.settings.enabled,
        trigger,
        radius: cfg.settings.appearance.radius,
        dead_zone: cfg.settings.appearance.dead_zone,
        items: cfg.items,
        theme,
    })
}

/// Enable or disable Orbit.
#[tauri::command]
pub fn toggle_enabled(enabled: bool) -> Result<bool, String> {
    println!("[Orbit] toggle_enabled: {}", enabled);

    config::set_enabled(enabled)?;

    Ok(enabled)
}

/// Execute an Orbit action.
#[tauri::command]
pub fn execute_action(action: Action) -> Result<(), String> {
    println!(
        "[Orbit] Executing action: {} -> {}",
        action.name,
        action.target
    );

    let target = action.target.trim();

    if target.is_empty() {
        return Err("Action target is empty".to_string());
    }

    use std::process::Command;
    let parts: Vec<&str> = target.split_whitespace().collect();
    if parts.is_empty() {
        return Err("Empty command".to_string());
    }
    Command::new(parts[0])
        .args(&parts[1..])
        .spawn()
        .map_err(|e| format!("Failed to execute action: {}", e))?;
    Ok(())
}

/// Show the radial wheel at the given screen coordinates. This is the
/// same path the global shortcut uses internally — exposed as a command
/// too so other triggers (e.g. a future middle-mouse trigger) can reuse it.
#[tauri::command]
pub fn open_wheel(app: tauri::AppHandle, x: f64, y: f64) -> Result<(), String> {
    println!("[Orbit] Opening wheel at ({}, {})", x, y);

    let window = app
        .get_webview_window("wheel")
        .ok_or_else(|| "Wheel window not found".to_string())?;

    let cfg = app.state::<crate::types::Config>();
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

/// Hide the radial wheel and hand focus back to whatever app had it
/// before Orbit's wheel window took over (e.g. Chrome).
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