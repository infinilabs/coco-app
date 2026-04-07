import { useRef } from "react";
import { debounce, noop } from "lodash-es";
import { useMount, useUnmount } from "ahooks";

import { useAppStore } from "@/stores/appStore";
import { isMac } from "@/utils/platform";
import platformAdapter from "@/utils/platformAdapter";

interface Props {
  onFocus?: () => void;
  onBlur?: () => void;
  enableWebFocus?: boolean;
}

export const useTauriFocus = (props: Props) => {
  const { onFocus, onBlur, enableWebFocus = false } = props;
  const { isTauri } = useAppStore();
  const unlistenRef = useRef(noop);

  useMount(async () => {
    if (isTauri) {
      const appWindow = await platformAdapter.getCurrentWebviewWindow();

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

      unlistenRef.current = await appWindow.onFocusChanged(debounced);

      return;
    }

    if (!enableWebFocus) return;

    const handleFocus = () => {
      console.log("Window focused");

      onFocus?.();
    };

    const handleBlur = () => {
      console.log("Window blurred");

      onBlur?.();
    };

    window.addEventListener("focus", handleFocus);

    window.addEventListener("blur", handleBlur);

    if (document.hasFocus()) {
      handleFocus();
    }

    unlistenRef.current = () => {
      window.removeEventListener("focus", handleFocus);

      window.removeEventListener("blur", handleBlur);
    };
  });

  useUnmount(() => {
    unlistenRef.current();
  });
};
