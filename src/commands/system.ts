import { invoke } from '@tauri-apps/api/core';

export function change_autostart(open: boolean) {
  return function (): Promise<void> {
    return invoke('change_autostart', { open });
  };
}

export function get_current_shortcut() {
  return function (): Promise<string> {
    return invoke('get_current_shortcut');
  };
}

export function change_shortcut(key: string) {
  return function (): Promise<void> {
    return invoke('change_shortcut', { key });
  };
}

export function unregister_shortcut() {
  return function (): Promise<void> {
    return invoke('unregister_shortcut');
  };
}

export function hide_coco() {
  return function (): Promise<void> {
    return invoke('hide_coco');
  };
}

export function show_coco() {
  return function (): Promise<void> {
    return invoke('show_coco');
  };
}

export function show_settings() {
  return function (): Promise<void> {
    return invoke('show_settings');
  };
}