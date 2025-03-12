import SettingsItem from "@/components/Settings/SettingsItem";
import { ShortcutItem } from "@/components/Settings/ShortcutItem";
import { useShortcutEditor } from "@/hooks/useShortcutEditor";
import { usePrevious } from "ahooks";
import { Command } from "lucide-react";
import { FC } from "react";
import { useTranslation } from "react-i18next";

export interface ItemProps {
  title: string;
  description: string;
  shortcut: string[];
  setShortcut: (shortcut: string[]) => void;
}

const Item: FC<ItemProps> = (props) => {
  const { title, description, shortcut, setShortcut } = props;

  const { t } = useTranslation();

  const previousShortcut = usePrevious(shortcut);

  const { isEditing, currentKeys, startEditing, saveShortcut, cancelEditing } =
    useShortcutEditor(shortcut, setShortcut);

  const handleEdit = () => {
    startEditing();

    setShortcut([]);
  };

  const handleCancel = () => {
    cancelEditing();

    setShortcut(previousShortcut ?? []);
  };

  return (
    <SettingsItem icon={Command} title={t(title)} description={t(description)}>
      <div className="flex items-center gap-2">
        <ShortcutItem
          shortcut={shortcut}
          isEditing={isEditing}
          currentKeys={currentKeys}
          onEdit={handleEdit}
          onSave={saveShortcut}
          onCancel={handleCancel}
        />
      </div>
    </SettingsItem>
  );
};

export default Item;
