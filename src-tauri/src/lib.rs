use serde::{Deserialize, Serialize};
use tauri::{Emitter, Manager};

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
                        println!("[Orbit] Main window found");
                        if let Err(error) = window.show() {
                            eprintln!("[Orbit] Failed to show window: {}", error);
                        }
                        if let Err(error) = window.set_focus() {
                            eprintln!("[Orbit] Failed to focus window: {}", error);
                        }
                        if let Err(error) = window.emit(
                            "orbit-trigger",
                            serde_json::json!({ "x": 0.0, "y": 0.0 }),
                        ) {
                            eprintln!("[Orbit] Failed to emit orbit-trigger: {}", error);
                        } else {
                            println!("[Orbit] orbit-trigger emitted");
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
