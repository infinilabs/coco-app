import { useState, useEffect, useCallback, useRef } from "react";
import { useWebSocket as useWebSocketAHook } from "ahooks";

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

  const websocketIdRef = useRef<string>("");
  const messageQueue = useRef<string[]>([]);
  const processingRef = useRef(false);

  const { readyState, connect } = useWebSocketAHook(
    "wss://coco.infini.cloud/ws",
    // "ws://localhost:9000/ws",
    // endpoint_websocket,
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

  const reconnect = useCallback(
    async (server?: IServer) => {
      if (isTauri) {
        const targetServer = server || currentService;
        if (!targetServer?.id) return;
        try {
          // console.log("reconnect", targetServer.id);
          await platformAdapter.invokeBackend("connect_to_server", {
            id: targetServer.id,
          });
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

        unlisten_message = platformAdapter.listenEvent(
          "ws-message",
          (event) => {
            const msg = event.payload as unknown as string;
            dealMsgRef.current && dealMsgRef.current(msg);
          }
        );
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
