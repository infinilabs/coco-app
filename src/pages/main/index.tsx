import { useCallback, useEffect } from "react";

import SearchChat from "@/components/SearchChat";
import platformAdapter from "@/utils/platformAdapter";
import { useAppStore } from "@/stores/appStore";
import { useSyncStore } from "@/hooks/useSyncStore";

function MainApp() {
  const setIsTauri = useAppStore((state) => state.setIsTauri);
  useEffect(() => {
    setIsTauri(true);
  }, []);

  const hideCoco = useCallback(() => {
    return platformAdapter.hideWindow();
  }, []);

  useSyncStore();

  return (
    <SearchChat
      isTauri={true}
      hideCoco={hideCoco}
      hasModules={["search", "chat"]}
    />
  );
}

export default MainApp;
