import { useShortcutsStore } from "@/stores/shortcutsStore";
import { useTranslation } from "react-i18next";
import { formatKey } from "@/utils/keyboardUtils";
import SettingsItem from "@/components/Settings/SettingsItem";
import { Command } from "lucide-react";
import { ChangeEvent } from "react";

const Shortcuts = () => {
  const { t } = useTranslation();
  const modeSwitch = useShortcutsStore((state) => state.modeSwitch);
  const setModeSwitch = useShortcutsStore((state) => state.setModeSwitch);
  const returnToInput = useShortcutsStore((state) => state.returnToInput);
  const setReturnToInput = useShortcutsStore((state) => state.setReturnToInput);
  const voiceInput = useShortcutsStore((state) => state.voiceInput);
  const setVoiceInput = useShortcutsStore((state) => state.setVoiceInput);
  const addImage = useShortcutsStore((state) => state.addImage);
  const setAddImage = useShortcutsStore((state) => state.setAddImage);
  const selectLlmModel = useShortcutsStore((state) => state.selectLlmModel);
  const setSelectLlmModel = useShortcutsStore((state) => {
    return state.setSelectLlmModel;
  });
  const addFile = useShortcutsStore((state) => state.addFile);
  const setAddFile = useShortcutsStore((state) => state.setAddFile);

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
      title: "settings.advanced.shortcuts.addImage.title",
      description: "settings.advanced.shortcuts.addImage.description",
      value: addImage,
      setValue: setAddImage,
    },
    {
      title: "settings.advanced.shortcuts.selectLlmModel.title",
      description: "settings.advanced.shortcuts.selectLlmModel.description",
      value: selectLlmModel,
      setValue: setSelectLlmModel,
    },
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
                {formatKey("Command")} +
                <input
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
