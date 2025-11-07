import { useMount } from "ahooks";
import { useState } from "react";

import LayoutOutlet from "./outlet";
import { useAppStore } from "@/stores/appStore";
import platformAdapter from "@/utils/platformAdapter";

const Layout = () => {
  const { language } = useAppStore();
  const [ready, setReady] = useState(false);

  useMount(async () => {
    await platformAdapter.invokeBackend("backend_setup", {
      appLang: language,
    });

    setReady(true);
  });

  return ready && <LayoutOutlet />;
};

export default Layout;
