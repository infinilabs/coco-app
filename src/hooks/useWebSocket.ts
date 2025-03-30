import { useState, useEffect, useCallback } from "react";
import { listen } from "@tauri-apps/api/event";

import { IServer } from "@/stores/appStore";
import { connect_to_server, disconnect } from "@/commands"

interface WebSocketProps {
  clientId: string;
  connected: boolean;
  setConnected: (connected: boolean) => void;
  currentService: IServer | null;
  dealMsgRef: React.MutableRefObject<((msg: string) => void) | null>;
}

export default function useWebSocket({
  clientId,
  connected,
  setConnected,
  currentService,
  dealMsgRef,
}: WebSocketProps) {
  const [errorShow, setErrorShow] = useState(false);

  // 1. WebSocket connects when loading or switching services
  // src/components/Assistant/ChatHeader.tsx
  // 2. If not connected or disconnected, input box has a connect button, clicking it will connect to WebSocket
  // src/components/Search/InputBox.tsx
  const reconnect = useCallback(async (server?: IServer) => {
    const targetServer = server || currentService;
    console.log("reconnect_targetServer", targetServer?.id);
    if (!targetServer?.id) return;
    try {
      console.log("reconnect", targetServer.id, clientId);
      await connect_to_server(targetServer.id, clientId);
      setConnected(true);
    } catch (error) {
      setConnected(false);
      console.error("Failed to connect:", error);
    }
  }, [currentService]);

  const disconnectWS = async () => {
    if (!connected) return;
    try {
      console.log("disconnect");
      await disconnect(clientId);
      setConnected(false);
    } catch (error) {
      console.error("Failed to disconnect:", error);
    }
  };

  const updateDealMsg = useCallback((newDealMsg: (msg: string) => void) => {
    dealMsgRef.current = newDealMsg;
  }, [dealMsgRef]);

  useEffect(() => {
    if (!currentService?.id) return;

    let unlisten_error = null;
    let unlisten_message = null;

    if (connected) {
      setErrorShow(false);
      unlisten_error = listen(`ws-error-${clientId}`, (event) => {
        // {
        //   "error": {
        //      "reason": "invalid login"
        //   },
        //   "status": 401
        // }
        console.log(`ws-error-${clientId}`, event.payload);
        console.error("WebSocket error:", event.payload);
        setConnected(false);
        setErrorShow(true);
      });

      unlisten_message = listen(`ws-message-${clientId}`, (event) => {
        const msg = event.payload as string;
        dealMsgRef.current && dealMsgRef.current(msg);
      });
    }

    return () => {
      unlisten_error?.then((fn: any) => fn());
      unlisten_message?.then((fn: any) => fn());
    };
  }, [connected, dealMsgRef]);

  return { errorShow, setErrorShow, reconnect, disconnectWS, updateDealMsg };
}