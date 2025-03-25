import { useState, useEffect, useCallback,  } from "react";
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
}

export default function useWebSocket({
  connected,
  setConnected,
  currentService,
  dealMsgRef,
}: WebSocketProps) {
  const isTauri = useAppStore((state) => state.isTauri);
  const endpoint_websocket = useAppStore((state) => state.endpoint_websocket);

  const [errorShow, setErrorShow] = useState(false);

  const { readyState, latestMessage, disconnect, connect } = useWebSocketAHook(
    // "wss://coco.infini.cloud/ws",
    // "ws://localhost:9000/ws",
    endpoint_websocket
  );

  useEffect(() => {
    console.log(readyState, latestMessage, disconnect, connect)
    if (readyState === ReadyState.Open) {
      setConnected(true);
      console.log(12121212)
      // if (latestMessage?.data.includes("websocket-session-id")) {
      //   const array = msg.split(" ");
      //   websocketIdRef.current = array[2];
      //   return "";
      // } else 
      latestMessage?.data && dealMsgRef.current && dealMsgRef.current(latestMessage?.data || "");
    } else {
      setConnected(false);
    }
  }, [readyState, latestMessage]);

  const reconnect = useCallback(async (server?: IServer) => {
    if (isTauri) {
      const targetServer = server || currentService;
      if (!targetServer?.id) return;
      try {
        console.log("reconnect", targetServer.id);
        await platformAdapter.invokeBackend("connect_to_server", { id: targetServer.id });
        setConnected(true);
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