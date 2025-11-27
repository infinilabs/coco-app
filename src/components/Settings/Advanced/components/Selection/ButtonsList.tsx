import { useEffect, useRef, useState } from "react";
import {
  GripVertical,
  Bot,
  Copy,
  Languages,
  Search,
  Volume2,
  FileText,
} from "lucide-react";
import clsx from "clsx";
import { useTranslation } from "react-i18next";

import { AssistantFetcher } from "@/components/Assistant/AssistantFetcher";
import { setCurrentWindowService } from "@/commands/windowService";

type ActionType =
  | "search"
  | "ask_ai"
  | "translate"
  | "summary"
  | "copy"
  | "speak"
  | "custom";

type LucideIconName =
  | "Search"
  | "Bot"
  | "Languages"
  | "FileText"
  | "Copy"
  | "Volume2";

type IconConfig =
  | { type: "lucide"; name: LucideIconName; color?: string }
  | { type: "custom"; dataUrl: string; color?: string };

export type ButtonConfig = {
  id: string;
  label: string;
  icon: IconConfig;
  action: {
    type: ActionType;
    assistantId?: string;
    assistantServerId?: string;
    eventName?: string;
  };
  labelKey?: string;
};

const LUCIDE_ICON_MAP: Record<LucideIconName, any> = {
  Search,
  Bot,
  Languages,
  FileText,
  Copy,
  Volume2,
};

const ASSISTANT_CACHE_KEY = "assistant_list_cache";

type AssistantCacheItem = {
  list: any[];
  updatedAt: number;
};

