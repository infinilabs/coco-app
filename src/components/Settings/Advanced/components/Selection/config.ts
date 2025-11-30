import {
  Bot,
  Copy,
  FileText,
  Languages,
  Search,
  Volume2,
} from "lucide-react";
import * as LucideIcons from "lucide-react";

export type ActionType =
  | "search"
  | "ask_ai"
  | "translate"
  | "summary"
  | "copy"
  | "speak"
  | "custom";

export type LucideIconName = string;

export type IconConfig =
  | { type: "lucide"; name: LucideIconName; color?: string }
  | { type: "custom"; dataUrl: string; color?: string };

export type ActionConfig = {
  type: ActionType;
  assistantId?: string;
  assistantServerId?: string;
  eventName?: string;
};

export type ButtonConfig = {
  id: string;
  label: string;
  icon: IconConfig;
  action: ActionConfig;
  labelKey?: string;
};

export const LUCIDE_ICON_MAP: Record<string, any> = {
  Search,
  Bot,
  Languages,
  FileText,
  Copy,
  Volume2,
};

export function resolveLucideIcon(name?: string): any {
  if (!name) return (LucideIcons as any)["Search"] || Search;
  const direct = (LucideIcons as any)[name];
  if (direct) return direct;
  const normalized = String(name)
    .trim()
    .replace(/[-_\s]+/g, " ")
    .split(" ")
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join("");
  return (LucideIcons as any)[normalized] || (LUCIDE_ICON_MAP as any)[normalized] || null;
}
