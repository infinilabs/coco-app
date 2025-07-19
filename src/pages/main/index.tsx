import { useEffect } from "react";

import SearchChat from "@/components/SearchChat";
import { useAppStore } from "@/stores/appStore";
import { useSyncStore } from "@/hooks/useSyncStore";
import UpdateApp from "@/components/UpdateApp";
import Synthesize from "@/components/Assistant/Synthesize";
import { useChatStore } from "@/stores/chatStore";

function MainApp() {
  const { setIsTauri } = useAppStore();
  useEffect(() => {
    setIsTauri(true);
  }, []);
  const { synthesizeItem } = useChatStore();

  useSyncStore();

  return (
    <>
      <SearchChat isTauri={true} hasModules={["search", "chat"]} />
      <UpdateApp />

      {synthesizeItem && <Synthesize />}
    </>
  );
}

export default MainApp;
