import { useMount, useSessionStorageState } from "ahooks";
import { useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";

import LayoutOutlet from "./outlet";
import { useAppStore } from "@/stores/appStore";
import platformAdapter from "@/utils/platformAdapter";
import { CHAT_WINDOW_LABEL, MAIN_WINDOW_LABEL } from "@/constants";

const Layout = () => {
  const { language } = useAppStore();
  const [ready, setReady] = useSessionStorageState("rust_ready", {
    defaultValue: false,
  });

  useMount(async () => {
    const label = await platformAdapter.getCurrentWindowLabel();

    if (label === CHAT_WINDOW_LABEL) {
      setReady(true);
    }

    if (ready || label !== MAIN_WINDOW_LABEL) return;

    await invoke("backend_setup", {
      appLang: language,
    });

    setReady(true);

    platformAdapter.emitEvent("rust_ready");
  });

  useEffect(() => {
    const unlisten = platformAdapter.listenEvent("rust_ready", () => {
      setReady(true);
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  return ready && <LayoutOutlet />;
};

export default Layout;
