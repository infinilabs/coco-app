import { useTranslation } from "react-i18next";
import { Command } from "lucide-react";
import { ChangeEvent, useEffect } from "react";

import { formatKey } from "@/utils/keyboardUtils";
import SettingsItem from "@/components/Settings/SettingsItem";
import { isMac } from "@/utils/platform";
import { useShortcutsStore } from "@/stores/shortcutsStore";
import { ModifierKey } from "@/types/index";
import platformAdapter from "@/utils/platformAdapter";

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
  const voiceInput = useShortcutsStore((state) => state.voiceInput);
  const setVoiceInput = useShortcutsStore((state) => state.setVoiceInput);
  const addFile = useShortcutsStore((state) => state.addFile);
  const setAddFile = useShortcutsStore((state) => state.setAddFile);
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
      value: modeSwitch,
      setValue: setModeSwitch,
    },
    {
      title: "settings.advanced.shortcuts.returnToInput.title",
      description: "settings.advanced.shortcuts.returnToInput.description",
      value: returnToInput,
      setValue: setReturnToInput,
    },
    {
      title: "settings.advanced.shortcuts.voiceInput.title",
      description: "settings.advanced.shortcuts.voiceInput.description",
      value: voiceInput,
      setValue: setVoiceInput,
    },
    {
      title: "settings.advanced.shortcuts.addFile.title",
      description: "settings.advanced.shortcuts.addFile.description",
      value: addFile,
      setValue: setAddFile,
    },
    {
      title: "settings.advanced.shortcuts.deepThinking.title",
      description: "settings.advanced.shortcuts.deepThinking.description",
      value: deepThinking,
      setValue: setDeepThinking,
    },
    {
      title: "settings.advanced.shortcuts.internetSearch.title",
      description: "settings.advanced.shortcuts.internetSearch.description",
      value: internetSearch,
      setValue: setInternetSearch,
    },
    {
      title: "settings.advanced.shortcuts.internetSearchScope.title",
      description:
        "settings.advanced.shortcuts.internetSearchScope.description",
      value: internetSearchScope,
      setValue: setInternetSearchScope,
    },
    {
      title: "settings.advanced.shortcuts.historicalRecords.title",
      description: "settings.advanced.shortcuts.historicalRecords.description",
      value: historicalRecords,
      setValue: setHistoricalRecords,
    },
    {
      title: "settings.advanced.shortcuts.aiAssistant.title",
      description: "settings.advanced.shortcuts.aiAssistant.description",
      value: aiAssistant,
      setValue: setAiAssistant,
    },
    {
      title: "settings.advanced.shortcuts.newSession.title",
      description: "settings.advanced.shortcuts.newSession.description",
      value: newSession,
      setValue: setNewSession,
    },
    {
      title: "settings.advanced.shortcuts.fixedWindow.title",
      description: "settings.advanced.shortcuts.fixedWindow.description",
      value: fixedWindow,
      setValue: setFixedWindow,
    },
    {
      title: "settings.advanced.shortcuts.serviceList.title",
      description: "settings.advanced.shortcuts.serviceList.description",
      value: serviceList,
      setValue: setServiceList,
    },
    {
      title: "settings.advanced.shortcuts.external.title",
      description: "settings.advanced.shortcuts.external.description",
      value: external,
      setValue: setExternal,
    },
  ];

  const handleChange = (
    event: ChangeEvent<HTMLInputElement>,
    setValue: (value: string) => void
  ) => {
    const value = event.target.value.toUpperCase();

    if (value.length > 1) return;

    const systemKeys = ["C", "V", "X", "Z", "Q", "H"];

    const isSystemKey = systemKeys.includes(value);

    const state = useShortcutsStore.getState();

    const isUsed = Object.values(state).includes(value);

    if (isSystemKey || isUsed) return;

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
              return <option value={item}>{formatKey(item)}</option>;
            })}
          </select>
        </SettingsItem>

        {list.map((item) => {
          const { title, description, value, setValue } = item;

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
                <input
                  className="w-20 h-8 px-2 rounded-md border bg-transparent border-black/5 dark:border-white/10"
                  value={value}
                  maxLength={1}
                  onChange={(event) => {
                    handleChange(event, setValue);
                  }}
                />
              </div>
            </SettingsItem>
          );
        })}
      </div>
    </div>
  );
};

export default Shortcuts;
