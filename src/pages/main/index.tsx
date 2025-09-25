import { useEffect } from "react";

import SearchChat from "@/components/SearchChat";
import { useAppStore } from "@/stores/appStore";
import { useSyncStore } from "@/hooks/useSyncStore";
import UpdateApp from "@/components/UpdateApp";
import Synthesize from "@/components/Assistant/Synthesize";
import { useChatStore } from "@/stores/chatStore";
import { useSearchStore } from "@/stores/searchStore";
import platformAdapter from "@/utils/platformAdapter";

function MainApp() {
  const { setIsTauri } = useAppStore();
  const { setViewExtensionOpened } =  useSearchStore();

  useEffect(() => {
    setIsTauri(true);

    // Set up the listener that listens for "open_view_extension" events
    //
    // Events will be sent when users try to open a View extension via hotkey,
    // whose payload contains the needed information to load the View page.
    platformAdapter.listenEvent("open_view_extension", async ({ payload: view_extension_page_and_permission } ) => {
       await platformAdapter.showWindow();
       setViewExtensionOpened(view_extension_page_and_permission);
    }) 
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
