import { isNumber } from "lodash-es";
import { useEffect } from "react";

import { useAppearanceStore } from "@/stores/appearanceStore";
import { useAppStore } from "@/stores/appStore";
import { useConnectStore } from "@/stores/connectStore";
import { useExtensionsStore } from "@/stores/extensionsStore";
import { useShortcutsStore } from "@/stores/shortcutsStore";
import { useStartupStore } from "@/stores/startupStore";
import platformAdapter from "@/utils/platformAdapter";

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
  const setMcpSearch = useShortcutsStore((state) => {
    return state.setMcpSearch;
  });
  const setMcpSearchScope = useShortcutsStore((state) => {
    return state.setMcpSearchScope;
  });
  const setHistoricalRecords = useShortcutsStore((state) => {
    return state.setHistoricalRecords;
  });
  const setAiAssistant = useShortcutsStore((state) => {
    return state.setAiAssistant;
  });
  const setNewSession = useShortcutsStore((state) => {
    return state.setNewSession;
  });
  const setFixedWindow = useShortcutsStore((state) => {
    return state.setFixedWindow;
  });
  const setServiceListShortcut = useShortcutsStore((state) => {
    return state.setServiceListShortcut;
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
  const setConnectionTimeout = useConnectStore((state) => {
    return state.setConnectionTimeout;
  });
  const setQueryTimeout = useConnectStore((state) => {
    return state.setQuerySourceTimeout;
  });
  const setOpacity = useAppearanceStore((state) => state.setOpacity);
  const setSnapshotUpdate = useAppearanceStore((state) => {
    return state.setSnapshotUpdate;
  });
  const setAllowSelfSignature = useConnectStore((state) => {
    return state.setAllowSelfSignature;
  });
  const setQuickAiAccessServer = useExtensionsStore((state) => {
    return state.setQuickAiAccessServer;
  });
  const setQuickAiAccessAssistant = useExtensionsStore((state) => {
    return state.setQuickAiAccessAssistant;
  });
  const setAiOverviewServer = useExtensionsStore((state) => {
    return state.setAiOverviewServer;
  });
  const setAiOverviewAssistant = useExtensionsStore((state) => {
    return state.setAiOverviewAssistant;
  });
  const setDisabledExtensions = useExtensionsStore((state) => {
    return state.setDisabledExtensions;
  });
  const setAiOverviewCharLen = useExtensionsStore((state) => {
    return state.setAiOverviewCharLen;
  });
  const setAiOverviewDelay = useExtensionsStore((state) => {
    return state.setAiOverviewDelay;
  });
  const setAiOverview = useShortcutsStore((state) => state.setAiOverview);
  const setAiOverviewMinQuantity = useExtensionsStore((state) => {
    return state.setAiOverviewMinQuantity;
  });
  const setShowTooltip = useAppStore((state) => state.setShowTooltip);
  const setEndpoint = useAppStore((state) => state.setEndpoint);
  const setLanguage = useAppStore((state) => state.setLanguage);
  
  const setServerListSilently = useConnectStore((state) => state.setServerListSilently);

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
          mcpSearch,
          mcpSearchScope,
          historicalRecords,
          aiAssistant,
          newSession,
          fixedWindow,
          serviceListShortcut,
          external,
          aiOverview,
        } = payload;

        setModifierKey(modifierKey);
        setModeSwitch(modeSwitch);
        setReturnToInput(returnToInput);
        setVoiceInput(voiceInput);
        setAddFile(addFile);
        setDeepThinking(deepThinking);
        setInternetSearch(internetSearch);
        setInternetSearchScope(internetSearchScope);
        setMcpSearch(mcpSearch);
        setMcpSearchScope(mcpSearchScope);
        setHistoricalRecords(historicalRecords);
        setAiAssistant(aiAssistant);
        setNewSession(newSession);
        setFixedWindow(fixedWindow);
        setServiceListShortcut(serviceListShortcut);
        setExternal(external);
        setAiOverview(aiOverview);
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

      platformAdapter.listenEvent("change-connect-store", ({ payload }) => {
        const {
          connectionTimeout,
          querySourceTimeout,
          allowSelfSignature,
        } = payload;
        if (isNumber(connectionTimeout)) {
          setConnectionTimeout(connectionTimeout);
        }
        if (isNumber(querySourceTimeout)) {
          setQueryTimeout(querySourceTimeout);
        }
        setAllowSelfSignature(allowSelfSignature);
      }),

      platformAdapter.listenEvent("change-appearance-store", ({ payload }) => {
        const { opacity, snapshotUpdate } = payload;

        if (isNumber(opacity)) {
          setOpacity(opacity);
        }
        setSnapshotUpdate(snapshotUpdate);
      }),

      platformAdapter.listenEvent("change-extensions-store", ({ payload }) => {
        const {
          quickAiAccessServer,
          quickAiAccessAssistant,
          aiOverviewServer,
          aiOverviewAssistant,
          disabledExtensions,
          aiOverviewCharLen,
          aiOverviewDelay,
          aiOverviewMinQuantity,
        } = payload;

        setQuickAiAccessServer(quickAiAccessServer);
        setQuickAiAccessAssistant(quickAiAccessAssistant);
        setAiOverviewServer(aiOverviewServer);
        setAiOverviewAssistant(aiOverviewAssistant);
        setDisabledExtensions(disabledExtensions);
        setAiOverviewCharLen(aiOverviewCharLen);
        setAiOverviewDelay(aiOverviewDelay);
        setAiOverviewMinQuantity(aiOverviewMinQuantity);
      }),

      platformAdapter.listenEvent("change-app-store", ({ payload }) => {
        const { showTooltip, endpoint, language } = payload;

        setShowTooltip(showTooltip);
        setEndpoint(endpoint);
        setLanguage(language);
      }),

      platformAdapter.listenEvent("server-list-changed", ({ payload }) => {
        setServerListSilently(payload);
      }),
    ]);

    return () => {
      unListeners.then((fns) => {
        fns.forEach((fn) => fn());
      });
    };
  }, []);
};
