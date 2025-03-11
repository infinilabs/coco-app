import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

import { IServer } from "@/stores/appStore";

interface WebSocketProps {
  connected: boolean;
  setConnected: (connected: boolean) => void;
  currentService: IServer | null;
  dealMsgRef: React.MutableRefObject<((msg: string) => void) | null>;
}

export default function useWebSocket({
  connected,
  setConnected,
  currentService,
  dealMsgRef,
}: WebSocketProps) {
  const [errorShow, setErrorShow] = useState(false);

  const reconnect = useCallback(async (server?: IServer) => {
    const targetServer = server || currentService;
    if (!targetServer?.id) return;
    try {
      console.log("reconnect", targetServer.id);
      await invoke("connect_to_server", { id: targetServer.id });
      setConnected(true);
    } catch (error) {
      setConnected(false);
      console.error("Failed to connect:", error);
    }
  }, [currentService]);

  const updateDealMsg = useCallback((newDealMsg: (msg: string) => void) => {
    dealMsgRef.current = newDealMsg;
  }, [dealMsgRef]);

  useEffect(() => {
    if (!currentService?.id) return;

    let unlisten_error = null;
    let unlisten_message = null;

    if (connected) {
      setErrorShow(false);
      unlisten_error = listen("ws-error", (event) => {
        // {
        //   "error": {
        //      "reason": "invalid login"
        //   },
        //   "status": 401
        // }
        console.log("ws-error", event.payload);
        console.error("WebSocket error:", event.payload);
        setConnected(false);
        setErrorShow(true);
      });
      
      unlisten_message = listen("ws-message", (event) => {
        const msg = event.payload as string;
        dealMsgRef.current && dealMsgRef.current(msg);
      });
    }

    return () => {
      unlisten_error?.then((fn: any) => fn());
      unlisten_message?.then((fn: any) => fn());
    };
  }, [connected, dealMsgRef]);

  return { errorShow, setErrorShow, reconnect, updateDealMsg };
}