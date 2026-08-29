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
                Ok(config) => {
                    println!(
                        "[Orbit] Configuration loaded from {:?}",
                        path
                    );

                    config
                }

                Err(error) => {
                    eprintln!(
                        "[Orbit] Failed to parse configuration: {}",
                        error
                    );

                    eprintln!(
                        "[Orbit] Using default configuration"
                    );

                    Config::default()
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