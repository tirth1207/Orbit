use serde::{Deserialize, Serialize};
use tauri::{Emitter, Manager};

mod config;
mod types;

pub use types::*;

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
fn load_configuration() -> Result<AppConfig, String> {
    println!("[Orbit] load_configuration called");

    let config = config::load_rust_config();

    let trigger = match config.settings.trigger.r#type {
        TriggerType::MiddleMouse => "middle_mouse".to_string(),
        TriggerType::KeyboardShortcut => "keyboard_shortcut".to_string(),
    };

    let theme = match config.settings.appearance.theme {
        Theme::System => "system".to_string(),
        Theme::Light => "light".to_string(),
        Theme::Dark => "dark".to_string(),
    };

    Ok(AppConfig {
        enabled: config.settings.enabled,
        trigger,
        radius: config.settings.appearance.radius,
        dead_zone: config.settings.appearance.dead_zone,
        items: config.items,
        theme,
    })
}

/// Enable or disable Orbit.
#[tauri::command]
fn toggle_enabled(enabled: bool) -> Result<bool, String> {
    println!("[Orbit] toggle_enabled: {}", enabled);

    config::set_enabled(enabled)?;

    Ok(enabled)
}

/// Execute an Orbit action.
#[tauri::command]
fn execute_action(action: Action) -> Result<(), String> {
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
            .map_err(|error| {
                format!("Failed to execute action: {}", error)
            })?;

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
            .map_err(|error| {
                format!("Failed to execute action: {}", error)
            })?;

        Ok(())
    }
}

/// Tell the frontend to open the radial wheel.
#[tauri::command]
fn open_wheel(
    app: tauri::AppHandle,
    x: f64,
    y: f64,
) -> Result<(), String> {
    println!(
        "[Orbit] Opening wheel at ({}, {})",
        x,
        y
    );

    let window = app
        .get_webview_window("main")
        .ok_or_else(|| "Main window not found".to_string())?;

    window
        .show()
        .map_err(|error| {
            format!("Failed to show window: {}", error)
        })?;

    window
        .set_focus()
        .map_err(|error| {
            format!("Failed to focus window: {}", error)
        })?;

    window
        .emit(
            "wheel-open",
            serde_json::json!({
                "x": x,
                "y": y
            }),
        )
        .map_err(|error| {
            format!("Failed to emit wheel-open: {}", error)
        })?;

    Ok(())
}

/// Close the radial wheel.
#[tauri::command]
fn close_wheel(
    app: tauri::AppHandle,
) -> Result<(), String> {
    println!("[Orbit] Closing wheel");

    let window = app
        .get_webview_window("main")
        .ok_or_else(|| "Main window not found".to_string())?;

    window
        .emit("wheel-close", ())
        .map_err(|error| {
            format!("Failed to emit wheel-close: {}", error)
        })?;

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()

        // Global shortcut plugin
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(|app, shortcut, event| {
                    use tauri_plugin_global_shortcut::ShortcutState;

                    println!(
                        "[Orbit] Shortcut event: {:?} - {:?}",
                        shortcut,
                        event.state()
                    );

                    if event.state() != ShortcutState::Pressed {
                        return;
                    }

                    println!(
                        "[Orbit] GLOBAL SHORTCUT PRESSED!"
                    );

                    if let Some(window) =
                        app.get_webview_window("main")
                    {
                        println!(
                            "[Orbit] Main window found"
                        );

                        if let Err(error) = window.show() {
                            eprintln!(
                                "[Orbit] Failed to show window: {}",
                                error
                            );
                        }

                        if let Err(error) = window.set_focus() {
                            eprintln!(
                                "[Orbit] Failed to focus window: {}",
                                error
                            );
                        }

                        if let Err(error) = window.emit(
                            "orbit-trigger",
                            serde_json::json!({
                                "x": 0.0,
                                "y": 0.0
                            }),
                        ) {
                            eprintln!(
                                "[Orbit] Failed to emit orbit-trigger: {}",
                                error
                            );
                        } else {
                            println!(
                                "[Orbit] orbit-trigger emitted"
                            );
                        }
                    } else {
                        eprintln!(
                            "[Orbit] Main window not found"
                        );
                    }
                })
                .build(),
        )

        // Opener plugin
        .plugin(tauri_plugin_opener::init())

        // Application setup
        .setup(|app| {
            println!(
                "[Orbit] Starting Orbit..."
            );

            // Initialize configuration.
            config::init(app)?;

            // Register Ctrl + Space.
            use tauri_plugin_global_shortcut::{
                Code,
                GlobalShortcutExt,
                Modifiers,
                Shortcut,
            };

            let shortcut =
                Shortcut::new(
                    Some(Modifiers::CONTROL),
                    Code::Space,
                );

            match app
                .global_shortcut()
                .register(shortcut.clone())
            {
                Ok(_) => {
                    println!(
                        "[Orbit] SUCCESS: Registered Ctrl+Space: {:?}",
                        shortcut
                    );
                }

                Err(error) => {
                    eprintln!(
                        "[Orbit] ERROR: Failed to register Ctrl+Space: {}",
                        error
                    );
                }
            }

            Ok(())
        })

        // Register every command exactly once.
        .invoke_handler(
            tauri::generate_handler![
                load_configuration,
                toggle_enabled,
                execute_action,
                open_wheel,
                close_wheel
            ],
        )

        .run(tauri::generate_context!())
        .expect(
            "error while running Orbit application"
        );
}