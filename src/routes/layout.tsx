import { useMount } from "ahooks";
import LayoutOutlet from "./outlet";
import { useState } from "react";
import { useAppStore } from "@/stores/appStore";
import { invoke } from "@tauri-apps/api/core";

const Layout = () => {
  const { language } = useAppStore();
  const [ready, setReady] = useState(false);

  useMount(async () => {
    await invoke("backend_setup", {
      app_lang: language,
    });

    setReady(true);
  });

  return ready && <LayoutOutlet />;
};

export default Layout;
