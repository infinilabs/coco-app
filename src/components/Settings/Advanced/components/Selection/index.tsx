import { useEffect, useRef, useState } from "react";
import {
  GripVertical,
  Bot,
  Copy,
  Languages,
  Search,
  Volume2,
  FileText,
  Sparkles,
} from "lucide-react";
import clsx from "clsx";
import { useTranslation } from "react-i18next";

import { AssistantFetcher } from "@/components/Assistant/AssistantFetcher";
import { useSelectionStore } from "@/stores/selectionStore";
import SettingsToggle from "@/components/Settings/SettingsToggle";
import SettingsItem from "@/components/Settings/SettingsItem";
import platformAdapter from "@/utils/platformAdapter";
import { useEnabledServers } from "@/hooks/useEnabledServers";

/**
 * Selection toolbar button config types
 */
type IconConfig =
  | { type: "lucide"; name: LucideIconName; color?: string }
  | { type: "custom"; dataUrl: string; color?: string };

type ActionType =
  | "search"
  | "ask_ai"
  | "translate"
  | "summary"
  | "copy"
  | "speak"
  | "custom";

type ButtonConfig = {
  id: string;
  label: string;
  icon: IconConfig;
  action: {
    type: ActionType;
    assistantId?: string;
    assistantServerId?: string;
    eventName?: string;
  };
  // i18n key for built-in labels; if present, render by t(labelKey)
  labelKey?: string;
};

type LucideIconName =
  | "Search"
  | "Bot"
  | "Languages"
  | "FileText"
  | "Copy"
  | "Volume2";

const LUCIDE_ICON_MAP: Record<LucideIconName, any> = {
  Search,
  Bot,
  Languages,
  FileText,
  Copy,
  Volume2,
};

const DEFAULT_CONFIG: ButtonConfig[] = [
  {
    id: "search",
    label: "搜索",
    labelKey: "selection.actions.search",
    icon: { type: "lucide", name: "Search", color: "#6366F1" },
    action: { type: "search" },
  },
  {
    id: "ask_ai",
    label: "问答",
    labelKey: "selection.actions.ask_ai",
    icon: { type: "lucide", name: "Bot", color: "#0287FF" },
    action: { type: "ask_ai" },
  },
  {
    id: "translate",
    label: "翻译",
    labelKey: "selection.actions.translate",
    icon: { type: "lucide", name: "Languages", color: "#14B8A6" },
    action: { type: "translate" },
  },
  {
    id: "summary",
    label: "总结",
    labelKey: "selection.actions.summary",
    icon: { type: "lucide", name: "FileText", color: "#0EA5E9" },
    action: { type: "summary" },
  },
  {
    id: "copy",
    label: "复制",
    labelKey: "selection.actions.copy",
    icon: { type: "lucide", name: "Copy", color: "#64748B" },
    action: { type: "copy" },
  },
  {
    id: "speak",
    label: "朗读",
    labelKey: "selection.actions.speak",
    icon: { type: "lucide", name: "Volume2", color: "#F59E0B" },
    action: { type: "speak" },
  },
];

const STORAGE_KEY = "selection_toolbar_config";

/**
 * Utilities: load/save local toolbar config
 */
