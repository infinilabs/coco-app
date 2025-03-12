import { useShortcutsStore } from "@/stores/shortcutsStore";
import { useTranslation } from "react-i18next";
import Item, { ItemProps } from "./Item";

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

  const list: ItemProps[] = [
    {
      title: "settings.advanced.shortcuts.modeSwitch.title",
      description: "settings.advanced.shortcuts.modeSwitch.description",
      shortcut: modeSwitch,
      setShortcut: setModeSwitch,
    },
    {
      title: "settings.advanced.shortcuts.returnToInput.title",
      description: "settings.advanced.shortcuts.returnToInput.description",
      shortcut: returnToInput,
      setShortcut: setReturnToInput,
    },
    {
      title: "settings.advanced.shortcuts.voiceInput.title",
      description: "settings.advanced.shortcuts.voiceInput.description",
      shortcut: voiceInput,
      setShortcut: setVoiceInput,
    },
    {
      title: "settings.advanced.shortcuts.addImage.title",
      description: "settings.advanced.shortcuts.addImage.description",
      shortcut: addImage,
      setShortcut: setAddImage,
    },
    {
      title: "settings.advanced.shortcuts.selectLlmModel.title",
      description: "settings.advanced.shortcuts.selectLlmModel.description",
      shortcut: selectLlmModel,
      setShortcut: setSelectLlmModel,
    },
    {
      title: "settings.advanced.shortcuts.addFile.title",
      description: "settings.advanced.shortcuts.addFile.description",
      shortcut: addFile,
      setShortcut: setAddFile,
    },
  ];

  return (
    <div className="space-y-8">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        {t("settings.advanced.shortcuts.title")}
      </h2>

      <div className="space-y-6">
        {list.map((item) => {
          return <Item key={item.title} {...item} />;
        })}
      </div>
    </div>
  );
};

export default Shortcuts;
