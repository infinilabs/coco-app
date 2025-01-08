import { useEffect, useState, useCallback } from "react";

export function useWebSocket(
  url: string,
  filterMessages?: (message: string) => string
) {
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [messages, setMessages] = useState<string>("");
  const [connected, setConnected] = useState(false);
  const [shouldReconnect, setShouldReconnect] = useState(true);

  const createWebSocket = useCallback(() => {
    console.log("createWebSocket li")
    const websocket = new WebSocket(url);

    websocket.onopen = () => {
      console.log("WebSocket connected");
      setConnected(true);
    };

    websocket.onmessage = (event) => {
      const data = filterMessages ? filterMessages(event.data) : event.data;
      if (data) {
        setMessages((prevMessages) => prevMessages + data);
      }
    };

    websocket.onclose = () => {
      console.log("WebSocket closed");
      setConnected(false);
      if (shouldReconnect) {
        console.log("Attempting to reconnect...");
        setTimeout(() => createWebSocket(), 5000);
      }
    };

    websocket.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    setWs(websocket);
  }, [url, filterMessages, shouldReconnect]);

  const reconnect = useCallback(() => {
    console.log("Manually reconnecting WebSocket...");
    if (ws) {
      ws.close();
    }
    createWebSocket();
  }, [ws]);

  useEffect(() => {
    console.log("useEffect init")
    createWebSocket();

    return () => {
      setShouldReconnect(false);
      ws?.close();
    };
  }, []);

  const sendMessage = (message: string) => {
    if (ws && connected) {
      ws.send(message);
      console.log("Send:", message);
    }
  };

  return {
    messages,
    connected,
    sendMessage,
    setMessages,
    setConnected,
    reconnect,
  };
}
