import { useCallback, useEffect } from "react";
import { useKeyPress } from "ahooks";

import SearchChat from "@/components/SearchChat";
import platformAdapter from "@/utils/platformAdapter";
import { useShortcutsStore } from "@/stores/shortcutsStore";
import { useStartupStore } from "@/stores/startupStore";
import { modifierKeys } from "@/components/Settings/Advanced/components/Shortcuts";
import { useAppStore } from "@/stores/appStore";

function MainApp() {
  const setIsTauri = useAppStore((state) => state.setIsTauri);
  setIsTauri(true);

  const querySearch = useCallback(async (input: string) => {
    try {
      const response: any = await platformAdapter.invokeBackend(
        "query_coco_fusion",
        {
          from: 0,
          size: 10,
          queryStrings: { query: input },
        }
      );
      if (!response || typeof response !== 'object') {
        throw new Error('Invalid response format');
      }
      return response;
    } catch (error) {
      console.error("query_coco_fusion error:", error);
      throw error;
    }
  }, []);

  const queryDocuments = useCallback(
    async (from: number, size: number, queryStrings: any) => {
      try {
        const response: any = await platformAdapter.invokeBackend(
          "query_coco_fusion",
          {
            from,
            size,
            queryStrings,
          }
        );
        return response;
      } catch (error) {
        console.error("query_coco_fusion error:", error);
        throw error;
      }
    },
    []
  );

  const hideCoco = useCallback(() => {
    return platformAdapter.hideWindow();
  }, []);

  const modifierKey = useShortcutsStore((state) => {
    return state.modifierKey;
  });
  const setModifierKey = useShortcutsStore((state) => {
    return state.setModifierKey;
  });
  const setModifierKeyPressed = useShortcutsStore((state) => {
    return state.setModifierKeyPressed;
  });
  const setModeSwitch = useShortcutsStore((state) => {
    return state.setModeSwitch;
  });
  const setReturnToInput = useShortcutsStore((state) => {
    return state.setReturnToInput;
  });
  const setVoiceInput = useShortcutsStore((state) => {
    return state.setVoiceInput;
  });
  const setAddFile = useShortcutsStore((state) => {
    return state.setAddFile;
  });
  const setDefaultStartupWindow = useStartupStore((state) => {
    return state.setDefaultStartupWindow;
  });
  const setDefaultContentForSearchWindow = useStartupStore((state) => {
    return state.setDefaultContentForSearchWindow;
  });
  const setDefaultContentForChatWindow = useStartupStore((state) => {
    return state.setDefaultContentForChatWindow;
  });
  const setDeepThinking = useShortcutsStore((state) => {
    return state.setDeepThinking;
  });
  const setInternetSearch = useShortcutsStore((state) => {
    return state.setInternetSearch;
  });
  const setHistoricalRecords = useShortcutsStore((state) => {
    return state.setHistoricalRecords;
  });
  const setNewSession = useShortcutsStore((state) => {
    return state.setNewSession;
  });
  const setFixedWindow = useShortcutsStore((state) => {
    return state.setFixedWindow;
  });
  const setServiceList = useShortcutsStore((state) => {
    return state.setServiceList;
  });
  const setExternal = useShortcutsStore((state) => {
    return state.setExternal;
  });

  useEffect(() => {
    const unListeners = Promise.all([
      platformAdapter.listenEvent("change-shortcuts-store", ({ payload }) => {
        const {
          modifierKey,
          modeSwitch,
          returnToInput,
          voiceInput,
          addFile,
          deepThinking,
          internetSearch,
          historicalRecords,
          newSession,
          fixedWindow,
          serviceList,
          external,
        } = payload;
        setModifierKey(modifierKey);
        setModeSwitch(modeSwitch);
        setReturnToInput(returnToInput);
        setVoiceInput(voiceInput);
        setAddFile(addFile);
        setDeepThinking(deepThinking);
        setInternetSearch(internetSearch);
        setHistoricalRecords(historicalRecords);
        setNewSession(newSession);
        setFixedWindow(fixedWindow);
        setServiceList(serviceList);
        setExternal(external);
      }),

      platformAdapter.listenEvent("change-startup-store", ({ payload }) => {
        const {
          defaultStartupWindow,
          defaultContentForSearchWindow,
          defaultContentForChatWindow,
        } = payload;
        setDefaultStartupWindow(defaultStartupWindow);
        setDefaultContentForSearchWindow(defaultContentForSearchWindow);
        setDefaultContentForChatWindow(defaultContentForChatWindow);
      }),
    ]);

    return () => {
      unListeners.then((fns) => {
        fns.forEach((fn) => fn());
      });
    };
  }, []);

  useKeyPress(
    modifierKeys,
    (event, key) => {
      if (key === modifierKey) {
        setModifierKeyPressed(event.type === "keydown");
      }
    },
    {
      events: ["keydown", "keyup"],
    }
  );

  return (
    <SearchChat
      isTauri={true}
      querySearch={querySearch}
      queryDocuments={queryDocuments}
      hideCoco={hideCoco}
      hasModules={["search", "chat"]}
    />
  );
}

export default MainApp;
