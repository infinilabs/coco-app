import { useState, useEffect, useCallback, useRef  } from "react";
import { useWebSocket as useWebSocketAHook } from 'ahooks';

import { IServer } from "@/stores/appStore";
import platformAdapter from "@/utils/platformAdapter";
import { useAppStore } from "@/stores/appStore";

enum ReadyState {
  Connecting = 0,
  Open = 1,
  Closing = 2,
  Closed = 3,
}

interface WebSocketProps {
  connected: boolean;
  setConnected: (connected: boolean) => void;
  currentService: IServer | null;
  dealMsgRef: React.MutableRefObject<((msg: string) => void) | null>;
  onWebsocketSessionId?: (sessionId: string) => void;
}

export default function useWebSocket({
  connected,
  setConnected,
  currentService,
  dealMsgRef,
  onWebsocketSessionId,
}: WebSocketProps) {
  const isTauri = useAppStore((state) => state.isTauri);
  const endpoint_websocket = useAppStore((state) => state.endpoint_websocket);

  const [errorShow, setErrorShow] = useState(false);

  const { readyState, latestMessage, disconnect, connect } = useWebSocketAHook(
    "wss://coco.infini.cloud/ws",
    // "ws://localhost:9000/ws",
    // endpoint_websocket
  );

  const websocketIdRef = useRef<string>('')

  useEffect(() => {
    // console.log(readyState, latestMessage, disconnect, connect)
    if (readyState === ReadyState.Open) {
      console.log("WebSocket message size:", latestMessage?.data?.length, "bytes");
      if (latestMessage?.data?.length > 1024 * 10) { // 10KB
        console.warn("Large message received:", latestMessage?.data?.substring(0, 100) + "...");
      }
      
      if (!latestMessage?.data) return;
      const msg = latestMessage?.data as unknown as string;
      
      console.log("55555", msg.includes("fetch_source"));
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
    } else {
      setConnected(false);
    }
  }, [readyState, latestMessage?.data]);

  const reconnect = useCallback(async (server?: IServer) => {
    if (isTauri) {
      const targetServer = server || currentService;
      if (!targetServer?.id) return;
      try {
        // console.log("reconnect", targetServer.id);
        await platformAdapter.invokeBackend("connect_to_server", { id: targetServer.id });
      } catch (error) {
        setConnected(false);
        console.error("Failed to connect:", error);
      }
    } else {
      connect();
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

      if (isTauri) {
        unlisten_error = platformAdapter.listenEvent("ws-error", (event) => {
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
  
        unlisten_message = platformAdapter.listenEvent("ws-message", (event) => {
          const msg = event.payload as unknown as string;
          dealMsgRef.current && dealMsgRef.current(msg);
        });
      } else {

      }
      
    }

    return () => {
      unlisten_error?.then((fn: any) => fn());
      unlisten_message?.then((fn: any) => fn());
    };
  }, [connected, dealMsgRef]);

  return { errorShow, setErrorShow, reconnect, updateDealMsg };
}