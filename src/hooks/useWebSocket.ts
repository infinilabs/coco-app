import { useState, useEffect, useCallback, useRef } from "react";
import { listen } from "@tauri-apps/api/event";

import { IServer } from "@/stores/appStore";
import { connect_to_server, disconnect } from "@/commands"

interface WebSocketProps {
  clientId: string;
  connected: boolean;
  setConnected: (connected: boolean) => void;
  currentService: IServer | null;
  dealMsgRef: React.MutableRefObject<((msg: string) => void) | null>;
  onWebsocketSessionId?: (sessionId: string) => void;
}

export default function useWebSocket({
  clientId,
  connected,
  setConnected,
  currentService,
  dealMsgRef,
  onWebsocketSessionId,
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

  const websocketIdRef = useRef<string>('')

  useEffect(() => {
    if (!currentService?.id) return;

    let unlisten_error = null;
    let unlisten_message = null;

    setErrorShow(false);
    unlisten_error = listen(`ws-error-${clientId}`, (event) => {
      // {
      //   "error": {
      //      "reason": "invalid login"
      //   },
      //   "status": 401
      // }
      console.error(`ws-error-${clientId}`, event.payload);
      setConnected(false);
      setErrorShow(true);
    });

    unlisten_message = listen(`ws-message-${clientId}`, (event) => {
      const msg = event.payload as string;
      console.log(`ws-message-${clientId}`, msg);
      if (msg.includes("websocket-session-id")) {
        console.log("websocket-session-id:", msg);
        const sessionId = msg.split(":")[1].trim();
        websocketIdRef.current = sessionId;
        console.log("sessionId:", sessionId);
        setConnected(true);
        if (onWebsocketSessionId) {
          onWebsocketSessionId(sessionId);
        }
        return;
      }
      dealMsgRef.current && dealMsgRef.current(msg);
    });


    return () => {
      unlisten_error?.then((fn: any) => fn());
      unlisten_message?.then((fn: any) => fn());
    };
  }, [dealMsgRef]);

  return { errorShow, setErrorShow, reconnect, disconnectWS, updateDealMsg };
}