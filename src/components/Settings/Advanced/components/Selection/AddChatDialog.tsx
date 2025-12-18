import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { IconPicker } from "@infinilabs/custom-icons";
import type { IconConfig } from "@infinilabs/custom-icons";
import { nanoid } from "nanoid";

import { AssistantFetcher } from "@/components/Assistant/AssistantFetcher";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { ButtonConfig } from "./config";
import { useThemeStore } from "@/stores/themeStore";
import { useAppStore } from "@/stores/appStore";

export default function AddChatDialog({
  serverList,
  open,
  onOpenChange,
  onAdd,
}: {
  serverList: any[];
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onAdd: (btn: ButtonConfig) => void;
}) {
  const { t, i18n } = useTranslation();
  const { fetchAssistant } = AssistantFetcher({});

  const [label, setLabel] = useState("");
  const [iconType, setIconType] = useState<IconConfig["type"]>("lucide");
  const [lucideName, setLucideName] = useState<string>("Bot");
  const [color, setColor] = useState<string>("#0287FF");
  const [dataUrl, setDataUrl] = useState<string>("");
  const [serverId, setServerId] = useState<string>("");
  const [assistantList, setAssistantList] = useState<any[]>([]);
  const [assistantId, setAssistantId] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  const activeTheme = useThemeStore((state) => state.activeTheme);
  const language = useAppStore((state) => state.language);

  useEffect(() => {
    if (!serverId) {
      setAssistantList([]);
      return;
    }
    setLoading(true);
    fetchAssistant({ current: 1, pageSize: 1000, serverId })
      .then((data) => setAssistantList(data.list || []))
      .catch(() => setAssistantList([]))
      .finally(() => setLoading(false));
  }, [serverId]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) {
        handleClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  const reset = () => {
    setLabel("");
    setIconType("lucide");
    setLucideName("Bot");
    setColor("#0287FF");
    setDataUrl("");
    setServerId("");
    setAssistantList([]);
    setAssistantId("");
  };

  const handleClose = () => {
    onOpenChange(false);
    reset();
  };

  const handleAdd = () => {
    const id = `custom-${nanoid(8)}`;
    const icon: IconConfig =
      iconType === "lucide"
        ? { type: "lucide", name: lucideName, color }
        : { type: "custom", dataUrl, color };
    const btn: any = {
      id,
      label: label || t("selection.custom.chat"),
      icon,
      action: {
        type: "ask_ai",
        assistantServerId: serverId || undefined,
        assistantId: assistantId || undefined,
      },
    };
    onAdd(btn);
    handleClose();
  };

  const applyIconConfig = (cfg: IconConfig) => {
    if (cfg.type === "lucide") {
      setIconType("lucide");
      setLucideName(String(cfg.name || lucideName || "Bot"));
    } else {
      setIconType("custom");
      setDataUrl(String(cfg.dataUrl || dataUrl || ""));
    }
    if (cfg.color) {
      setColor(String(cfg.color));
    }
  };

  if (!open) return null;

  const currentLanguage = language || i18n.language;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={handleClose}
    >
      <div
        className="w-full max-w-lg rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4">
          <h2 className="text-lg font-semibold leading-none tracking-tight text-foreground">
            {t("selection.custom.chat")}
          </h2>
          <p className="text-sm text-muted-foreground mt-1.5">
            {t("selection.bind.assistant")}
          </p>
        </div>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-muted-foreground">
              {t("selection.custom.namePlaceholder")}
            </label>
            <input
              className="rounded-md px-2 py-1 text-sm bg-white dark:bg-[#0B1220] w-full border border-[#E6E8EF] dark:border-[#2E3644]"
              placeholder={t("selection.custom.namePlaceholder")}
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-muted-foreground">
              {t("selection.icon.pick")}
            </label>
            <IconPicker
              initial={
                iconType === "lucide"
                  ? { type: "lucide", name: lucideName, color }
                  : { type: "custom", dataUrl, color }
              }
              onChange={applyIconConfig}
              theme={activeTheme}
              locale={currentLanguage}
              showLibraryLink={false}
              controls={{
                color: false,
                size: false,
              }}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">
                {t("selection.bind.service")}
              </label>
              <Select
                value={serverId}
                onValueChange={(v) => setServerId(v === "__default__" ? "" : v)}
              >
                <SelectTrigger className="h-8 w-full">
                  <SelectValue className="truncate" placeholder={t("selection.bind.defaultService") as string} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__default__" disabled>
                    {t("selection.bind.defaultService")}
                  </SelectItem>
                  {serverList.map((s: any) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name || s.endpoint || s.id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">
                {t("selection.bind.assistant")}
              </label>
              <Select
                value={assistantId}
                onValueChange={(v) => setAssistantId(v === "__default__" ? "" : v)}
                disabled={loading || !serverId}
              >
                <SelectTrigger className="h-8 w-full">
                  <SelectValue
                    className="truncate"
                    placeholder={
                      (loading
                        ? t("common.loading")
                        : t("selection.bind.defaultAssistant")) as string
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {!loading && (
                    <SelectItem value="__default__">
                      {t("selection.bind.defaultAssistant")}
                    </SelectItem>
                  )}
                  {!loading &&
                    assistantList.map((a: any) => (
                      <SelectItem key={a._id} value={a._id}>
                        {a._source?.name || a._id}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <Button variant="secondary" onClick={handleClose}>
            {t("deleteDialog.button.cancel") ?? "Cancel"}
          </Button>
          <Button onClick={handleAdd}>
            {t("settings.shortcut.save") ?? "Save"}
          </Button>
        </div>
      </div>
    </div>
  );
}
