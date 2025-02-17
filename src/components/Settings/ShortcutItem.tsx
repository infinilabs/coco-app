import { X } from "lucide-react";
import { useTranslation } from "react-i18next";

import { formatKey, sortKeys } from "@/utils/keyboardUtils";

interface ShortcutItemProps {
  shortcut: string[];
  isEditing: boolean;
  currentKeys: string[];
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
}

export function ShortcutItem({
  shortcut,
  isEditing,
  currentKeys,
  onEdit,
  onSave,
  onCancel,
}: ShortcutItemProps) {
  const { t } = useTranslation();
  
  const renderKeys = (keys: string[]) => {
    const sortedKeys = sortKeys(keys);
    return sortedKeys.map((key, index) => (
      <kbd
        key={index}
        className={`px-2 py-1 text-sm font-semibold rounded shadow-sm bg-gray-100 border-gray-300 text-gray-900 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200`}
      >
        {formatKey(key)}
      </kbd>
    ));
  };

  return (
    <div className={`flex items-center justify-between p-4 rounded-lg bg-gray-50 dark:bg-gray-700`}>
      <div className="flex items-center gap-4">
        {isEditing ? (
          <>
            <div className="flex gap-1 min-w-[120px] justify-end">
              {currentKeys.length > 0 ? (
                renderKeys(currentKeys)
              ) : (
                <span className={`italic text-gray-500 dark:text-gray-400`}>
                  {t('settings.shortcut.pressKeys')}
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={onSave}
                disabled={currentKeys.length < 2}
                className={`px-3 py-1 text-sm rounded bg-blue-500 text-white hover:bg-blue-600 dark:bg-blue-600 dark:text-white dark:hover:bg-blue-700
                   disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {t('settings.shortcut.save')}
              </button>
              <button
                onClick={onCancel}
                className={`p-1 rounded text-gray-500 hover:text-gray-700 hover:bg-gray-200 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-600`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="flex gap-1">{renderKeys(shortcut)}</div>
            <button
              onClick={onEdit}
              className={`px-3 py-1 text-sm rounded bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500`}
            >
              {t('settings.shortcut.edit')}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
