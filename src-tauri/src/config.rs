use std::path::{Path, PathBuf};
use std::sync::Mutex;
use tauri::Manager;

use crate::types::{Action, Config, WheelPage};

pub struct ConfigState(pub Mutex<Config>);

/// Get the Orbit configuration file path.
pub fn config_path() -> PathBuf {
    #[cfg(target_os = "windows")]
    {
        let appdata = std::env::var("APPDATA").unwrap_or_default();
        Path::new(&appdata).join("orbit").join("orbit.json")
    }

    #[cfg(not(target_os = "windows"))]
    {
        let home = std::env::var("HOME").unwrap_or_else(|_| ".".to_string());
        Path::new(&home).join(".config").join("orbit").join("orbit.json")
    }
}

fn normalize_config_pages(mut config: Config) -> Config {
    if config.pages.is_empty() {
        let legacy_items = if config.items.is_empty() {
            default_items()
        } else {
            config.items.clone()
        };

        config.items = legacy_items.clone();
        config.pages = vec![WheelPage {
            id: "applications".to_string(),
            name: "Applications".to_string(),
            icon: Some("grid-3x3".to_string()),
            r#type: "launcher".to_string(),
            enabled: true,
            items: legacy_items,
        }];
        config.default_page_id = Some("applications".to_string());
    }

    if config.default_page_id.is_none() {
        config.default_page_id = config.pages.first().map(|page| page.id.clone());
    }

    if config.items.is_empty() {
        config.items = config
            .pages
            .iter()
            .flat_map(|page| page.items.iter().cloned())
            .collect();
    }

    config
}

/// Load configuration from disk.
/// If the configuration does not exist, a default configuration is created.
pub fn load_rust_config() -> Config {
    let path = config_path();

    match std::fs::read_to_string(&path) {
        Ok(content) => match serde_json::from_str::<Config>(&content) {
            Ok(mut config) => {
                println!("[Orbit] Configuration loaded from {:?}", path);
                config = normalize_config_pages(config);

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
                eprintln!("[Orbit] Failed to parse configuration: {}", error);
                eprintln!("[Orbit] Using default configuration");
                let mut config = Config::default();
                config.items = default_items();
                config.pages = vec![WheelPage {
                    id: "applications".to_string(),
                    name: "Applications".to_string(),
                    icon: Some("grid-3x3".to_string()),
                    r#type: "launcher".to_string(),
                    enabled: true,
                    items: config.items.clone(),
                }];
                config.default_page_id = Some("applications".to_string());
                if let Err(e) = save_to_disk(&config) {
                    eprintln!("[Orbit] Failed to save default configuration: {}", e);
                }
                config
            }
        },
        Err(_) => {
            println!(
                "[Orbit] Configuration not found. Creating default configuration at {:?}",
                path
            );
            let mut config = Config::default();
            config.items = default_items();
            config.pages = vec![WheelPage {
                id: "applications".to_string(),
                name: "Applications".to_string(),
                icon: Some("grid-3x3".to_string()),
                r#type: "launcher".to_string(),
                enabled: true,
                items: config.items.clone(),
            }];
            config.default_page_id = Some("applications".to_string());
            if let Err(error) = save_to_disk(&config) {
                eprintln!("[Orbit] Failed to save default configuration: {}", error);
            }
            config
        }
    }
}

pub fn default_items() -> Vec<Action> {
    vec![
        Action {
            id: "open-browser".to_string(),
            name: "Browser".to_string(),
            r#type: "url".to_string(),
            target: "https://www.google.com".to_string(),
            icon: Some("globe".to_string()),
            enabled: true,
            description: Some("Open default web browser".to_string()),
            args: None,
            working_directory: None,
            shortcut: None,
            children: None,
        },
        Action {
            id: "open-vscode".to_string(),
            name: "VS Code".to_string(),
            r#type: "application".to_string(),
            target: "code".to_string(),
            icon: Some("code".to_string()),
            enabled: true,
            description: Some("Open Visual Studio Code".to_string()),
            args: None,
            working_directory: None,
            shortcut: None,
            children: None,
        },
        Action {
            id: "open-terminal".to_string(),
            name: "Terminal".to_string(),
            r#type: "command".to_string(),
            target: "wt".to_string(),
            icon: Some("terminal".to_string()),
            enabled: true,
            description: Some("Open Terminal".to_string()),
            args: None,
            working_directory: None,
            shortcut: None,
            children: None,
        },
        Action {
            id: "ai-menu".to_string(),
            name: "AI".to_string(),
            r#type: "menu".to_string(),
            target: "".to_string(),
            icon: Some("sparkles".to_string()),
            enabled: true,
            description: Some("AI Tools & Assistants".to_string()),
            args: None,
            working_directory: None,
            shortcut: None,
            children: Some(vec![
                Action {
                    id: "ai-chatgpt".to_string(),
                    name: "ChatGPT".to_string(),
                    r#type: "url".to_string(),
                    target: "https://chatgpt.com".to_string(),
                    icon: Some("bot".to_string()),
                    enabled: true,
                    description: Some("Open ChatGPT".to_string()),
                    args: None,
                    working_directory: None,
                    shortcut: None,
                    children: None,
                },
                Action {
                    id: "ai-claude".to_string(),
                    name: "Claude".to_string(),
                    r#type: "url".to_string(),
                    target: "https://claude.ai".to_string(),
                    icon: Some("brain".to_string()),
                    enabled: true,
                    description: Some("Open Claude".to_string()),
                    args: None,
                    working_directory: None,
                    shortcut: None,
                    children: None,
                },
                Action {
                    id: "ai-gemini".to_string(),
                    name: "Gemini".to_string(),
                    r#type: "url".to_string(),
                    target: "https://gemini.google.com".to_string(),
                    icon: Some("sparkles".to_string()),
                    enabled: true,
                    description: Some("Open Gemini".to_string()),
                    args: None,
                    working_directory: None,
                    shortcut: None,
                    children: None,
                },
                Action {
                    id: "ai-perplexity".to_string(),
                    name: "Perplexity".to_string(),
                    r#type: "url".to_string(),
                    target: "https://perplexity.ai".to_string(),
                    icon: Some("search".to_string()),
                    enabled: true,
                    description: Some("Open Perplexity".to_string()),
                    args: None,
                    working_directory: None,
                    shortcut: None,
                    children: None,
                },
            ]),
        },
    ]
}

/// Save configuration to disk.
pub fn save_to_disk(config: &Config) -> Result<(), String> {
    let path = config_path();

    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent)
            .map_err(|error| format!("Failed to create config directory: {}", error))?;
    }

    let json = serde_json::to_string_pretty(config)
        .map_err(|error| format!("Failed to serialize configuration: {}", error))?;

    std::fs::write(&path, json)
        .map_err(|error| format!("Failed to write configuration: {}", error))?;

    println!("[Orbit] Configuration saved to {:?}", path);

    Ok(())
}

/// Initialize configuration.
pub fn init(app: &tauri::App) -> Result<(), String> {
    let config = load_rust_config();
    app.manage(ConfigState(Mutex::new(config)));
    println!("[Orbit] Configuration initialized");
    Ok(())
}

/// Update the enabled state.
pub fn set_enabled(app: &tauri::AppHandle, enabled: bool) -> Result<(), String> {
    let cfg_state = app.state::<ConfigState>();
    let mut config = cfg_state.0.lock().unwrap();

    config.settings.enabled = enabled;
    save_to_disk(&config)?;

    println!("[Orbit] Enabled state changed to {}", enabled);

    Ok(())
}



