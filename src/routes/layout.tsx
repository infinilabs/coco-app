import { useMount } from "ahooks";
import LayoutOutlet from "./outlet";
import { useAppStore } from "@/stores/appStore";
import { invoke } from "@tauri-apps/api/core";
import platformAdapter from "@/utils/platformAdapter";
import { MAIN_WINDOW_LABEL, SETTINGS_WINDOW_LABEL } from "@/constants";
import { useEffect, useState } from "react";

const Layout = () => {
  const { language } = useAppStore();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const unlisten = platformAdapter.listenEvent("rust_ready", () => {
      setReady(true);
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  useMount(async () => {
    const label = await platformAdapter.getCurrentWindowLabel();

    if (label === MAIN_WINDOW_LABEL) {
      await invoke("backend_setup", {
        appLang: language,
      });

      setReady(true);

      return platformAdapter.emitEvent("rust_ready", true);
    }

    if (label !== SETTINGS_WINDOW_LABEL) {
      setReady(true);
    }
  });

  console.log("ready", ready);

  return ready && <LayoutOutlet />;
};

export default Layout;
