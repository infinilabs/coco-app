import { useEffect, useRef } from "react";

import SearchChat from "@/components/SearchChat";
import { useAppStore } from "@/stores/appStore";
import { useSyncStore } from "@/hooks/useSyncStore";
import UpdateApp from "@/components/UpdateApp";
import Synthesize from "@/components/Assistant/Synthesize";
import { useChatStore } from "@/stores/chatStore";
import { useSearchStore } from "@/stores/searchStore";
import platformAdapter from "@/utils/platformAdapter";
import { ViewExtensionUISettings } from "@/components/Settings/Extensions";
 
const DEFAULT_VIEW_WIDTH = 960;
const DEFAULT_VIEW_HEIGHT = 720;
const DEFAULT_VIEW_RESIZABLE = true;

function MainApp() {
  const { setIsTauri } = useAppStore();
  const { setViewExtensionOpened } = useSearchStore();
  const { viewExtensionOpened } = useSearchStore();
  const prevWindowRef = useRef<{ width: number; height: number; resizable: boolean } | null>(null);

  useEffect(() => {
    setIsTauri(true);

    // Set up the listener that listens for "open_view_extension" events
    //
    // Events will be sent when users try to open a View extension via hotkey,
    // whose payload contains the needed information to load the View page.
    platformAdapter.listenEvent("open_view_extension", async ({ payload }) => {
      await platformAdapter.showWindow();

      setViewExtensionOpened(payload);
    });
  }, []);

  useEffect(() => {
    const applyWindowSettings = async () => {
      const ui: ViewExtensionUISettings | null =
        viewExtensionOpened != null ? viewExtensionOpened[4] : null;

      if (ui != null) {
        const size = await platformAdapter.getWindowSize();
        const resizable = await platformAdapter.isWindowResizable();
        prevWindowRef.current = {
          width: size.width,
          height: size.height,
          resizable,
        };

        const nextWidth =
          typeof ui.width === "number" ? ui.width : DEFAULT_VIEW_WIDTH;
        const nextHeight =
          typeof ui.height === "number" ? ui.height : DEFAULT_VIEW_HEIGHT;
        const nextResizable =
          typeof ui.resizable === "boolean"
            ? ui.resizable
            : DEFAULT_VIEW_RESIZABLE;

        await platformAdapter.setWindowSize(nextWidth, nextHeight);
        await platformAdapter.setWindowResizable(nextResizable);
      } else {
        if (prevWindowRef.current) {
          const prev = prevWindowRef.current;
          await platformAdapter.setWindowSize(prev.width, prev.height);
          await platformAdapter.setWindowResizable(prev.resizable);
          prevWindowRef.current = null;
        }
      }
    };

    applyWindowSettings();
  }, [viewExtensionOpened]);

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
