export type ActionType =
  | "application"
  | "url"
  | "command"
  | "folder"
  | "file"
  | "menu";

export type WheelPageType = "launcher" | "music" | "system" | "custom";

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
  shortcut?: string;
  children?: Action[];
}

export interface WheelPage {
  id: string;
  name: string;
  icon?: string | null;
  type: WheelPageType | string;
  enabled: boolean;
  items: Action[];
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
  shortcut?: string;
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
  version: number;
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
  pages: WheelPage[];
  items: Action[];
  theme: string;
  configPath?: string;
  defaultPageId?: string;
}

export interface WheelState {
  open: boolean;
  selectedIndex: number;
  hoveredIndex: number | null;
  itemCount: number;
}

export const createDefaultAction = (override: Partial<Action> = {}): Action => ({
  id: override.id ?? `action-${Math.random().toString(36).slice(2, 8)}`,
  name: override.name ?? "Action",
  type: override.type ?? "application",
  target: override.target ?? "",
  icon: override.icon ?? null,
  enabled: override.enabled ?? true,
  description: override.description,
  args: override.args,
  workingDirectory: override.workingDirectory,
  shortcut: override.shortcut,
  children: override.children?.map((child) => createDefaultAction(child)),
});

export const normalizeAction = (action: Partial<Action> | null | undefined): Action => {
  const safeAction = action ?? {};
  return createDefaultAction({
    ...safeAction,
    children: Array.isArray(safeAction.children)
      ? safeAction.children.map((child) => normalizeAction(child))
      : undefined,
  });
};

export const normalizePage = (page: Partial<WheelPage> | null | undefined, fallbackIndex = 0): WheelPage => ({
  id: page?.id ?? `page-${fallbackIndex}`,
  name: page?.name ?? `Page ${fallbackIndex + 1}`,
  icon: page?.icon ?? null,
  type: page?.type ?? "launcher",
  enabled: page?.enabled ?? true,
  items: Array.isArray(page?.items) ? page.items.map((item) => normalizeAction(item)) : [],
});

export const buildPageFromItems = (items: Action[] = [], fallbackName = "Applications"): WheelPage => ({
  id: "launcher",
  name: fallbackName,
  icon: "grid-3x3",
  type: "launcher",
  enabled: true,
  items: items.map((item) => normalizeAction(item)),
});

export const createMusicPage = (): WheelPage => ({
  id: "music",
  name: "Music",
  icon: "music-2",
  type: "music",
  enabled: true,
  items: [
    { id: "music-play", name: "Play", type: "media", target: "playpause", icon: "play", enabled: true },
    { id: "music-next", name: "Next", type: "media", target: "next", icon: "skip-forward", enabled: true },
    { id: "music-repeat", name: "Repeat", type: "media", target: "repeat", icon: "repeat", enabled: true },
    { id: "music-shuffle", name: "Shuffle", type: "media", target: "shuffle", icon: "shuffle", enabled: true },
    { id: "music-previous", name: "Previous", type: "media", target: "previous", icon: "skip-back", enabled: true },
  ],
});

export const migrateAppConfig = (input: Partial<AppConfig> | Record<string, unknown> | null | undefined): AppConfig => {
  const source = (input ?? {}) as Partial<AppConfig> & Record<string, unknown>;

  const legacyItems = Array.isArray(source.items)
    ? source.items.map((item) => normalizeAction(item as Partial<Action>))
    : [];
  const rawPages = Array.isArray(source.pages) ? source.pages : [];
  const migratedPages = rawPages.length
    ? rawPages.map((page, index) => normalizePage(page as Partial<WheelPage>, index))
    : [buildPageFromItems(legacyItems)];

  const pages = migratedPages.some((page) => page.id === "music")
    ? migratedPages
    : [createMusicPage(), ...migratedPages];
  const mergedItems = pages.flatMap((page) => page.items);

  return {
    version: 2,
    enabled: typeof source.enabled === "boolean" ? source.enabled : true,
    trigger: typeof source.trigger === "string" ? source.trigger : "ctrl+space",
    radius: typeof source.radius === "number" ? source.radius : 180,
    deadZone: typeof source.deadZone === "number" ? source.deadZone : 60,
    itemSize: typeof source.itemSize === "number" ? source.itemSize : 76,
    iconSize: typeof source.iconSize === "number" ? source.iconSize : 30,
    animationSpeed: typeof source.animationSpeed === "number" ? source.animationSpeed : 180,
    staggerDelay: typeof source.staggerDelay === "number" ? source.staggerDelay : 45,
    showLabels: typeof source.showLabels === "boolean" ? source.showLabels : true,
    showCenter: typeof source.showCenter === "boolean" ? source.showCenter : true,
    centerIcon: typeof source.centerIcon === "string" ? source.centerIcon : "×",
    enableHoverAnimation: typeof source.enableHoverAnimation === "boolean" ? source.enableHoverAnimation : true,
    enableStaggerAnimation: typeof source.enableStaggerAnimation === "boolean" ? source.enableStaggerAnimation : true,
    enableNestedAnimation: typeof source.enableNestedAnimation === "boolean" ? source.enableNestedAnimation : true,
    startWithOs: typeof source.startWithOs === "boolean" ? source.startWithOs : false,
    launchSettingsOnStartup: typeof source.launchSettingsOnStartup === "boolean" ? source.launchSettingsOnStartup : false,
    wheelStyle: typeof source.wheelStyle === "string" ? source.wheelStyle : "glass",
    opacity: typeof source.opacity === "number" ? source.opacity : 0.98,
    border: typeof source.border === "boolean" ? source.border : true,
    blur: typeof source.blur === "boolean" ? source.blur : true,
    pages,
    items: mergedItems,
    theme: typeof source.theme === "string" ? source.theme : "system",
    configPath: typeof source.configPath === "string" ? source.configPath : undefined,
    defaultPageId: "music",
  };
};



