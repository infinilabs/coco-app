import { useMount } from "ahooks";
import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";

import LayoutOutlet from "./outlet";
import { useAppStore } from "@/stores/appStore";

const Layout = () => {
  const { language } = useAppStore();
  const [ready, setReady] = useState(false);

  useMount(async () => {
    await invoke("backend_setup", {
      appLang: language,
    });

    setReady(true);
  });

  return ready && <LayoutOutlet />;
};

export default Layout;
