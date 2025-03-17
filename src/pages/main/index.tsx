import { useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";

import SearchChat from "@/pages/web/SearchChat";
import InputBox from "@/components/Search/InputBox";
import Search from "@/components/Search/Search";
import ChatAI, { ChatAIRef } from "@/components/Assistant/Chat";
import { useAppStore } from "@/stores/appStore";
import { useAuthStore } from "@/stores/authStore";
import { isLinux, isWin } from "@/utils/platform";
import UpdateApp from "@/components/UpdateApp";
import { listen, UnlistenFn } from "@tauri-apps/api/event";
import { IStartupStore, useStartupStore } from "@/stores/startupStore";
import { useAsyncEffect } from "ahooks";

let showCocoListen: UnlistenFn;

function MainApp() {
  const querySearch = useCallback(async (input: string) => {
    try {
      const response: any = await invoke("query_coco_fusion", {
        from: 0,
        size: 10,
        queryStrings: { query: input },
      });
      return response;
    } catch (error) {
      console.error("query_coco_fusion error:", error);
      throw error;
    }
  }, []);

  const queryDocuments = useCallback(
    async (from: number, size: number, queryStrings: any) => {
      try {
        const response: any = await invoke("query_coco_fusion", {
          from,
          size,
          queryStrings,
        });
        return response;
      } catch (error) {
        console.error("query_coco_fusion error:", error);
        throw error;
      }
    },
    []
  );

      invoke("hide_coco").then(() => {
        console.log("Hide Coco");
      });
    };

    const handleFocus = () => {
      // Optionally, show the window if needed when focus is regained
      // console.log("Window focused");
    };

    window.addEventListener("blur", handleBlur);
    window.addEventListener("focus", handleFocus);

    // Clean up event listeners on component unmount
    return () => {
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("focus", handleFocus);
    };
  }, [isPinned]);

  const chatAIRef = useRef<ChatAIRef>(null);

  const [isChatMode, setIsChatMode] = useState(false);
  const [input, setInput] = useState("");
  const [isTransitioned, setIsTransitioned] = useState(false);

  const [isSearchActive, setIsSearchActive] = useState(false);
  const [isDeepThinkActive, setIsDeepThinkActive] = useState(false);

  const defaultStartupWindow = useStartupStore((state) => {
    return state.defaultStartupWindow;
  });
  const setDefaultStartupWindow = useStartupStore((state) => {
    return state.setDefaultStartupWindow;
  });

  useEffect(() => {
    listen<IStartupStore>("change-startup-store", ({ payload }) => {
      setDefaultStartupWindow(payload.defaultStartupWindow);
    });
  }, []);

  useAsyncEffect(async () => {
    showCocoListen?.();

    showCocoListen = await listen("show-coco", () => {
      changeMode(defaultStartupWindow === "chatMode");
    });
  }, [defaultStartupWindow]);

  async function changeMode(value: boolean) {
    setIsChatMode(value);
    setIsTransitioned(value);
  }

  function changeInput(value: string) {
    setInput(value);
  }

  const handleSendMessage = async (value: string) => {
    setInput(value);
    if (isChatMode) {
      if (isTauri()) {
        await getCurrentWebviewWindow()?.setSize(new LogicalSize(680, 596));
      }
      chatAIRef.current?.init(value);
    }
  };
  const cancelChat = () => {
    chatAIRef.current?.cancelChat();
  };

  const reconnect = () => {
    chatAIRef.current?.reconnect();
  };
  const isTyping = false;

  return (
    <SearchChat
      querySearch={querySearch}
      queryDocuments={queryDocuments}
    />
  );
}

export default MainApp;
