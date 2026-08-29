use serde::{Deserialize, Serialize};
use tauri::{Emitter, Manager};
#[cfg(target_os = "windows")]
use windows::Win32::Foundation::POINT;
#[cfg(target_os = "windows")]
use windows::Win32::UI::WindowsAndMessaging::GetCursorPos;

// Get the global mouse cursor position (screen coordinates)
#[cfg(target_os = "windows")]
fn get_cursor_position() -> Result<(f64, f64), String> {
    let mut point = POINT { x: 0, y: 0 };
    unsafe {
        GetCursorPos(&mut point)
            .map_err(|e| format!("GetCursorPos failed: {:?}", e))?;
    }
    Ok((point.x as f64, point.y as f64))
}

#[cfg(not(target_os = "windows"))]
fn get_cursor_position() -> Result<(f64, f64), String> {
    Err("Cursor position not supported on this platform".to_string())
}


mod config;
mod types;
mod commands;

pub use types::*;

pub fn run() {
    tauri::Builder::default()
        // Global shortcut plugin
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(|app, shortcut, event| {
                    use tauri_plugin_global_shortcut::ShortcutState;
                    println!("[Orbit] Shortcut event: {:?} - {:?}", shortcut, event.state());
                    if event.state() != ShortcutState::Pressed {
                        return;
                    }
                    println!("[Orbit] GLOBAL SHORTCUT PRESSED!");
                    if let Some(window) = app.get_webview_window("main") {
                        // Check if Orbit is enabled in configuration
                        let cfg = app.state::<crate::types::Config>();
                        if !cfg.settings.enabled {
                            println!("[Orbit] Disabled - ignoring shortcut");
                            return;
                        }
                        // Obtain the global cursor position
                        match get_cursor_position() {
                            Ok((x, y)) => {
                                println!("[Orbit] Cursor position: ({}, {})", x, y);
                                if let Err(error) = window.emit(
                                    "orbit-trigger",
                                    serde_json::json!({ "x": x, "y": y }),
                                ) {
                                    eprintln!("[Orbit] Failed to emit orbit-trigger: {}", error);
                                } else {
                                    println!("[Orbit] orbit-trigger emitted");
                                }
                            }
                            Err(err) => {
                                eprintln!("[Orbit] Failed to get cursor position: {}", err);
                            }
                        }
                        // Show and focus the window after emitting (optional)
                        if let Err(error) = window.show() {
                            eprintln!("[Orbit] Failed to show window: {}", error);
                        }
                        if let Err(error) = window.set_focus() {
                            eprintln!("[Orbit] Failed to focus window: {}", error);
                        }
                    } else {
                        eprintln!("[Orbit] Main window not found");
                    }
                })
                .build(),
        )
        // Opener plugin
        .plugin(tauri_plugin_opener::init())
        // Application setup
        .setup(|app| {
            println!("[Orbit] Starting Orbit...");
            config::init(app)?;
            // Register Ctrl + Space.
            use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut};
            let shortcut = Shortcut::new(Some(Modifiers::CONTROL), Code::Space);
            match app.global_shortcut().register(shortcut.clone()) {
                Ok(_) => println!("[Orbit] SUCCESS: Registered Ctrl+Space: {:?}", shortcut),
                Err(error) => eprintln!("[Orbit] ERROR: Failed to register Ctrl+Space: {}", error),
            }
            Ok(())
        })
        // Register every command exactly once.
        .invoke_handler(tauri::generate_handler![
            commands::load_configuration,
            commands::toggle_enabled,
            commands::execute_action,
            commands::open_wheel,
            commands::close_wheel,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Orbit application");
}
