import { useShortcutsStore } from "@/stores/shortcutsStore";
import { useStartupStore } from "@/stores/startupStore";
import platformAdapter from "@/utils/platformAdapter";
import { useEffect } from "react";

export const useSyncStore = () => {
  const setModifierKey = useShortcutsStore((state) => {
    return state.setModifierKey;
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
  const setInternetSearchScope = useShortcutsStore((state) => {
    return state.setInternetSearchScope;
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
  const fixedWindow = useShortcutsStore((state) => {
    return state.fixedWindow;
  });
  const resetFixedWindow = useShortcutsStore((state) => {
    return state.resetFixedWindow;
  });
  const setResetFixedWindow = useShortcutsStore((state) => {
    return state.setResetFixedWindow;
  });

  useEffect(() => {
    if (!resetFixedWindow) {
      if (fixedWindow === "F") {
        setFixedWindow("P");
      }

      setResetFixedWindow(true);
    }

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
          internetSearchScope,
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
        setInternetSearchScope(internetSearchScope);
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
};
