import { useTranslation } from "react-i18next";
import { Command, RotateCcw } from "lucide-react";
import { useEffect } from "react";

import { formatKey } from "@/utils/keyboardUtils";
import SettingsItem from "@/components/Settings/SettingsItem";
import { isMac } from "@/utils/platform";
import {
  INITIAL_MODE_SWITCH,
  INITIAL_RETURN_TO_INPUT,
  // INITIAL_VOICE_INPUT,
  // INITIAL_ADD_FILE,
  INITIAL_DEEP_THINKING,
  INITIAL_INTERNET_SEARCH,
  INITIAL_INTERNET_SEARCH_SCOPE,
  INITIAL_MCP_SEARCH,
  INITIAL_MCP_SEARCH_SCOPE,
  INITIAL_HISTORICAL_RECORDS,
  INITIAL_AI_ASSISTANT,
  INITIAL_NEW_SESSION,
  INITIAL_FIXED_WINDOW,
  INITIAL_SERVICE_LIST,
  INITIAL_EXTERNAL,
  useShortcutsStore,
  INITIAL_AI_OVERVIEW,
} from "@/stores/shortcutsStore";
import { ModifierKey } from "@/types/index";
import platformAdapter from "@/utils/platformAdapter";
import { useAppStore } from "@/stores/appStore";
import SettingsInput from "@/components/Settings/SettingsInput";
import { Button } from "@headlessui/react";
import clsx from "clsx";

export const modifierKeys: ModifierKey[] = isMac
  ? ["meta", "ctrl"]
  : ["ctrl", "alt"];

