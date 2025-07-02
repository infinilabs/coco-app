import { useEffect, useCallback, useRef } from "react";
import { useWebSocket as useWebSocketAHook } from "ahooks";

import { useAppStore } from "@/stores/appStore";
import platformAdapter from "@/utils/platformAdapter";
import { Server } from "@/types/server";
import { useConnectStore } from "@/stores/connectStore";

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
  dealMsgRef: React.MutableRefObject<((msg: string) => void) | null>;
  onWebsocketSessionId?: (sessionId: string) => void;
}

export default function useWebSocket({
  clientId,
  connected,
  setConnected,
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
  const { readyState, connect, disconnect } = useWebSocketAHook(
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
          setConnected(true); // web connected
          console.log("setConnected:", sessionId);
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
  useEffect(() => {
    // web
    if (readyState !== ReadyState.Open) {
      setConnected(false); // state
    }
  }, [readyState]);

  // Tauri
  // 1. WebSocket connects when loading or switching services
  // src/components/Assistant/ChatHeader.tsx
  // 2. If not connected or disconnected, input box has a connect button, clicking it will connect to WebSocket
  // src/components/Search/InputBox.tsx
  const reconnect = useCallback(
    async (server?: Server) => {
      setConnected(false); // Disconnect before attempting to reconnect
      if (isTauri) {
        const targetServer = server || currentService;
        if (!targetServer?.id) return;
        try {
          // console.log("reconnect", targetServer.id);
          await platformAdapter.commands("connect_to_server", targetServer.id, clientId);
        } catch (error) {
          setConnected(false); // error
          console.error("Failed to connect:", error);
        }
      } else {
        connect();
      }
    },
    [currentService, clientId]
  );
  const disconnectWS = useCallback(async () => {
    if (!connected) return;
    if (isTauri) {
      try {
        console.log("disconnect");
        await platformAdapter.commands("disconnect", clientId);
        setConnected(false); // disconnected
      } catch (error) {
        console.error("Failed to disconnect:", error);
      }
    } else {
      disconnect();
    }
  }, [connected]);

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

    const unlisten_message = platformAdapter.listenEvent(`ws-message-${clientId}`, (event) => {
      const msg = event.payload as string;
      // console.log(`ws-message-${clientId}`, msg);
      if (msg.includes("websocket-session-id")) {
        const sessionId = msg.split(":")[1].trim();
        websocketIdRef.current = sessionId;
        console.log("setConnected sessionId:", sessionId);
        setConnected(true); // Tauri connected
        if (onWebsocketSessionId) {
          onWebsocketSessionId(sessionId);
        }
        // Listen for errors
        unlistenErrorRef.current = platformAdapter.listenEvent(`ws-error-${clientId}`, (event) => {
          if (connected) {
            const id = event.payload as string;
            console.error(`ws-error-${clientId}`, id === currentService?.id, connected);
            if (id === currentService?.id) {
              addError("WebSocket connection failed.");
            }
          }
          setConnected(false); // error
        });
        // Listen for cancel
        unlistenCancelRef.current = platformAdapter.listenEvent(`ws-cancel-${clientId}`, () => {
          setConnected(false);
        });

        return;
      }
      dealMsgRef.current?.(msg);
    });

    return () => {
      unlisten_message.then((fn) => fn());
      if (unlistenErrorRef.current) {
        unlistenErrorRef.current.then((fn) => fn());
      }
      if (unlistenCancelRef.current) {
        unlistenCancelRef.current.then((fn) => fn());
      }
    };
  }, [currentService?.id, dealMsgRef, connected, clientId]);

  return { reconnect, disconnectWS, updateDealMsg };
}