import { type AppConfig, type Action, type ActionType } from "../types/types";

const VALID_ACTION_TYPES: ActionType[] = [
  "application",
  "url",
  "command",
  "folder",
  "file",
  "menu",
];

export interface ValidationResult {
  valid: boolean;
  error?: string;
  normalizedConfig?: AppConfig;
}

export function validateAction(action: any, depth = 0): { valid: boolean; error?: string; normalized?: Action } {
  if (depth > 5) {
    return { valid: false, error: "Maximum action nesting depth (5) exceeded." };
  }

  if (typeof action !== "object" || action === null) {
    return { valid: false, error: "Action item must be an object." };
  }

  if (typeof action.id !== "string" || !action.id.trim()) {
    return { valid: false, error: "Action is missing a valid 'id'." };
  }

  if (typeof action.name !== "string" || !action.name.trim()) {
    return { valid: false, error: `Action '${action.id}' is missing a 'name'.` };
  }

  const actionType = String(action.type || "application").toLowerCase() as ActionType;
  if (!VALID_ACTION_TYPES.includes(actionType)) {
    return {
      valid: false,
      error: `Action '${action.name}' has invalid type '${action.type}'. Valid types: ${VALID_ACTION_TYPES.join(", ")}`,
    };
  }

  const target = typeof action.target === "string" ? action.target.trim() : "";
  if (actionType !== "menu" && !target) {
    return { valid: false, error: `Action '${action.name}' (${actionType}) requires a non-empty target path or URL.` };
  }

  if (actionType === "url") {
    if (!target.includes(".") && !target.startsWith("http://") && !target.startsWith("https://")) {
      return { valid: false, error: `Action '${action.name}' has an invalid URL format '${target}'.` };
    }
  }

  let normalizedChildren: Action[] | undefined = undefined;
  if (Array.isArray(action.children)) {
    normalizedChildren = [];
    for (const child of action.children) {
      const childRes = validateAction(child, depth + 1);
      if (!childRes.valid) {
        return childRes;
      }
      if (childRes.normalized) {
        normalizedChildren.push(childRes.normalized);
      }
    }
  }

  const normalized: Action = {
    id: action.id.trim(),
    name: action.name.trim(),
    type: actionType,
    target,
    icon: typeof action.icon === "string" ? action.icon : null,
    enabled: typeof action.enabled === "boolean" ? action.enabled : true,
    description: typeof action.description === "string" ? action.description : undefined,
    args: typeof action.args === "string" ? action.args : undefined,
    workingDirectory: typeof action.workingDirectory === "string" ? action.workingDirectory : undefined,
    children: normalizedChildren,
  };

  return { valid: true, normalized };
}

export function validateConfig(data: any): ValidationResult {
  if (typeof data !== "object" || data === null) {
    return { valid: false, error: "Configuration must be a valid JSON object." };
  }

  if (typeof data.enabled !== "boolean") {
    return { valid: false, error: "Configuration field 'enabled' must be a boolean." };
  }

  const radius = Number(data.radius);
  if (isNaN(radius) || radius < 50 || radius > 500) {
    return { valid: false, error: "Radius must be a number between 50px and 500px." };
  }

  const deadZone = Number(data.deadZone);
  if (isNaN(deadZone) || deadZone < 0 || deadZone > 200) {
    return { valid: false, error: "Dead zone must be a number between 0px and 200px." };
  }

  if (!Array.isArray(data.items)) {
    return { valid: false, error: "Configuration field 'items' must be an array of actions." };
  }

  const normalizedItems: Action[] = [];
  for (const item of data.items) {
    const actionRes = validateAction(item, 0);
    if (!actionRes.valid) {
      return { valid: false, error: actionRes.error };
    }
    if (actionRes.normalized) {
      normalizedItems.push(actionRes.normalized);
    }
  }

  const normalizedConfig: AppConfig = {
    enabled: Boolean(data.enabled),
    trigger: typeof data.trigger === "string" ? data.trigger : "ctrl+space",
    radius,
    deadZone,
    itemSize: Math.max(20, Math.min(200, Number(data.itemSize) || 76)),
    iconSize: Math.max(10, Math.min(100, Number(data.iconSize) || 30)),
    animationSpeed: Math.max(10, Math.min(2000, Number(data.animationSpeed) || 180)),
    staggerDelay: Math.max(0, Math.min(500, Number(data.staggerDelay) || 45)),
    showLabels: typeof data.showLabels === "boolean" ? data.showLabels : true,
    showCenter: typeof data.showCenter === "boolean" ? data.showCenter : true,
    centerIcon: typeof data.centerIcon === "string" ? data.centerIcon : "×",
    enableHoverAnimation: typeof data.enableHoverAnimation === "boolean" ? data.enableHoverAnimation : true,
    enableStaggerAnimation: typeof data.enableStaggerAnimation === "boolean" ? data.enableStaggerAnimation : true,
    enableNestedAnimation: typeof data.enableNestedAnimation === "boolean" ? data.enableNestedAnimation : true,
    startWithOs: typeof data.startWithOs === "boolean" ? data.startWithOs : false,
    launchSettingsOnStartup: typeof data.launchSettingsOnStartup === "boolean" ? data.launchSettingsOnStartup : false,
    wheelStyle: typeof data.wheelStyle === "string" ? data.wheelStyle : "glass",
    opacity: Math.max(0.1, Math.min(1.0, Number(data.opacity) || 0.98)),
    border: typeof data.border === "boolean" ? data.border : true,
    blur: typeof data.blur === "boolean" ? data.blur : true,
    items: normalizedItems,
    theme: typeof data.theme === "string" ? data.theme : "system",
    configPath: typeof data.configPath === "string" ? data.configPath : undefined,
  };

  return { valid: true, normalizedConfig };
}