const Shortcuts = () => {
  const { t } = useTranslation();
  const modifierKey = useShortcutsStore((state) => state.modifierKey);
  const setModifierKey = useShortcutsStore((state) => state.setModifierKey);
  const modeSwitch = useShortcutsStore((state) => state.modeSwitch);
  const setModeSwitch = useShortcutsStore((state) => state.setModeSwitch);
  const returnToInput = useShortcutsStore((state) => state.returnToInput);
  const setReturnToInput = useShortcutsStore((state) => state.setReturnToInput);
  // const voiceInput = useShortcutsStore((state) => state.voiceInput);
  // const setVoiceInput = useShortcutsStore((state) => state.setVoiceInput);
  // const addFile = useShortcutsStore((state) => state.addFile);
  // const setAddFile = useShortcutsStore((state) => state.setAddFile);
  const deepThinking = useShortcutsStore((state) => state.deepThinking);
  const setDeepThinking = useShortcutsStore((state) => state.setDeepThinking);
  const internetSearch = useShortcutsStore((state) => state.internetSearch);
  const setInternetSearch = useShortcutsStore((state) => {
    return state.setInternetSearch;
  });
  const internetSearchScope = useShortcutsStore((state) => {
    return state.internetSearchScope;
  });
  const setInternetSearchScope = useShortcutsStore((state) => {
    return state.setInternetSearchScope;
  });
  const mcpSearch = useShortcutsStore((state) => state.mcpSearch);
  const setMcpSearch = useShortcutsStore((state) => {
    return state.setMcpSearch;
  });
  const mcpSearchScope = useShortcutsStore((state) => {
    return state.mcpSearchScope;
  });
  const setMcpSearchScope = useShortcutsStore((state) => {
    return state.setMcpSearchScope;
  });
  const historicalRecords = useShortcutsStore((state) => {
    return state.historicalRecords;
  });
  const setHistoricalRecords = useShortcutsStore((state) => {
    return state.setHistoricalRecords;
  });
  const aiAssistant = useShortcutsStore((state) => {
    return state.aiAssistant;
  });
  const setAiAssistant = useShortcutsStore((state) => {
    return state.setAiAssistant;
  });
  const newSession = useShortcutsStore((state) => state.newSession);
  const setNewSession = useShortcutsStore((state) => state.setNewSession);
  const fixedWindow = useShortcutsStore((state) => state.fixedWindow);
  const setFixedWindow = useShortcutsStore((state) => state.setFixedWindow);
  const serviceList = useShortcutsStore((state) => state.serviceList);
  const setServiceList = useShortcutsStore((state) => state.setServiceList);
  const external = useShortcutsStore((state) => state.external);
  const setExternal = useShortcutsStore((state) => state.setExternal);
  const addError = useAppStore((state) => state.addError);
  const aiOverview = useShortcutsStore((state) => state.aiOverview);
  const setAiOverview = useShortcutsStore((state) => state.setAiOverview);

  useEffect(() => {
    const unlisten = useShortcutsStore.subscribe((state) => {
      platformAdapter.emitEvent("change-shortcuts-store", state);
    });

    return unlisten;
  }, []);

  const list = [
    {
      title: "settings.advanced.shortcuts.modeSwitch.title",
      description: "settings.advanced.shortcuts.modeSwitch.description",
      initialValue: INITIAL_MODE_SWITCH,
      value: modeSwitch,
      setValue: setModeSwitch,
    },
    {
      title: "settings.advanced.shortcuts.returnToInput.title",
      description: "settings.advanced.shortcuts.returnToInput.description",
      initialValue: INITIAL_RETURN_TO_INPUT,
      value: returnToInput,
      setValue: setReturnToInput,
    },
    // {
    //   title: "settings.advanced.shortcuts.voiceInput.title",
    //   description: "settings.advanced.shortcuts.voiceInput.description",
    //   value: voiceInput,
    //   setValue: setVoiceInput,
    //   reset: () => {
    //     handleChange(INITIAL_VOICE_INPUT, setVoiceInput);
    //   },
    // },
    // {
    //   title: "settings.advanced.shortcuts.addFile.title",
    //   description: "settings.advanced.shortcuts.addFile.description",
    //   value: addFile,
    //   setValue: setAddFile,
    //   reset: () => {
    //     handleChange(INITIAL_ADD_FILE, setAddFile);
    //   },
    // },
    {
      title: "settings.advanced.shortcuts.deepThinking.title",
      description: "settings.advanced.shortcuts.deepThinking.description",
      initialValue: INITIAL_DEEP_THINKING,
      value: deepThinking,
      setValue: setDeepThinking,
    },
    {
      title: "settings.advanced.shortcuts.internetSearch.title",
      description: "settings.advanced.shortcuts.internetSearch.description",
      initialValue: INITIAL_INTERNET_SEARCH,
      value: internetSearch,
      setValue: setInternetSearch,
    },
    {
      title: "settings.advanced.shortcuts.internetSearchScope.title",
      description:
        "settings.advanced.shortcuts.internetSearchScope.description",
      initialValue: INITIAL_INTERNET_SEARCH_SCOPE,
      value: internetSearchScope,
      setValue: setInternetSearchScope,
    },
    {
      title: "settings.advanced.shortcuts.mcpSearch.title",
      description: "settings.advanced.shortcuts.mcpSearch.description",
      initialValue: INITIAL_MCP_SEARCH,
      value: mcpSearch,
      setValue: setMcpSearch,
    },
    {
      title: "settings.advanced.shortcuts.mcpSearchScope.title",
      description: "settings.advanced.shortcuts.mcpSearchScope.description",
      initialValue: INITIAL_MCP_SEARCH_SCOPE,
      value: mcpSearchScope,
      setValue: setMcpSearchScope,
    },
    {
      title: "settings.advanced.shortcuts.historicalRecords.title",
      description: "settings.advanced.shortcuts.historicalRecords.description",
      initialValue: INITIAL_HISTORICAL_RECORDS,
      value: historicalRecords,
      setValue: setHistoricalRecords,
    },
    {
      title: "settings.advanced.shortcuts.aiAssistant.title",
      description: "settings.advanced.shortcuts.aiAssistant.description",
      initialValue: INITIAL_AI_ASSISTANT,
      value: aiAssistant,
      setValue: setAiAssistant,
    },
    {
      title: "settings.advanced.shortcuts.newSession.title",
      description: "settings.advanced.shortcuts.newSession.description",
      initialValue: INITIAL_NEW_SESSION,
      value: newSession,
      setValue: setNewSession,
    },
    {
      title: "settings.advanced.shortcuts.fixedWindow.title",
      description: "settings.advanced.shortcuts.fixedWindow.description",
      initialValue: INITIAL_FIXED_WINDOW,
      value: fixedWindow,
      setValue: setFixedWindow,
    },
    {
      title: "settings.advanced.shortcuts.serviceList.title",
      description: "settings.advanced.shortcuts.serviceList.description",
      initialValue: INITIAL_SERVICE_LIST,
      value: serviceList,
      setValue: setServiceList,
    },
    {
      title: "settings.advanced.shortcuts.external.title",
      description: "settings.advanced.shortcuts.external.description",
      initialValue: INITIAL_EXTERNAL,
      value: external,
      setValue: setExternal,
    },
    {
      title: "settings.advanced.shortcuts.aiOverview.title",
      description: "settings.advanced.shortcuts.aiOverview.description",
      initialValue: INITIAL_AI_OVERVIEW,
      value: aiOverview,
      setValue: setAiOverview,
    },
  ];

  const handleChange = (value: string, setValue: (value: string) => void) => {
    if (value.length > 1) return;

    const systemKeys = ["C", "V", "X", "Z", "Q", "H"];

    const isSystemKey = systemKeys.includes(value);

    const state = useShortcutsStore.getState();

    const isUsed = Object.values(state).includes(value);

    if (isSystemKey) {
      return addError(
        t("settings.advanced.shortcuts.hits.isSystem"),
        "warning"
      );
    }

    if (isUsed) {
      return addError(t("settings.advanced.shortcuts.hits.isUse"), "warning");
    }

    setValue(value);
  };

  return (
    <div className="space-y-8">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        {t("settings.advanced.shortcuts.title")}
      </h2>

      <div className="space-y-6">
        <SettingsItem
          icon={Command}
          title={t("settings.advanced.shortcuts.modifierKey.title")}
          description={t("settings.advanced.shortcuts.modifierKey.description")}
        >
          <select
            value={modifierKey}
            className="px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            onChange={(event) => {
              setModifierKey(event.target.value as ModifierKey);
            }}
          >
            {modifierKeys.map((item) => {
              return (
                <option key={item} value={item}>
                  {formatKey(item)}
                </option>
              );
            })}
          </select>
        </SettingsItem>

        {list.map((item) => {
          const { title, description, initialValue, value, setValue } = item;

          const disabled = value === initialValue;

          return (
            <SettingsItem
              key={title}
              icon={Command}
              title={t(title)}
              description={t(description)}
            >
              <div className="flex items-center gap-2">
                <span>{formatKey(modifierKey)}</span>
                <span>+</span>
                <SettingsInput
                  value={value}
                  max={1}
                  onChange={(value) => {
                    handleChange(String(value).toUpperCase(), setValue);
                  }}
                />

                <Button
                  disabled={disabled}
                  className={clsx(
                    "flex items-center justify-center size-8 rounded-md border border-black/5 dark:border-white/10 transition",
                    {
                      "hover:border-[#0072FF]": !disabled,
                      "opacity-70 cursor-not-allowed": disabled,
                    }
                  )}
                  onClick={() => {
                    handleChange(initialValue, setValue);
                  }}
                >
                  <RotateCcw
                    className={clsx("size-4 text-[#999]", {
                      "!text-[#0072FF]": !disabled,
                    })}
                  />
                </Button>
              </div>
            </SettingsItem>
          );
        })}
      </div>
    </div>
  );
};

export default Shortcuts;
