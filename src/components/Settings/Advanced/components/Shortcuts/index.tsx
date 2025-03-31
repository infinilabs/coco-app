import { ModifierKey, useShortcutsStore } from "@/stores/shortcutsStore";
import { useTranslation } from "react-i18next";
import { formatKey } from "@/utils/keyboardUtils";
import SettingsItem from "@/components/Settings/SettingsItem";
import { Command } from "lucide-react";
import { ChangeEvent, useEffect } from "react";
import { emit } from "@tauri-apps/api/event";

export const modifierKeys: ModifierKey[] = ["meta", "ctrl"];

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
  // const addImage = useShortcutsStore((state) => state.addImage);
  // const setAddImage = useShortcutsStore((state) => state.setAddImage);
  // const selectLlmModel = useShortcutsStore((state) => state.selectLlmModel);
  // const setSelectLlmModel = useShortcutsStore((state) => {
  //   return state.setSelectLlmModel;
  // });
  const addFile = useShortcutsStore((state) => state.addFile);
  const setAddFile = useShortcutsStore((state) => state.setAddFile);

  useEffect(() => {
    const unlisten = useShortcutsStore.subscribe((state) => {
      emit("change-shortcuts-store", state);
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
    // {
    //   title: "settings.advanced.shortcuts.addImage.title",
    //   description: "settings.advanced.shortcuts.addImage.description",
    //   value: addImage,
    //   setValue: setAddImage,
    // },
    // {
    //   title: "settings.advanced.shortcuts.selectLlmModel.title",
    //   description: "settings.advanced.shortcuts.selectLlmModel.description",
    //   value: selectLlmModel,
    //   setValue: setSelectLlmModel,
    // },
    {
      title: "settings.advanced.shortcuts.addFile.title",
      description: "settings.advanced.shortcuts.addFile.description",
      value: addFile,
      setValue: setAddFile,
    },
  ];

  const handleChange = (
    event: ChangeEvent<HTMLInputElement>,
    setValue: (value: string) => void
  ) => {
    const value = event.target.value.toUpperCase();

    if (value.length > 1) return;

    const state = useShortcutsStore.getState();

    if (Object.values(state).includes(value)) return;

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
