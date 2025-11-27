import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { AssistantFetcher } from "@/components/Assistant/AssistantFetcher";
import { nanoid } from "nanoid";
import { Button } from "@/components/ui/button";
import { ButtonConfig, IconConfig, LUCIDE_ICON_MAP, LucideIconName } from "./config";
import * as LucideIcons from "lucide-react";

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
  const { t } = useTranslation();
  const { fetchAssistant } = AssistantFetcher({});

  const [label, setLabel] = useState("");
  const [iconType, setIconType] = useState<IconConfig["type"]>("lucide");
  const [lucideName, setLucideName] = useState<LucideIconName>("Bot");
  const [color, setColor] = useState<string>("#0287FF");
  const [dataUrl, setDataUrl] = useState<string>("");
  const [serverId, setServerId] = useState<string>("");
  const [assistantList, setAssistantList] = useState<any[]>([]);
  const [assistantId, setAssistantId] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

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

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setDataUrl(String(reader.result));
    reader.readAsDataURL(file);
  };

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
    const icon: IconConfig = iconType === "lucide" ? { type: "lucide", name: lucideName, color } : { type: "custom", dataUrl, color };
    const btn: ButtonConfig = {
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

  // 解析用户输入的 Lucide 图标名，支持大小写/连字符/下划线等格式
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

  // 预览图标组件
  const IconPreview = () => {
    const Comp = iconType === "lucide" ? resolveLucideIcon(lucideName) : null;
    return (
      <div className="flex items-center gap-3 rounded-[10px] p-3 bg-gray-100 dark:bg-neutral-800 border border-gray-200 dark:border-gray-700">
        {Comp ? (
          <Comp className="w-6 h-6" style={{ color }} />
        ) : (
          dataUrl ? (
            <img src={dataUrl} alt="icon" className="w-6 h-6 rounded" />
          ) : iconType === "lucide" ? (
            <div className="flex items-center gap-2">
              <LucideIcons.Bot className="w-6 h-6" style={{ color }} />
              <span className="text-xs text-muted-foreground">{t("common.notFound") || "未找到图标"}</span>
            </div>
          ) : (
            <div className="w-6 h-6 rounded bg-muted" />
          )
        )}
        <span className="text-sm font-medium text-foreground">{label || t("selection.custom.chat")}</span>
      </div>
    );
  };

  if (!open) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={handleClose}
    >
      <div 
        className="w-full max-w-lg rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-neutral-900 p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4">
          <h2 className="text-lg font-semibold leading-none tracking-tight text-foreground">{t("selection.custom.chat")}</h2>
          <p className="text-sm text-muted-foreground mt-1.5">{t("selection.bind.assistant")}</p>
        </div>

        <div className="space-y-4 py-2">
          <IconPreview />

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-muted-foreground">{t("selection.custom.namePlaceholder")}</label>
            <input
              className="flex h-9 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-neutral-800 px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 text-foreground"
              placeholder={t("selection.custom.namePlaceholder")}
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">{t("selection.icon.type")}</label>
              <select
                className="flex h-9 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-neutral-800 px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 text-foreground"
                value={iconType}
                onChange={(e) => setIconType(e.target.value as any)}
              >
                <option value="lucide">{t("selection.icon.type.lucide")}</option>
                <option value="custom">{t("selection.icon.type.custom")}</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">{t("selection.icon.color")}</label>
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
              <label className="text-sm font-medium text-muted-foreground">{iconType === "lucide" ? t("selection.icon.pick") : t("selection.icon.upload")}</label>
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
                    <p className="text-xs text-muted-foreground mt-1">{t("common.notFound") || "未找到图标名，试试 PascalCase，如: MessageCircle"}</p>
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

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">{t("selection.bind.service")}</label>
              <select
                className="flex h-9 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-neutral-800 px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 text-foreground"
                value={serverId}
                onChange={(e) => setServerId(e.target.value)}
              >
                <option value="" disabled>{t("selection.bind.defaultService")}</option>
                {serverList.map((s: any) => (
                  <option key={s.id} value={s.id}>
                    {s.name || s.endpoint || s.id}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">{t("selection.bind.assistant")}</label>
              <select
                className="flex h-9 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-neutral-800 px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 text-foreground"
                value={assistantId}
                onChange={(e) => setAssistantId(e.target.value)}
                disabled={loading || !serverId}
              >
                <option value="" disabled>{loading ? t("common.loading") : t("selection.bind.defaultAssistant")}</option>
                {!loading && assistantList.map((a: any) => (
                  <option key={a._id} value={a._id}>{a._source?.name || a._id}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <Button variant="secondary" onClick={handleClose}>{t("deleteDialog.button.cancel") ?? "Cancel"}</Button>
          <Button onClick={handleAdd}>{t("settings.shortcut.save") ?? "Save"}</Button>
        </div>
      </div>
    </div>
  );
}
