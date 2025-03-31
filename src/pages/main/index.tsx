import { useCallback, useEffect } from "react";

import SearchChat from "@/pages/web/SearchChat";
import platformAdapter from "@/utils/platformAdapter";
import { useShortcutsStore } from "@/stores/shortcutsStore";
import { useStartupStore } from "@/stores/startupStore";
import { useKeyPress } from "ahooks";
import { modifierKeys } from "@/components/Settings/Advanced/components/Shortcuts";

function MainApp() {
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
  const setAddImage = useShortcutsStore((state) => {
    return state.setAddImage;
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

  useEffect(() => {
    const unListeners = Promise.all([
      platformAdapter.listenEvent("change-shortcuts-store", ({ payload }) => {
        const {
          modifierKey,
          modeSwitch,
          returnToInput,
          voiceInput,
          addImage,
          addFile,
        } = payload;
        setModifierKey(modifierKey);
        setModeSwitch(modeSwitch);
        setReturnToInput(returnToInput);
        setVoiceInput(voiceInput);
        setAddImage(addImage);
        setAddFile(addFile);
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
    <SearchChat querySearch={querySearch} queryDocuments={queryDocuments} />
  );
}

export default MainApp;
