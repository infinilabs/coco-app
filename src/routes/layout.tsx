import { useMount } from "ahooks";
import LayoutOutlet from "./outlet";
import { useAppStore } from "@/stores/appStore";
import { invoke } from "@tauri-apps/api/core";
import platformAdapter from "@/utils/platformAdapter";
import { MAIN_WINDOW_LABEL } from "@/constants";

const Layout = () => {
  const { language } = useAppStore();
  const { rustReady, setRustReady } = useAppStore();

  useMount(async () => {
    const label = await platformAdapter.getCurrentWindowLabel();

    if (label !== MAIN_WINDOW_LABEL) return;

    await invoke("backend_setup", {
      appLang: language,
    });

    setRustReady(true);
  });

  return rustReady && <LayoutOutlet />;
};

export default Layout;
