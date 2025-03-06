import { useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";

import { IServer } from "@/stores/appStore";
import type { Chat } from "@/components/Assistant/types";

export default function useChatActions(currentService: IServer, activeChat?: Chat) {
  const chatClose = useCallback(async () => {
    if (!activeChat?._id) return;
    try {
      await invoke("close_session_chat", {
        serverId: currentService?.id,
        sessionId: activeChat?._id,
      });
    } catch (error) {
      console.error("Failed to close chat:", error);
    }
  }, [currentService?.id, activeChat?._id]);

  const cancelChat = useCallback(async () => {
    if (!activeChat?._id) return;
    try {
      await invoke("cancel_session_chat", {
        serverId: currentService?.id,
        sessionId: activeChat?._id,
      });
    } catch (error) {
      console.error("Failed to cancel chat:", error);
    }
  }, [currentService?.id, activeChat?._id]);

  return { chatClose, cancelChat };
}