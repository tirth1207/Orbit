use std::path::{Path, PathBuf};

use tauri::Manager;

use crate::types::Config;

/// Get the Orbit configuration file path.
fn config_path() -> PathBuf {
    #[cfg(target_os = "windows")]
    {
        let appdata =
            std::env::var("APPDATA").unwrap_or_default();

        Path::new(&appdata)
            .join("orbit")
            .join("orbit.json")
    }

    #[cfg(not(target_os = "windows"))]
    {
        PathBuf::from("orbit.json")
    }
}

/// Load configuration from disk.
///
/// If the configuration does not exist,
/// a default configuration is created.
pub fn load_rust_config() -> Config {
    let path = config_path();

    match std::fs::read_to_string(&path) {
        Ok(content) => {
            match serde_json::from_str::<Config>(&content) {
                Ok(mut config) => {
                    println!(
                        "[Orbit] Configuration loaded from {:?}",
                        path
                    );
                    // Add default items if missing
                    if config.items.is_empty() {
                        config.items = default_items();
                        if let Err(e) = save_to_disk(&config) {
                            eprintln!("[Orbit] Failed to save default items: {}", e);
                        }
                    } else if !config.items.iter().any(|item| item.id == "ai-menu") {
                        if let Some(ai_item) = default_items().into_iter().find(|i| i.id == "ai-menu") {
                            config.items.push(ai_item);
                            if let Err(e) = save_to_disk(&config) {
                                eprintln!("[Orbit] Failed to save updated items with AI menu: {}", e);
                            }
                        }
                    }
                    config
                }

                Err(error) => {
                    eprintln!(
                        "[Orbit] Failed to parse configuration: {}",
                        error
                    );
                    eprintln!("[Orbit] Using default configuration");
                    let mut config = Config::default();
                    config.items = default_items();
                    if let Err(e) = save_to_disk(&config) {
                        eprintln!("[Orbit] Failed to save default configuration: {}", e);
                    }
                    config
                }
            }
        }

        Err(_) => {
            println!(
                "[Orbit] Configuration not found. Creating default configuration at {:?}",
                path
            );

            let config = Config::default();

            if let Err(error) =
                save_to_disk(&config)
            {
                eprintln!(
                    "[Orbit] Failed to save default configuration: {}",
                    error
                );
            }

            config
        }
    }
}

// ---------------------------------------------------------------------------
// Default items for the radial wheel (clipboard, notepad, calculator, browser, explorer)
// ---------------------------------------------------------------------------
fn default_items() -> Vec<crate::types::Action> {
    use crate::types::{Action, ActionType};

    vec![
        Action {
            id: "open-notepad".to_string(),
            name: "Notepad".to_string(),
            r#type: ActionType::Application,
            target: "notepad.exe".to_string(),
            icon: None,
            enabled: true,
            description: Some("Open Windows Notepad".to_string()),
            children: None,
        },

        Action {
            id: "open-calc".to_string(),
            name: "Calculator".to_string(),
            r#type: ActionType::Application,
            target: "calc.exe".to_string(),
            icon: None,
            enabled: true,
            description: Some("Open Windows Calculator".to_string()),
            children: None,
        },

        Action {
            id: "open-browser".to_string(),
            name: "Browser".to_string(),
            r#type: ActionType::URL,
            target: "https://www.google.com".to_string(),
            icon: None,
            enabled: true,
            description: Some("Open default browser".to_string()),
            children: None,
        },

        Action {
            id: "open-explorer".to_string(),
            name: "Explorer".to_string(),
            r#type: ActionType::Folder,
            target: "C:\\".to_string(),
            icon: None,
            enabled: true,
            description: Some("Open Windows Explorer at C:".to_string()),
            children: None,
        },

        Action {
            id: "clipboard-demo".to_string(),
            name: "Clipboard Demo".to_string(),
            r#type: ActionType::Command,
            target: "cmd /C echo Clipboard Demo".to_string(),
            icon: None,
            enabled: true,
            description: Some("Run a demo command".to_string()),
            children: None,
        },

        Action {
            id: "ai-menu".to_string(),
            name: "AI".to_string(),
            r#type: ActionType::URL,
            target: "https://chatgpt.com".to_string(),
            icon: None,
            enabled: true,
            description: Some("AI Tools".to_string()),

            children: Some(vec![
                Action {
                    id: "ai-chatgpt".to_string(),
                    name: "ChatGPT".to_string(),
                    r#type: ActionType::URL,
                    target: "https://chatgpt.com".to_string(),
                    icon: None,
                    enabled: true,
                    description: Some("Open ChatGPT".to_string()),
                    children: None,
                },

                Action {
                    id: "ai-claude".to_string(),
                    name: "Claude".to_string(),
                    r#type: ActionType::URL,
                    target: "https://claude.ai".to_string(),
                    icon: None,
                    enabled: true,
                    description: Some("Open Claude".to_string()),
                    children: None,
                },

                Action {
                    id: "ai-gemini".to_string(),
                    name: "Gemini".to_string(),
                    r#type: ActionType::URL,
                    target: "https://gemini.google.com".to_string(),
                    icon: None,
                    enabled: true,
                    description: Some("Open Gemini".to_string()),
                    children: None,
                },
            ]),
        },
    ]
}

/// Save configuration to disk.
pub fn save_to_disk(
    config: &Config,
) -> Result<(), String> {
    let path = config_path();

    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent)
            .map_err(|error| {
                format!(
                    "Failed to create config directory: {}",
                    error
                )
            })?;
    }

    let json =
        serde_json::to_string_pretty(config)
            .map_err(|error| {
                format!(
                    "Failed to serialize configuration: {}",
                    error
                )
            })?;

    std::fs::write(&path, json)
        .map_err(|error| {
            format!(
                "Failed to write configuration: {}",
                error
            )
        })?;

    println!(
        "[Orbit] Configuration saved to {:?}",
        path
    );

    Ok(())
}

/// Initialize configuration.
pub fn init(
    app: &tauri::App,
) -> Result<(), String> {
    let config = load_rust_config();

    // Tauri Manager trait provides `manage`.
    app.manage(config);

    println!(
        "[Orbit] Configuration initialized"
    );

    Ok(())
}

/// Update the enabled state.
pub fn set_enabled(
    enabled: bool,
) -> Result<(), String> {
    let mut config =
        load_rust_config();

    config.settings.enabled =
        enabled;

    save_to_disk(&config)?;

    println!(
        "[Orbit] Enabled state changed to {}",
        enabled
    );

    Ok(())
}