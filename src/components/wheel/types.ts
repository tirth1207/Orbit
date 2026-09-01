import type { Action } from "../../types/types";

export type WheelPageType = "launcher" | "music" | "system" | "custom";

export interface WheelPage {
  id: string;
  name: string;
  icon?: string | null;
  type: WheelPageType | string;
  enabled: boolean;
  items: Action[];
}

export interface WheelItemData extends Action {
  children?: WheelItemData[];
}

export interface RadialWheelProps {
  pages: WheelPage[];
  currentPageId: string;
  config: {
    radius: number;
    deadZone: number;
    itemSize?: number;
    iconSize?: number;
    showLabels?: boolean;
    showCenter?: boolean;
    centerIcon?: string;
    enableHoverAnimation?: boolean;
    enableStaggerAnimation?: boolean;
    enableNestedAnimation?: boolean;
    animationSpeed?: number;
    staggerDelay?: number;
    opacity?: number;
    border?: boolean;
    blur?: boolean;
  };
  onPageChange: (nextPageId: string) => void;
  onItemSelect: (index: number, childIndex?: number, item?: Action) => void;
  onItemHover: (index: number | null, childIndex?: number | null) => void;
  onClose: () => void;
}
