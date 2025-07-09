import { useAppStore } from "@/stores/appStore";
import { isMac } from "@/utils/platform";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { debounce } from "lodash-es";
import { useEffect } from "react";

interface Props {
  onFocus?: () => void;
  onBlur?: () => void;
}

export const useTauriFocus = (props: Props) => {
  const { onFocus, onBlur } = props;
  const { isTauri } = useAppStore();

  useEffect(() => {
    if (!isTauri) return;

    const appWindow = getCurrentWebviewWindow();

    const wait = isMac ? 0 : 100;

    const debounced = debounce(({ payload }) => {
      if (payload) {
        console.log("Window focused");

        onFocus?.();
      } else {
        console.log("Window blurred");

        onBlur?.();
      }
    }, wait);

    const unlisten = appWindow.onFocusChanged(debounced);

    return () => {
      unlisten.then((unmount) => unmount());
    };
  });
};