function loadToolbarConfig(): ButtonConfig[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_CONFIG;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0)
      return parsed as ButtonConfig[];
    return DEFAULT_CONFIG;
  } catch {
    return DEFAULT_CONFIG;
  }
}
function saveToolbarConfig(cfg: ButtonConfig[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
}

/**
 * Selection settings panel: toolbar buttons with sorting and assistant mapping
 */
const SelectionSettings = () => {
  const { t } = useTranslation();
  // Reactive service and assistant list
  const { enabledServers: serverList } = useEnabledServers();

  const selectionEnabled = useSelectionStore((state) => state.selectionEnabled);
  const iconsOnly = useSelectionStore((state) => state.iconsOnly);
  const setIconsOnly = useSelectionStore((state) => state.setIconsOnly);

  useEffect(() => {
    useSelectionStore.getState().initSync();
  }, []);

  // Assistant fetcher
  const { fetchAssistant } = AssistantFetcher({});

  // Cache assistants per server for per-button selection
  const [assistantByServer, setAssistantByServer] = useState<Record<string, any[]>>({});

  // Initialize from global store; write back on change for multi-window sync
  const toolbarConfig = useSelectionStore((s) => s.toolbarConfig);
  const setToolbarConfig = useSelectionStore((s) => s.setToolbarConfig);

  const [buttons, setButtons] = useState<ButtonConfig[]>(() =>
    loadToolbarConfig()
  );

  useEffect(() => {
    // prefer store config if present
    if (Array.isArray(toolbarConfig) && toolbarConfig.length > 0) {
      setButtons(toolbarConfig as ButtonConfig[]);
    }
  }, []);

  useEffect(() => {
    saveToolbarConfig(buttons);
    setToolbarConfig(buttons); // push to store for multi-window
  }, [buttons]);
  const dragIndexRef = useRef<number | null>(null);

  // Persist toolbar config on change
  useEffect(() => {
    saveToolbarConfig(buttons);
  }, [buttons]);

  useEffect(() => {
    saveToolbarConfig(buttons);
  }, [buttons]);

  // Native HTML5 drag and drop
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

  // Update action (used by assistant selection)
  const updateAction = (id: string, patch: Partial<ButtonConfig["action"]>) => {
    setButtons((prev) =>
      prev.map((b) =>
        b.id === id ? { ...b, action: { ...b.action, ...patch } } : b
      )
    );
  };

  // Store selected assistant both locally and in global search store
  const handleAssistantSelect = (btn: ButtonConfig, value: string) => {
    const id = value || undefined;
    updateAction(btn.id, { assistantId: id });
  };

  // Handle server selection per button and fetch its assistants
  const handleServerSelect = async (btn: ButtonConfig, serverId: string) => {
    console.log("1111111", btn, serverId);
    const sid = serverId || undefined;
    // When changing server, clear assistantId to avoid mismatched binding
    updateAction(btn.id, { assistantServerId: sid, assistantId: undefined });
    if (!sid) return;
    try {
      const data = await fetchAssistant({ current: 1, pageSize: 1000, serverId: sid });
      console.log("2222222", sid, data);
      setAssistantByServer((prev) => ({ ...prev, [sid]: data.list || [] }));
    } catch (err) {
      console.error("Fetch assistants for server failed:", err);
      setAssistantByServer((prev) => ({ ...prev, [sid]: [] }));
    }
  };

  // Prefetch assistants for buttons that already have server selection
  useEffect(() => {
    const uniqueServerIds = Array.from(
      new Set(
        buttons
          .map((b) => b.action.assistantServerId)
          .filter((sid): sid is string => Boolean(sid))
      )
    );
    uniqueServerIds.forEach(async (sid) => {
      if (!sid || assistantByServer[sid]) return;
      try {
        const data = await fetchAssistant({ current: 1, pageSize: 1000, serverId: sid });
        setAssistantByServer((prev) => ({ ...prev, [sid]: data.list || [] }));
      } catch (err) {
        console.error("Prefetch assistants for stored server failed:", err);
      }
    });
  }, [buttons]);

  return (
    <div className="space-y-6 py-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{t("selection.title")}</h2>
      </div>

      <SettingsItem
        icon={Sparkles}
        title={t("settings.ai.title")}
        description={t("settings.ai.description")}
      >
        <SettingsToggle
          checked={selectionEnabled}
          onChange={async (value) => {
            try {
              await platformAdapter.invokeBackend("set_selection_enabled", {
                enabled: value,
              });
            } catch (e) {
              console.error("set_selection_enabled invoke failed:", e);
            }
          }}
          label={t("settings.ai.toggle")}
        />
      </SettingsItem>

      {selectionEnabled && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <SettingsItem
              icon={Sparkles}
              title={t("selection.display.title")}
              description={t("selection.display.iconsOnlyDesc")}
            >
              <SettingsToggle
                checked={iconsOnly}
                onChange={async (value) => {
                  // Update local store
                  setIconsOnly(value);
                }}
                label={t("selection.display.iconsOnlyLabel")}
              />
            </SettingsItem>
          <div className="space-y-3">
            {buttons.map((btn, index) => {
              const IconComp =
                btn.icon.type === "lucide"
                  ? LUCIDE_ICON_MAP[btn.icon.name]
                  : null;

              const isChat = ["ask_ai", "translate", "summary"].includes(
                btn.action.type
              );
              const visualType: "Chat" | "Search" | "Tool" = isChat
                ? "Chat"
                : btn.action.type === "search"
                ? "Search"
                : "Tool";

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
                      <IconComp
                        className="size-4 shrink-0"
                        style={{ color: btn.icon.color || "#6B7280" }}
                      />
                    ) : (
                      <img
                        src={(btn.icon as any).dataUrl}
                        alt="icon"
                        className="w-4 h-4 rounded shrink-0"
                      />
                    )}
                    {/* label: prefer i18n if labelKey is present */}
                    <span className="text-sm font-medium">
                      {btn.labelKey ? t(btn.labelKey) : btn.label}
                    </span>

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
                          {/* Service selection */}
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

                          {/* Assistant selection bound to chosen service */}
                          {(() => {
                            const sid = btn.action.assistantServerId;
                            const list = sid && assistantByServer[sid] || [];
                            return (
                              <select
                                className="rounded-md border px-2 py-1 text-sm bg-white dark:bg-[#0B1220] w-44"
                                value={btn.action.assistantId || ""}
                                onChange={(e) => handleAssistantSelect(btn, e.target.value)}
                                title={t("selection.bind.assistant")}
                              >
                                <option value="">{t("selection.bind.defaultAssistant")}</option>
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
        </div>
      )}
    </div>
  );
};

export default SelectionSettings;
