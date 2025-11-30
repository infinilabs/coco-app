import { useState } from "react";
import { useTranslation } from "react-i18next";
import * as LucideIcons from "lucide-react";

import {
  IconConfig,
  LUCIDE_ICON_MAP,
  LucideIconName,
} from "./config";

export default function AddChatDialog() {
  const { t } = useTranslation();
  const [label, setLabel] = useState("");
  const [iconType, setIconType] = useState<IconConfig["type"]>("lucide");
  const [lucideName, setLucideName] = useState<LucideIconName>("Bot");
  const [color, setColor] = useState<string>("#0287FF");
  const [dataUrl, setDataUrl] = useState<string>("");

  const resolveLucideIcon = (name: string) => {
    if (!name) return null;
    let Comp = (LucideIcons as any)[name];
    if (Comp) return Comp;
    const normalized = name
      .trim()
      .replace(/[-_\s]+/g, " ")
      .split(" ")
      .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
      .join("");
    return (LucideIcons as any)[normalized] || null;
  };

  const IconPreview = () => {
    const Comp = iconType === "lucide" ? resolveLucideIcon(lucideName) : null;
    return (
      <div className="flex items-center gap-3 rounded-[10px] p-3 bg-gray-100 dark:bg-neutral-800 border border-gray-200 dark:border-gray-700">
        {Comp ? (
          <Comp className="w-6 h-6" style={{ color }} />
        ) : dataUrl ? (
          <img src={dataUrl} alt="icon" className="w-6 h-6 rounded" />
        ) : iconType === "lucide" ? (
          <div className="flex items-center gap-2">
            <LucideIcons.Bot className="w-6 h-6" style={{ color }} />
            <span className="text-xs text-muted-foreground">
              {t("common.notFound")}
            </span>
          </div>
        ) : (
          <div className="w-6 h-6 rounded bg-muted" />
        )}
        <span className="text-sm font-medium text-foreground">
          {label || t("selection.custom.chat")}
        </span>
      </div>
    );
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setDataUrl(String(reader.result));
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-4 py-2">
      <IconPreview />

      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-muted-foreground">
            {t("selection.icon.type")}
          </label>
          <select
            className="flex h-9 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-neutral-800 px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 text-foreground"
            value={iconType}
            onChange={(e) => setIconType(e.target.value as any)}
          >
            <option value="lucide">{t("selection.icon.lucide")}</option>
            <option value="custom">{t("selection.icon.custom")}</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-muted-foreground">
            {t("selection.icon.color")}
          </label>
          <div className="flex items-center gap-2 h-9 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-neutral-800 px-2">
            <input
              type="color"
              className="h-6 w-full cursor-pointer bg-transparent border-none p-0"
              value={color}
              onChange={(e) => setColor(e.target.value)}
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-muted-foreground">
            {iconType === "lucide"
              ? t("selection.icon.pick")
              : t("selection.icon.upload")}
          </label>
          {iconType === "lucide" ? (
            <>
              <input
                list="lucide-icons"
                className="flex h-9 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-neutral-800 px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 text-foreground"
                value={lucideName}
                onChange={(e) => setLucideName(e.target.value as any)}
                placeholder="如: Bot, Search, Clipboard..."
              />
              <datalist id="lucide-icons">
                {Object.keys(LUCIDE_ICON_MAP).map((name) => (
                  <option key={name} value={name} />
                ))}
              </datalist>
              {!resolveLucideIcon(lucideName) && (
                <p className="text-xs text-muted-foreground mt-1">
                  {t("common.notFound")}
                </p>
              )}
            </>
          ) : (
            <input
              type="file"
              accept="image/*"
              onChange={onFileChange}
              className="flex h-9 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-neutral-800 px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 pt-1.5 text-foreground"
            />
          )}
        </div>
      </div>
    </div>
  );
}
