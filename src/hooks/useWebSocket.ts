import { useState, useEffect, useCallback, useRef } from "react";
import { useWebSocket as useWebSocketAHook } from "ahooks";

import { useAppStore, IServer } from "@/stores/appStore";
import { connect_to_server, disconnect } from "@/commands"
import platformAdapter from "@/utils/platformAdapter";

enum ReadyState {
  Connecting = 0,
  Open = 1,
  Closing = 2,
  Closed = 3,
}

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
  const isTauri = useAppStore((state) => state.isTauri);
  const endpoint_websocket = useAppStore((state) => state.endpoint_websocket);

  const websocketIdRef = useRef<string>("");
  const messageQueue = useRef<string[]>([]);
  const processingRef = useRef(false);

  const { readyState, connect } = useWebSocketAHook(
    // "wss://coco.infini.cloud/ws",
    // "ws://localhost:9000/ws",
    endpoint_websocket,
    {
      manual: false,
      reconnectLimit: 3,
      reconnectInterval: 3000,
      onMessage: (event) => {
        const msg = event.data as string;
        messageQueue.current.push(msg);
        processQueue();
      },
    }
  );

  const processMessage = useCallback(
    (msg: string) => {
      try {
        if (msg.includes("websocket-session-id")) {
          const sessionId = msg.split(":")[1].trim();
          websocketIdRef.current = sessionId;
          setConnected(true);
          onWebsocketSessionId?.(sessionId);
        } else {
          dealMsgRef.current?.(msg);
        }
      } catch (error) {
        console.error("处理消息出错:", error, msg);
      }
    },
    [onWebsocketSessionId]
  );

  const processQueue = useCallback(() => {
    if (processingRef.current || messageQueue.current.length === 0) return;

    processingRef.current = true;
    while (messageQueue.current.length > 0) {
      const msg = messageQueue.current.shift();
      if (msg) {
        console.log("处理消息:", msg.substring(0, 100));
        processMessage(msg);
      }
    }
    processingRef.current = false;
  }, [processMessage]);

  useEffect(() => {
    if (readyState !== ReadyState.Open) {
      setConnected(false);
    }
  }, [readyState]);

  const [errorShow, setErrorShow] = useState(false);

  // 1. WebSocket connects when loading or switching services
  // src/components/Assistant/ChatHeader.tsx
  // 2. If not connected or disconnected, input box has a connect button, clicking it will connect to WebSocket
  // src/components/Search/InputBox.tsx
  const reconnect = useCallback(
    async (server?: IServer) => {
      if (isTauri) {
        const targetServer = server || currentService;
        if (!targetServer?.id) return;
        try {
          // console.log("reconnect", targetServer.id);
          await connect_to_server(targetServer.id, clientId);
        } catch (error) {
          setConnected(false);
          console.error("Failed to connect:", error);
        }
      } else {
        connect();
      }
    },
    [currentService]
  );


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

  const updateDealMsg = useCallback(
    (newDealMsg: (msg: string) => void) => {
      dealMsgRef.current = newDealMsg;
    },
    [dealMsgRef]
  );

  useEffect(() => {
    if (!currentService?.id) return;

    let unlisten_error = null;
    let unlisten_message = null;

    setErrorShow(false);

    if (!isTauri) return;
    unlisten_error = platformAdapter.listenEvent(`ws-error-${clientId}`, (event) => {
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

    unlisten_message = platformAdapter.listenEvent(`ws-message-${clientId}`, (event) => {
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