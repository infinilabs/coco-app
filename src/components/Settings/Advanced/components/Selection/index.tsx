import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";

import { useSelectionStore } from "@/stores/selectionStore";
import SettingsToggle from "@/components/Settings/SettingsToggle";
import SettingsItem from "@/components/Settings/SettingsItem";
import platformAdapter from "@/utils/platformAdapter";
import { useEnabledServers } from "@/hooks/useEnabledServers";
import ButtonsList from "./ButtonsList";
import HeaderToolbar from "@/components/Selection/HeaderToolbar";
import { ButtonConfig } from "./config";

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
    setToolbarConfig(buttons);
  }, [buttons]);

  return (
    <div className="space-y-6 py-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{t("selection.title")}</h2>
      </div>

      <div className="relative rounded-xl p-4 bg-gradient-to-r from-[#E6F0FA] to-[#FFF1F1]">
        <div className="flex items-center flex-col" aria-hidden="true">
          <div className="rounded-xl border border-gray-200 bg-white/70 shadow-sm dark:border-gray-700 dark:bg-gray-900/40">
            <HeaderToolbar
              buttons={buttons as any}
              iconsOnly={iconsOnly}
              onAction={() => {}}
              onLogoClick={() => {}}
            />
          </div>
        </div>
        <div
          className="absolute inset-0 bg-transparent cursor-not-allowed"
          aria-label={t("selection.preview.readonly")}
          tabIndex={-1}
        />
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
          <ButtonsList
            buttons={buttons}
            setButtons={setButtons}
            serverList={serverList}
          />
        </div>
      )}
    </div>
  );
};

export default SelectionSettings;
