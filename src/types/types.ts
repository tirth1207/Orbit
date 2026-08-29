export interface RadialWheelItem {
  id: string;
  name: string;
  type?: string;
  target?: string;
  icon?: string | null;
  enabled: boolean;
  children?: RadialWheelItem[];
}

export interface Action {
  id: string;
  name: string;
  type: string;
  target: string;
  icon: string | null;
  enabled: boolean;
  children?: Action[];
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
  items: Action[];
  theme: string;
}

export interface WheelState {
  open: boolean;
  selectedIndex: number;
  hoveredIndex: number | null;
  itemCount: number;
}