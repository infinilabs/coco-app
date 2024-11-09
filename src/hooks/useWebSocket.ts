import { useEffect, useState } from "react";

export function useWebSocket(
  url: string,
  filterMessages?: (message: string) => string
) {
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [messages, setMessages] = useState<string>("");
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    // 创建 WebSocket 连接
    const websocket = new WebSocket(url);

    websocket.onopen = () => {
      console.log("WebSocket 连接成功");
      setConnected(true);
    };

    websocket.onmessage = (event) => {
      // console.log("收到消息:", event.data);
      const data = filterMessages ? filterMessages(event.data) : event.data;
      if (data) {
        setMessages((prevMessages) => prevMessages + data);
      }
    };

    websocket.onclose = () => {
      console.log("WebSocket 连接关闭");
      setConnected(false);
    };

    websocket.onerror = (error) => {
      console.error("WebSocket 连接错误:", error);
    };

    // 将 WebSocket 实例保存在状态中
    setWs(websocket);

    // 在组件卸载时关闭 WebSocket 连接
    return () => {
      websocket.close();
    };
  }, [url]);

  // 发送消息的函数
  const sendMessage = (message: string) => {
    if (ws && connected) {
      ws.send(message);
      console.log("发送消息:", message);
    }
  };

  return { messages, connected, sendMessage, setMessages };
}
