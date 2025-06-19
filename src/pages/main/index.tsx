import { useEffect } from "react";

import SearchChat from "@/components/SearchChat";
import { useAppStore } from "@/stores/appStore";
import { useSyncStore } from "@/hooks/useSyncStore";
import UpdateApp from "@/components/UpdateApp";

function MainApp() {

  const setIsTauri = useAppStore((state) => state.setIsTauri);
  useEffect(() => {
    setIsTauri(true);
  }, []);

  useSyncStore();

  return (
    <>
      <SearchChat isTauri={true} hasModules={["search", "chat"]} />
      <UpdateApp />
    </>
  );
}

export default MainApp;
