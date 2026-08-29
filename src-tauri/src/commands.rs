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

    #[cfg(target_os = "windows")]
    {
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

    #[cfg(not(target_os = "windows"))]
    {
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
}

/// Tell the frontend to open the radial wheel.
#[tauri::command]
pub fn open_wheel(app: tauri::AppHandle, x: f64, y: f64) -> Result<(), String> {
    println!("[Orbit] Opening wheel at ({}, {})", x, y);

    let window = app
        .get_webview_window("main")
        .ok_or_else(|| "Main window not found".to_string())?;

    window.show().map_err(|e| format!("Failed to show window: {}", e))?;
    window.set_focus().map_err(|e| format!("Failed to focus window: {}", e))?;
    window
        .emit(
            "wheel-open",
            serde_json::json!({ "x": x, "y": y }),
        )
        .map_err(|e| format!("Failed to emit wheel-open: {}", e))?;
    Ok(())
}

/// Close the radial wheel.
#[tauri::command]
pub fn close_wheel(app: tauri::AppHandle) -> Result<(), String> {
    println!("[Orbit] Closing wheel");
    let window = app
        .get_webview_window("main")
        .ok_or_else(|| "Main window not found".to_string())?;
    window
        .emit("wheel-close", ())
        .map_err(|e| format!("Failed to emit wheel-close: {}", e))?;
    Ok(())
}
