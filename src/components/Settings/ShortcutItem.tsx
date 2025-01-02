import { formatKey, sortKeys } from '../../utils/keyboardUtils.ts';

interface ShortcutItemProps {
  id: string;
  shortcut: string[];
  editingId: string | null;
  currentKeys: string[];
  onEdit: (id: string) => void;
  onSave: () => void;
}

export default function ShortcutItem({
  id,
  shortcut,
  editingId,
  currentKeys,
  onEdit,
  onSave
}: ShortcutItemProps) {
  const isEditing = editingId === id;
  
  const renderKeys = (keys: string[]) => {
    const sortedKeys = sortKeys(keys);
    return sortedKeys.map((key, index) => (
      <kbd
        key={index}
        className="px-2 py-1 text-sm font-semibold bg-gray-100 border border-gray-300 rounded shadow-sm"
      >
        {formatKey(key)}
      </kbd>
    ));
  };

  return (
    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
      <div className="flex items-center gap-4">
        {isEditing ? (
          <>
            <div className="flex gap-1 min-w-[120px] justify-end">
              {currentKeys.length > 0 ? (
                renderKeys(currentKeys)
              ) : (
                <span className="text-gray-500 italic">Press keys...</span>
              )}
            </div>
            <button
              onClick={onSave}
              disabled={currentKeys.length < 2}
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Save
            </button>
          </>
        ) : (
          <>
            <div className="flex gap-1">
              {renderKeys(shortcut)}
            </div>
            <button
              onClick={() => onEdit(id)}
              className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
            >
              Edit
            </button>
          </>
        )}
      </div>
    </div>
  );
}