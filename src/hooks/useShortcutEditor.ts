import { useState, useCallback } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import { Shortcut } from '@/components/Settings/shortcut';
import { normalizeKey, isModifierKey } from '@/utils/keyboardUtils';

export function useShortcutEditor(shortcut: Shortcut, onChange: (shortcut: Shortcut) => void) {
  const [isEditing, setIsEditing] = useState(false);
  const [currentKeys, setCurrentKeys] = useState<string[]>([]);

  const startEditing = useCallback(() => {
    setIsEditing(true);
    setCurrentKeys([]);
  }, []);

  const saveShortcut = useCallback(() => {
    if (!isEditing || currentKeys.length < 2) return;
    
    const hasModifier = currentKeys.some(isModifierKey);
    const hasNonModifier = currentKeys.some(key => !isModifierKey(key));
    
    if (!hasModifier || !hasNonModifier) return;

    onChange(currentKeys);
    setIsEditing(false);
    setCurrentKeys([]);
  }, [isEditing, currentKeys, onChange]);

  // Register shortcut for non-editing state
  useHotkeys(
    shortcut.join('+').toLowerCase(),
    (e) => {
      e.preventDefault();
      console.log('Shortcut triggered');
    },
    { enabled: !isEditing },
    [isEditing]
  );

  // Register key capture for editing state
  useHotkeys(
    '*',
    (e) => {
      if (!isEditing) return;
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
    { enabled: isEditing, keydown: true },
    [isEditing]
  );

  return {
    isEditing,
    currentKeys,
    startEditing,
    saveShortcut
  };
}