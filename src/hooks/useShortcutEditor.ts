import { useState, useCallback, useEffect } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';

import { Shortcut } from '@/components/Settings/shortcut';
import { normalizeKey, isModifierKey, sortKeys } from '@/utils/keyboardUtils';

export function useShortcutEditor(shortcut: Shortcut, onChange: (shortcut: Shortcut) => void) {
  const [isEditing, setIsEditing] = useState(false);
  const [currentKeys, setCurrentKeys] = useState<string[]>([]);
  const [pressedKeys] = useState(new Set<string>());

  const startEditing = useCallback(() => {
    setIsEditing(true);
    setCurrentKeys([]);
  }, []);

  const saveShortcut = useCallback(() => {
    if (!isEditing || currentKeys.length < 2) return;

    const hasModifier = currentKeys.some(isModifierKey);
    const hasNonModifier = currentKeys.some(key => !isModifierKey(key));

    if (!hasModifier || !hasNonModifier) return;

    // Sort keys to ensure consistent order (modifiers first)
    const sortedKeys = sortKeys(currentKeys);
    onChange(sortedKeys);
    setIsEditing(false);
    setCurrentKeys([]);
  }, [isEditing, currentKeys, onChange]);

  const cancelEditing = useCallback(() => {
    setIsEditing(false);
    setCurrentKeys([]);
  }, []);

  // Register shortcut for non-editing state
  useHotkeys(
    shortcut.join('+').toLowerCase(),
    (e) => {
      if (isEditing) {
        return;
      }
      e.preventDefault();
      console.log('Shortcut triggered:', shortcut.join('+'));
    },
    { preventDefault: true },
    [shortcut, isEditing]
  );

  // Register key capture for editing state
  useHotkeys(
    '*',
    (e) => {
      if (!isEditing) return;

      e.preventDefault();
      e.stopPropagation();

      const key = normalizeKey(e.code);

      // Update pressed keys
      pressedKeys.add(key);

      setCurrentKeys(() => {
        const keys = Array.from(pressedKeys);
        const modifiers = keys.filter(isModifierKey);
        const nonModifiers = keys.filter(k => !isModifierKey(k));

        // Combine modifiers and non-modifiers
        return [...modifiers, ...nonModifiers];
      });
    },
    {
      enabled: isEditing,
      enableOnFormTags: ["INPUT", "TEXTAREA", "SELECT"],
      keydown: true,
      preventDefault: true
    },
    [isEditing, pressedKeys]
  );

  // Handle key up events
  useHotkeys(
    '*',
    (e) => {
      if (!isEditing) return;
      const key = normalizeKey(e.code);
      pressedKeys.delete(key);
    },
    {
      enabled: isEditing,
      keyup: true,
      preventDefault: true
    },
    [isEditing, pressedKeys]
  );

  // Handle Escape key to cancel editing
  useHotkeys(
    'esc',
    () => {
      if (isEditing) {
        cancelEditing();
      }
    },
    {
      enabled: isEditing,
      preventDefault: true
    },
    [isEditing, cancelEditing]
  );

  // Clean up editing state when component unmounts
  useEffect(() => {
    return () => {
      if (isEditing) {
        cancelEditing();
      }
    };
  }, [isEditing, cancelEditing]);

  return {
    isEditing,
    currentKeys,
    startEditing,
    saveShortcut,
    cancelEditing
  };
}