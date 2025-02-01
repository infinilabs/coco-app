import { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";

import useEscape from "@/hooks/useEscape";
import useSettingsWindow from "@/hooks/useSettingsWindow";

export default function Layout() {
  const location = useLocation();
  function updateBodyClass(path: string) {
    const body = document.body;
    body.className = "";

    if (path === "/ui") {
      body.classList.add("input-body");
    }
  }
  useEffect(() => {
    updateBodyClass(location.pathname);
  }, [location.pathname]);

  useEscape();

  useSettingsWindow();

  return <Outlet />;
}
