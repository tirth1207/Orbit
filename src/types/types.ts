export type ActionType =
  | "application"
  | "url"
  | "command"
  | "folder"
  | "file"
  | "menu";

export interface Action {
  id: string;
  name: string;
  type: ActionType | string;
  target: string;
  icon?: string | null;
  enabled: boolean;
  description?: string;
  args?: string;
  workingDirectory?: string;
  children?: Action[];
}

export interface RadialWheelItem {
  id: string;
  name: string;
  type?: string;
  target?: string;
  icon?: string | null;
  enabled: boolean;
  description?: string;
  args?: string;
  workingDirectory?: string;
  children?: RadialWheelItem[];
}

export interface WheelItemProps {
  id: string;
  name: string;
  type?: string;
  target?: string;
  icon?: string | null;
  enabled: boolean;
  children?: WheelItemProps[];
}

export interface AppConfig {
  enabled: boolean;
  trigger: string;
  radius: number;
  deadZone: number;
  itemSize: number;
  iconSize: number;
  animationSpeed: number;
  staggerDelay: number;
  showLabels: boolean;
  showCenter: boolean;
  centerIcon: string;
  enableHoverAnimation: boolean;
  enableStaggerAnimation: boolean;
  enableNestedAnimation: boolean;
  startWithOs: boolean;
  launchSettingsOnStartup: boolean;
  wheelStyle: string;
  opacity: number;
  border: boolean;
  blur: boolean;
  items: Action[];
  theme: string;
  configPath?: string;
}

export interface WheelState {
  open: boolean;
  selectedIndex: number;
  hoveredIndex: number | null;
  itemCount: number;
}



