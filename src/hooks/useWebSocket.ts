import { useEffect, useState } from "react";

export function useWebSocket(
  url: string,
  filterMessages?: (message: string) => string
) {
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [messages, setMessages] = useState<string>("");
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    // Create WebSocket
    const websocket = new WebSocket(url);

    websocket.onopen = () => {
      console.log("WebSocket success");
      setConnected(true);
    };

    websocket.onmessage = (event) => {
      // console.log("data:", event.data);
      const data = filterMessages ? filterMessages(event.data) : event.data;
      if (data) {
        setMessages((prevMessages) => prevMessages + data);
      }
    };

    websocket.onclose = () => {
      console.log("WebSocket close");
      setConnected(false);
    };

    websocket.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    setWs(websocket);

    return () => {
      websocket.close();
    };
  }, [url]);

  const sendMessage = (message: string) => {
    if (ws && connected) {
      ws.send(message);
      console.log("Send:", message);
    }
  };

  return { messages, connected, sendMessage, setMessages, setConnected };
}
