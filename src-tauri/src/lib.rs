use std::sync::Mutex;
use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem},
    tray::TrayIconBuilder,
    Emitter, Manager, WebviewWindow,
};

#[cfg(target_os = "windows")]
use windows::Win32::Foundation::{HWND, POINT};
#[cfg(target_os = "windows")]
use windows::Win32::UI::WindowsAndMessaging::{GetCursorPos, GetForegroundWindow, SetForegroundWindow};

mod config;
mod types;
mod commands;

pub use types::*;

// The wheel window is sized larger than the wheel's own diameter so
// hover glows / labels aren't clipped at the window edge. This MUST
// match the flex-centering padding used in src/windows/WheelWindow.tsx,
// or the wheel will visually drift off the cursor.
const WHEEL_WINDOW_PADDING: f64 = 56.0;

/// Whatever window/app had OS focus right before Orbit's wheel window
/// stole it (e.g. Chrome). Captured on trigger, restored on close, so
/// switching back to work doesn't require an extra Alt+Tab.
pub struct PreviousForeground(pub Mutex<Option<isize>>);

#[cfg(target_os = "windows")]
fn get_cursor_position() -> Result<(f64, f64), String> {
    let mut point = POINT { x: 0, y: 0 };
    unsafe {
        GetCursorPos(&mut point).map_err(|e| format!("GetCursorPos failed: {:?}", e))?;
    }
    Ok((point.x as f64, point.y as f64))
}

#[cfg(not(target_os = "windows"))]
fn get_cursor_position() -> Result<(f64, f64), String> {
    Err("Cursor position not supported on this platform".to_string())
}

#[cfg(target_os = "windows")]
pub fn capture_foreground_window(state: &PreviousForeground) {
    unsafe {
        let hwnd = GetForegroundWindow();
        *state.0.lock().unwrap() = Some(hwnd.0 as isize);
    }
}

#[cfg(not(target_os = "windows"))]
pub fn capture_foreground_window(_state: &PreviousForeground) {}

#[cfg(target_os = "windows")]
pub fn restore_foreground_window(state: &PreviousForeground) {
    if let Some(raw) = state.0.lock().unwrap().take() {
        unsafe {
            let _ = SetForegroundWindow(HWND(raw as *mut _));
        }
    }
}

#[cfg(not(target_os = "windows"))]
pub fn restore_foreground_window(_state: &PreviousForeground) {}

/// Resize + reposition the (already-created, hidden) wheel window so
/// it's centered on the given screen coordinates.
pub fn place_wheel_window(window: &WebviewWindow, cursor_x: f64, cursor_y: f64, radius: f64) {
    let size = (radius * 2.0) + (WHEEL_WINDOW_PADDING * 2.0);

    if let Err(error) = window.set_size(tauri::Size::Logical(tauri::LogicalSize::new(size, size))) {
        eprintln!("[Orbit] Failed to resize wheel window: {}", error);
    }

    if let Err(error) = window.set_position(tauri::Position::Logical(tauri::LogicalPosition::new(
        cursor_x - size / 2.0,
        cursor_y - size / 2.0,
    ))) {
        eprintln!("[Orbit] Failed to position wheel window: {}", error);
    }
}

pub fn run() {
    tauri::Builder::default()
        .manage(PreviousForeground(Mutex::new(None)))
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

                    let Some(wheel_window) = app.get_webview_window("wheel") else {
                        eprintln!("[Orbit] Wheel window not found");
                        return;
                    };

                    // Check if Orbit is enabled in configuration
                    let cfg = app.state::<crate::types::Config>();
                    if !cfg.settings.enabled {
                        println!("[Orbit] Disabled - ignoring shortcut");
                        return;
                    }

                    match get_cursor_position() {
                        Ok((x, y)) => {
                            println!("[Orbit] Cursor position: ({}, {})", x, y);

                            // Remember whatever app currently has focus
                            // (e.g. Chrome) so we can hand it back later.
                            let focus_state = app.state::<PreviousForeground>();
                            capture_foreground_window(&focus_state);

                            place_wheel_window(&wheel_window, x, y, cfg.settings.appearance.radius);

                            if let Err(error) = wheel_window.show() {
                                eprintln!("[Orbit] Failed to show wheel window: {}", error);
                            }
                            if let Err(error) = wheel_window.set_focus() {
                                eprintln!("[Orbit] Failed to focus wheel window: {}", error);
                            }
                            if let Err(error) =
                                wheel_window.emit("orbit-trigger", serde_json::json!({ "x": x, "y": y }))
                            {
                                eprintln!("[Orbit] Failed to emit orbit-trigger: {}", error);
                            } else {
                                println!("[Orbit] orbit-trigger emitted");
                            }
                        }
                        Err(err) => {
                            eprintln!("[Orbit] Failed to get cursor position: {}", err);
                        }
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

            // --------------------------------------------------------
            // TRAY ICON
            //
            // This is what lets Orbit live entirely in the background:
            // no window ever needs to be open for the wheel to work,
            // and closing the settings window just hides it (see
            // on_window_event below) rather than quitting the app.
            // --------------------------------------------------------
            let toggle_item = MenuItem::with_id(app, "toggle", "Disable Orbit", true, None::<&str>)?;
            let settings_item = MenuItem::with_id(app, "settings", "Open Settings", true, None::<&str>)?;
            let separator = PredefinedMenuItem::separator(app)?;
            let quit_item = MenuItem::with_id(app, "quit", "Quit Orbit", true, None::<&str>)?;

            let tray_menu = Menu::with_items(app, &[&toggle_item, &settings_item, &separator, &quit_item])?;

            TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&tray_menu)
                .show_menu_on_left_click(true)
                .tooltip("Orbit")
                .on_menu_event(move |app, event| match event.id.as_ref() {
                    "toggle" => {
                        let cfg = app.state::<crate::types::Config>();
                        let new_enabled = !cfg.settings.enabled;

                        if let Err(error) = config::set_enabled(new_enabled) {
                            eprintln!("[Orbit] Failed to toggle enabled: {}", error);
                            return;
                        }

                        let _ = toggle_item.set_text(if new_enabled { "Disable Orbit" } else { "Enable Orbit" });

                        if let Some(main) = app.get_webview_window("main") {
                            let _ = main.emit("tray-enabled-changed", new_enabled);
                        }
                    }
                    "settings" => {
                        if let Some(main) = app.get_webview_window("main") {
                            let _ = main.show();
                            let _ = main.set_focus();
                        }
                    }
                    "quit" => {
                        app.exit(0);
                    }
                    _ => {}
                })
                .build(app)?;

            Ok(())
        })
        // Neither window ever really "closes" — the X button just hides
        // it, so Orbit keeps running from the tray until Quit is chosen.
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let _ = window.hide();
            }
        })
        // Register every command exactly once.
        .invoke_handler(tauri::generate_handler![
            commands::load_configuration,
            commands::toggle_enabled,
            commands::execute_action,
            commands::open_wheel,
            commands::close_wheel,
        ])
        .build(tauri::generate_context!())
        .expect("error while building Orbit application")
        .run(|_app_handle, event| {
            // Both windows are hidden, not destroyed, when "closed" (see
            // on_window_event above). This is a second safety net so
            // nothing else can quietly terminate the background process
            // — only the tray's "Quit Orbit" (app.exit(0)) should.
            if let tauri::RunEvent::ExitRequested { api, .. } = event {
                api.prevent_exit();
            }
        });
}