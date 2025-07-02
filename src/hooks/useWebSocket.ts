import { useEffect, useCallback, useRef } from "react";
import { useWebSocket as useWebSocketAHook } from "ahooks";

import { useAppStore } from "@/stores/appStore";
import platformAdapter from "@/utils/platformAdapter";
import { useConnectStore } from "@/stores/connectStore";

interface WebSocketProps {
  clientId: string;
  dealMsgRef: React.MutableRefObject<((msg: string) => void) | null>;
  onWebsocketSessionId?: (sessionId: string) => void;
}

export default function useWebSocket({
  clientId,
  dealMsgRef,
  onWebsocketSessionId,
}: WebSocketProps) {
  const isTauri = useAppStore((state) => state.isTauri);
  const endpoint_websocket = useAppStore((state) => state.endpoint_websocket);
  const addError = useAppStore((state) => state.addError);

  const currentService = useConnectStore((state) => state.currentService);

  const websocketIdRef = useRef<string>("");
  const messageQueue = useRef<string[]>([]);
  const processingRef = useRef(false);

  // web
  const { connect } = useWebSocketAHook(
    //"wss://coco.infini.cloud/ws",
    //"ws://localhost:9000/ws",
    isTauri ? "" : endpoint_websocket,
    {
      manual: true,
      reconnectLimit: 3,
      reconnectInterval: 3000,
      onMessage: (event) => {
        const msg = event.data as string;
        messageQueue.current.push(msg);
        processQueue();
      },
    }
  );
  useEffect(() => {
    if (!isTauri) {
      connect(); // web
    }
  }, [isTauri, connect]);

  const processMessage = useCallback(
    (msg: string) => {
      try {
        if (msg.includes("websocket-session-id")) {
          const sessionId = msg.split(":")[1].trim();
          websocketIdRef.current = sessionId;
          onWebsocketSessionId?.(sessionId);
        } else {
          dealMsgRef.current?.(msg);
        }
      } catch (error) {
        console.error("Error processing message:", error, msg);
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
        // console.log("Processing message:", msg.substring(0, 100));
        processMessage(msg);
      }
    }
    processingRef.current = false;
  }, [processMessage]);

  const updateDealMsg = useCallback(
    (newDealMsg: (msg: string) => void) => {
      dealMsgRef.current = newDealMsg;
    },
    [dealMsgRef]
  );

  const unlistenErrorRef = useRef<Promise<() => void> | null>(null);
  const unlistenCancelRef = useRef<Promise<() => void> | null>(null);
  useEffect(() => {
    if (!isTauri || !currentService?.id) return;

    const unlisten_message = platformAdapter.listenEvent(
      `ws-message-${clientId}`,
      (event) => {
        const msg = event.payload as string;
        // console.log(`ws-message-${clientId}`, msg);
        if (msg.includes("websocket-session-id")) {
          const sessionId = msg.split(":")[1].trim();
          websocketIdRef.current = sessionId;
          if (onWebsocketSessionId) {
            onWebsocketSessionId(sessionId);
          }
          // Listen for errors
          unlistenErrorRef.current = platformAdapter.listenEvent(
            `chat-create-stream`,
            (event) => {
              console.log("chat-create-stream", event);
              const id = event.payload as string;
              console.error(
                `ws-error-${clientId}`,
                id === currentService?.id,
              );
              if (id === currentService?.id) {
                addError("WebSocket connection failed.");
              }
            }
          );
          return;
        }
        dealMsgRef.current?.(msg);
      }
    );

    return () => {
      unlisten_message.then((fn) => fn());
      if (unlistenErrorRef.current) {
        unlistenErrorRef.current.then((fn) => fn());
      }
      if (unlistenCancelRef.current) {
        unlistenCancelRef.current.then((fn) => fn());
      }
    };
  }, [currentService?.id, dealMsgRef, clientId]);

  return { updateDealMsg };
}
