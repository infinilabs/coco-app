import { useRef } from "react";
import { debounce, noop } from "lodash-es";
import { useMount, useUnmount } from "ahooks";

import { useAppStore } from "@/stores/appStore";
import { isMac } from "@/utils/platform";
import platformAdapter from "@/utils/platformAdapter";

interface Props {
  onFocus?: () => void;
  onBlur?: () => void;
}

export const useTauriFocus = (props: Props) => {
  const { onFocus, onBlur } = props;
  const { isTauri } = useAppStore();
  const unlistenRef = useRef(noop);

  useMount(async () => {
    if (!isTauri) return;

    const appWindow = await platformAdapter.getWebviewWindow();

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
  });

  useUnmount(() => {
    unlistenRef.current();
  });
};
