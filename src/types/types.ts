export interface Action {
  id: string;
  name: string;
  type: string;
  target: string;
  icon: string | null;
  enabled: boolean;
}

export interface WheelItemProps {
  id: string;
  name: string;
  type: string;
  target: string;
  icon: string | null;
  enabled: boolean;
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