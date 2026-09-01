use serde::{Deserialize, Serialize};

/// Action types supported by Orbit
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum ActionType {
    Application,
    URL,
    Folder,
    File,
    Command,
    Shortcut,
    Menu,
}

impl Default for ActionType {
    fn default() -> Self {
        ActionType::Application
    }
}

/// A configurable action that can be launched from the wheel
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Action {
    pub id: String,
    pub name: String,
    #[serde(rename = "type")]
    pub r#type: String,
    pub target: String,
    pub icon: Option<String>,
    pub enabled: bool,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub args: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub working_directory: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub shortcut: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub children: Option<Vec<Action>>,
}

impl Default for Action {
    fn default() -> Self {
        Self {
            id: "action-1".to_string(),
            name: "Default".to_string(),
            r#type: "application".to_string(),
            target: String::new(),
            icon: None,
            enabled: true,
            description: None,
            args: None,
            working_directory: None,
            shortcut: None,
            children: None,
        }
    }
}

/// A single wheel page with its own actions.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Default)]
#[serde(rename_all = "camelCase")]
pub struct WheelPage {
    pub id: String,
    pub name: String,
    pub icon: Option<String>,
    #[serde(rename = "type")]
    pub r#type: String,
    pub enabled: bool,
    pub items: Vec<Action>,
}

/// Configuration for Orbit
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Config {
    pub version: u32,
    pub settings: Settings,
    pub items: Vec<Action>,
    #[serde(default)]
    pub pages: Vec<WheelPage>,
    #[serde(default)]
    pub default_page_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Settings {
    pub enabled: bool,
    pub trigger: String,
    pub appearance: AppearanceSettings,
    pub wheel: WheelSettings,
    pub startup: StartupSettings,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct AppearanceSettings {
    pub theme: String,
    pub radius: f64,
    pub dead_zone: f64,
    #[serde(default = "default_item_size")]
    pub item_size: f64,
    #[serde(default = "default_icon_size")]
    pub icon_size: f64,
    #[serde(default = "default_true")]
    pub show_labels: bool,
    #[serde(default = "default_true")]
    pub show_center: bool,
    #[serde(default = "default_center_icon")]
    pub center_icon: String,
    #[serde(default = "default_wheel_style")]
    pub wheel_style: String,
    #[serde(default = "default_opacity")]
    pub opacity: f64,
    #[serde(default = "default_true")]
    pub border: bool,
    #[serde(default = "default_true")]
    pub blur: bool,
}

fn default_item_size() -> f64 {
    76.0
}
fn default_icon_size() -> f64 {
    30.0
}
fn default_true() -> bool {
    true
}
fn default_center_icon() -> String {
    "×".to_string()
}
fn default_wheel_style() -> String {
    "glass".to_string()
}
fn default_opacity() -> f64 {
    0.98
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct WheelSettings {
    pub enabled: bool,
    #[serde(default = "default_animation_speed")]
    pub animation_speed: f64,
    #[serde(default = "default_stagger_delay")]
    pub stagger_delay: f64,
    #[serde(default = "default_true")]
    pub enable_hover_animation: bool,
    #[serde(default = "default_true")]
    pub enable_stagger_animation: bool,
    #[serde(default = "default_true")]
    pub enable_nested_animation: bool,
}

fn default_animation_speed() -> f64 {
    180.0
}
fn default_stagger_delay() -> f64 {
    45.0
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct StartupSettings {
    pub start_with_os: bool,
    #[serde(default)]
    pub launch_settings_on_startup: bool,
}

impl Default for Config {
    fn default() -> Self {
        let default_page = WheelPage {
            id: "applications".to_string(),
            name: "Applications".to_string(),
            icon: Some("grid-3x3".to_string()),
            r#type: "launcher".to_string(),
            enabled: true,
            items: Vec::new(),
        };

        Self {
            version: 1,
            settings: Settings::default(),
            items: Vec::new(),
            pages: vec![default_page],
            default_page_id: Some("applications".to_string()),
        }
    }
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            enabled: true,
            trigger: "ctrl+space".to_string(),
            appearance: AppearanceSettings::default(),
            wheel: WheelSettings::default(),
            startup: StartupSettings::default(),
        }
    }
}

impl Default for AppearanceSettings {
    fn default() -> Self {
        Self {
            theme: "system".to_string(),
            radius: 180.0,
            dead_zone: 60.0,
            item_size: 76.0,
            icon_size: 30.0,
            show_labels: true,
            show_center: true,
            center_icon: "×".to_string(),
            wheel_style: "glass".to_string(),
            opacity: 0.98,
            border: true,
            blur: true,
        }
    }
}

impl Default for WheelSettings {
    fn default() -> Self {
        Self {
            enabled: true,
            animation_speed: 180.0,
            stagger_delay: 45.0,
            enable_hover_animation: true,
            enable_stagger_animation: true,
            enable_nested_animation: true,
        }
    }
}

impl Default for StartupSettings {
    fn default() -> Self {
        Self {
            start_with_os: false,
            launch_settings_on_startup: false,
        }
    }
}


