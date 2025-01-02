import { useState, useCallback } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import { Shortcut } from '../components/Settings/shortcut';
import { normalizeKey, isModifierKey } from '../utils/keyboardUtils';

export function useShortcutEditor(shortcuts: Shortcut[], onChange: (shortcuts: Shortcut[]) => void) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [currentKeys, setCurrentKeys] = useState<string[]>([]);

  const startEditing = useCallback((id: string) => {
    setEditingId(id);
    setCurrentKeys([]);
  }, []);

  const saveShortcut = useCallback(() => {
    if (!editingId || currentKeys.length < 2) return;
    
    const hasModifier = currentKeys.some(isModifierKey);
    const hasNonModifier = currentKeys.some(key => !isModifierKey(key));
    
    if (!hasModifier || !hasNonModifier) return;

    onChange(
      shortcuts.map(shortcut =>
        shortcut.id === editingId
          ? { ...shortcut, shortcut: currentKeys }
          : shortcut
      )
    );
    setEditingId(null);
    setCurrentKeys([]);
  }, [editingId, currentKeys, shortcuts, onChange]);

  // Register shortcuts for non-editing state
  shortcuts.forEach(({ shortcut }) => {
    useHotkeys(
      shortcut.join('+').toLowerCase(),
      (e) => {
        e.preventDefault();
        console.log(`Shortcut triggered: ${shortcut}`);
      },
      { enabled: !editingId },
      [editingId]
    );
  });

  // Register key capture for editing state
  useHotkeys(
    '*',
    (e) => {
      if (!editingId) return;
      e.preventDefault();

      const key = normalizeKey(e.code);
      
      setCurrentKeys(prev => {
        // Always keep modifiers
        const modifiers = prev.filter(isModifierKey);
        
        // If the new key is a modifier, add it
        if (isModifierKey(key) && !modifiers.includes(key)) {
          return [...modifiers, key];
        }
        
        // If it's a regular key, replace the previous regular key (if any)
        if (!isModifierKey(key)) {
          return [...modifiers, key];
        }
        
        return prev;
      });
    },
    { enabled: !!editingId, keydown: true },
    [editingId]
  );

  return {
    editingId,
    currentKeys,
    startEditing,
    saveShortcut
  };
}