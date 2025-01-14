// Platform detection
export const isMac = navigator.platform.toLowerCase().includes('mac');

// Mapping of keys to their display symbols
export const KEY_SYMBOLS: Record<string, string> = {
  // Modifier keys
  Control: isMac ? '⌃' : 'Ctrl',
  control: isMac ? '⌃' : 'Ctrl',
  Shift: isMac ? '⇧' : 'Shift',
  shift: isMac ? '⇧' : 'Shift',
  Alt: isMac ? '⌥' : 'Alt',
  alt: isMac ? '⌥' : 'Alt',
  Meta: isMac ? '⌘' : 'Win',
  Command: isMac ? '⌘' : 'Win',
  super: isMac ? '⌘' : 'Win',
  // Special keys
  Space: 'Space',
  Enter: '↵',
  Backspace: '⌫',
  Delete: 'Del',
  Escape: 'Esc',
  ArrowUp: '↑',
  ArrowDown: '↓',
  ArrowLeft: '←',
  ArrowRight: '→',
  Tab: '⇥',
};

// Normalize key names
export const normalizeKey = (key: string): string => {
  const keyMap: Record<string, string> = {
    'ControlLeft': 'Control',
    'ControlRight': 'Control',
    'ShiftLeft': 'Shift',
    'ShiftRight': 'Shift',
    'AltLeft': 'Alt',
    'AltRight': 'Alt',
    'MetaLeft': 'Command',
    'MetaRight': 'Command',
    'Space': 'Space'  // Add explicit mapping for Space
  };
  
  return keyMap[key] || key.replace('Key', '');
};

// Format key for display
export const formatKey = (key: string): string => {
  return KEY_SYMBOLS[key] || key.replace('Key', '') || key;
};

// Check if key is a modifier
export const isModifierKey = (key: string): boolean => {
  return ['Control', 'Shift', 'Alt', 'Meta'].includes(key);
};

// Sort keys to ensure consistent order (modifiers first)
export const sortKeys = (keys: string[]): string[] => {
  const modifierOrder = ['Control', 'Alt', 'Shift', 'Meta'];
  
  return [...keys].sort((a, b) => {
    const aIndex = modifierOrder.indexOf(a);
    const bIndex = modifierOrder.indexOf(b);
    
    if (aIndex === -1 && bIndex === -1) return 0;
    if (aIndex === -1) return 1;
    if (bIndex === -1) return -1;
    return aIndex - bIndex;
  });
};