function loadAssistantCache(): Record<string, AssistantCacheItem> {
  try {
    const raw = localStorage.getItem(ASSISTANT_CACHE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") return parsed;
    return {};
  } catch {
    return {};
  }
}

function saveAssistantCache(cache: Record<string, AssistantCacheItem>) {
  try {
    localStorage.setItem(ASSISTANT_CACHE_KEY, JSON.stringify(cache));
  } catch (e) {
    console.error("Persist assistant cache failed:", e);
  }
}

type ButtonsListProps = {
  buttons: ButtonConfig[];
  setButtons: React.Dispatch<React.SetStateAction<ButtonConfig[]>>;
  serverList: any[];
};

const ButtonsList = ({ buttons, setButtons, serverList }: ButtonsListProps) => {
  const { t } = useTranslation();
  const { fetchAssistant } = AssistantFetcher({});

  const [assistantByServer, setAssistantByServer] = useState<Record<string, any[]>>({});
  const [assistantLoadingByServer, setAssistantLoadingByServer] = useState<Record<string, boolean>>({});
  const [assistantCache, setAssistantCacheState] = useState<Record<string, AssistantCacheItem>>(() => loadAssistantCache());

  const dragIndexRef = useRef<number | null>(null);
  const initializedServiceRef = useRef<boolean>(false);

  const onDragStart = (index: number) => {
    dragIndexRef.current = index;
  };

  const onDrop = (index: number) => {
    const from = dragIndexRef.current;
    dragIndexRef.current = null;
    if (from === null || from === index) return;
    setButtons((prev) => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(index, 0, moved);
      return next;
    });
  };

  const updateAction = (id: string, patch: Partial<ButtonConfig["action"]>) => {
    setButtons((prev) => prev.map((b) => (b.id === id ? { ...b, action: { ...b.action, ...patch } } : b)));
  };

  const handleAssistantSelect = (btn: ButtonConfig, value: string) => {
    const id = value || undefined;
    updateAction(btn.id, { assistantId: id });
  };

  const handleServerSelect = async (btn: ButtonConfig, serverId: string) => {
    const sid = serverId || undefined;
    try {
      const target = serverList.find((s: any) => s.id === sid);
      if (target) {
        await setCurrentWindowService(target);
      }
    } catch (e) {
      console.error("setCurrentWindowService failed:", e);
    }
    updateAction(btn.id, { assistantServerId: sid, assistantId: undefined });
    if (!sid) return;

    const cached = assistantCache[sid];
    if (cached && Array.isArray(cached.list)) {
      setAssistantByServer((prev) => ({ ...prev, [sid]: cached.list }));
    }
    setAssistantLoadingByServer((prev) => ({ ...prev, [sid]: true }));
    try {
      const data = await fetchAssistant({ current: 1, pageSize: 1000, serverId: sid });
      const list = data.list || [];
      setAssistantByServer((prev) => ({ ...prev, [sid]: list }));
      const nextCache = { ...assistantCache, [sid]: { list, updatedAt: Date.now() } };
      setAssistantCacheState(nextCache);
      saveAssistantCache(nextCache);
    } catch (err) {
      console.error("Fetch assistants for server failed:", err);
      setAssistantByServer((prev) => ({ ...prev, [sid]: [] }));
    } finally {
      setAssistantLoadingByServer((prev) => ({ ...prev, [sid]: false }));
    }
  };

  useEffect(() => {
    if (initializedServiceRef.current) return;
    initializedServiceRef.current = true;

    const preferredSid =
      buttons.find((b) => b.action.assistantServerId)?.action.assistantServerId ||
      Object.keys(assistantCache)[0];

    if (!preferredSid) return;
    const target = serverList.find((s: any) => s.id === preferredSid);
    if (!target) return;

    setCurrentWindowService(target).catch((e) => {
      console.error("init setCurrentWindowService failed:", e);
    });
  }, [serverList, buttons]);

  useEffect(() => {
    const uniqueServerIds = Array.from(
      new Set(
        buttons
          .map((b) => b.action.assistantServerId)
          .filter((sid): sid is string => Boolean(sid))
      )
    );

    uniqueServerIds.forEach(async (sid) => {
      if (!sid) return;
      const cached = assistantCache[sid];
      if (cached && Array.isArray(cached.list)) {
        setAssistantByServer((prev) => ({ ...prev, [sid]: cached.list }));
      }
      setAssistantLoadingByServer((prev) => ({ ...prev, [sid]: true }));
      try {
        const data = await fetchAssistant({ current: 1, pageSize: 1000, serverId: sid });
        const list = data.list || [];
        setAssistantByServer((prev) => ({ ...prev, [sid]: list }));
        const nextCache = { ...assistantCache, [sid]: { list, updatedAt: Date.now() } };
        setAssistantCacheState(nextCache);
        saveAssistantCache(nextCache);
      } catch (err) {
        console.error("Prefetch assistants for stored server failed:", err);
      } finally {
        setAssistantLoadingByServer((prev) => ({ ...prev, [sid]: false }));
      }
    });
  }, [buttons]);

  return (
    <div className="space-y-3">
      {buttons.map((btn, index) => {
        const IconComp = btn.icon.type === "lucide" ? LUCIDE_ICON_MAP[btn.icon.name] : null;
        const isChat = ["ask_ai", "translate", "summary"].includes(btn.action.type);
        const visualType: "Chat" | "Search" | "Tool" = isChat ? "Chat" : btn.action.type === "search" ? "Search" : "Tool";

        return (
          <div
            key={btn.id}
            className={clsx(
              "rounded-lg border border-[#E5E7EB] dark:border-[#334155] bg-white dark:bg-[#0B1220] shadow-sm",
              "p-3"
            )}
            draggable
            onDragStart={() => onDragStart(index)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => onDrop(index)}
          >
            <div className="flex items-center gap-3">
              <GripVertical className="size-4 text-[#64748B] shrink-0" />
              {IconComp ? (
                <IconComp className="size-4 shrink-0" style={{ color: btn.icon.color || "#6B7280" }} />
              ) : (
                <img src={(btn.icon as any).dataUrl} alt="icon" className="w-4 h-4 rounded shrink-0" />
              )}
              <span className="text-sm font-medium">{btn.labelKey ? t(btn.labelKey) : btn.label}</span>
              <span
                className={clsx(
                  "ml-2 inline-flex items-center rounded px-2 py-0.5 text-xs",
                  visualType === "Chat"
                    ? "bg-[#0287FF]/10 text-[#0287FF]"
                    : visualType === "Search"
                    ? "bg-[#6366F1]/10 text-[#6366F1]"
                    : "bg-[#64748B]/10 text-[#64748B]"
                )}
              >
                {visualType}
              </span>

              <div className="ml-auto flex items-center gap-2">
                {isChat && (
                  <>
                    <select
                      className="rounded-md border px-2 py-1 text-sm bg-white dark:bg-[#0B1220] w-44"
                      value={btn.action.assistantServerId || ""}
                      onChange={(e) => handleServerSelect(btn, e.target.value)}
                      title={t("selection.bind.service")}
                    >
                      <option value="">{t("selection.bind.defaultService")}</option>
                      {serverList.map((s: any) => (
                        <option key={s.id} value={s.id}>
                          {s.name || s.endpoint || s.id}
                        </option>
                      ))}
                    </select>

                    {(() => {
                      const sid = btn.action.assistantServerId;
                      const list = (sid && assistantByServer[sid]) || [];
                      const loading = !!(sid && assistantLoadingByServer[sid]);
                      return (
                        <select
                          className="rounded-md border px-2 py-1 text-sm bg-white dark:bg-[#0B1220] w-44"
                          value={btn.action.assistantId || ""}
                          onChange={(e) => handleAssistantSelect(btn, e.target.value)}
                          title={t("selection.bind.assistant")}
                          disabled={loading}
                        >
                          <option value="">{t("selection.bind.defaultAssistant")}</option>
                          {loading && (
                            <option value="" disabled>
                              加载中...
                            </option>
                          )}
                          {list.map((a: any) => (
                            <option key={a._id} value={a._id}>
                              {a._source?.name || a._id}
                            </option>
                          ))}
                        </select>
                      );
                    })()}
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ButtonsList;