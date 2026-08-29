use serde::{Deserialize, Serialize};

/// Action types supported by Orbit
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum ActionType {
    Application,
    URL,
    Folder,
    File,
    Command,
}

/// A configurable action that can be launched from the wheel
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct Action {
    pub id: String,
    pub name: String,
    #[serde(rename = "type")]
    pub r#type: ActionType,
    pub target: String,
    pub icon: Option<String>,
    pub enabled: bool,
    pub description: Option<String>,
}

impl Default for Action {
    fn default() -> Self {
        Self {
            id: "action-1".to_string(),
            name: "Default".to_string(),
            r#type: ActionType::Application,
            target: String::new(),
            icon: None,
            enabled: true,
            description: None,
        }
    }
}

/// Configuration for Orbit
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct Config {
    pub version: u32,
    pub settings: Settings,
    pub items: Vec<Action>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct Settings {
    pub enabled: bool,
    pub trigger: TriggerSettings,
    pub appearance: AppearanceSettings,
    pub wheel: WheelSettings,
    pub startup: StartupSettings,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct TriggerSettings {
    pub r#type: TriggerType,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum TriggerType {
    MiddleMouse,
    KeyboardShortcut,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct AppearanceSettings {
    pub theme: Theme,
    pub radius: f64,
    pub dead_zone: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum Theme {
    System,
    Light,
    Dark,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct WheelSettings {
    pub enabled: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct StartupSettings {
    pub start_with_os: bool,
}

impl Default for Config {
    fn default() -> Self {
        Self {
            version: 1,
            settings: Settings::default(),
            items: Vec::new(),
        }
    }
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            enabled: true,
            trigger: TriggerSettings {
                r#type: TriggerType::MiddleMouse,
            },
            appearance: AppearanceSettings {
                theme: Theme::System,
                radius: 180.0,
                dead_zone: 60.0,
            },
            wheel: WheelSettings { enabled: true },
            startup: StartupSettings { start_with_os: false },
        }
    }
}

impl Default for AppearanceSettings {
    fn default() -> Self {
        Self {
            theme: Theme::System,
            radius: 180.0,
            dead_zone: 60.0,
        }
    }
}