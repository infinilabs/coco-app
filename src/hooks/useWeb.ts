import { useState, useEffect, useRef, useCallback } from 'react';

interface UseWebSocketOptions {
  url: string;
  onOpen?: (event: Event) => void;
  onClose?: (event: CloseEvent) => void;
  onError?: (event: Event) => void;
  onMessage?: (message: any) => void;
  reconnectLimit?: number;
  reconnectInterval?: number;
}

export const useWebSocket = (options: UseWebSocketOptions) => {
  const {
    url,
    onOpen,
    onClose,
    onError,
    onMessage,
    reconnectLimit = 3,
    reconnectInterval = 3000
  } = options;

  const [readyState, setReadyState] = useState<number>(WebSocket.CONNECTING);
  const [message, setMessage] = useState<any>(null);
  const [error, setError] = useState<Event | null>(null);
  
  const ws = useRef<WebSocket | null>(null);
  const reconnectCount = useRef(0);
  const reconnectTimer = useRef<NodeJS.Timeout>();
  const messageQueue = useRef<any[]>([]);

  const connect = useCallback(() => {
    try {
      if (ws.current?.readyState === WebSocket.OPEN) {
        console.warn('WebSocket 已经连接');
        return;
      }

      ws.current = new WebSocket(url);

      ws.current.onopen = (event) => {
        setReadyState(WebSocket.OPEN);
        reconnectCount.current = 0;
        onOpen?.(event);
      };

      ws.current.onmessage = (event) => {
        messageQueue.current.push(event.data);
        setMessage(event.data);
        onMessage?.(event.data);
      };

      ws.current.onclose = (event) => {
        setReadyState(WebSocket.CLOSED);
        onClose?.(event);
        
        // 自动重连
        if (reconnectCount.current < reconnectLimit) {
          reconnectTimer.current = setTimeout(() => {
            reconnectCount.current++;
            connect();
          }, reconnectInterval);
        }
      };

      ws.current.onerror = (event) => {
        setError(event);
        onError?.(event);
      };
    } catch (err) {
      console.error('WebSocket 连接失败:', err);
    }
  }, [url, onOpen, onClose, onError, onMessage, reconnectLimit, reconnectInterval]);

  const close = useCallback(() => {
    if (reconnectTimer.current) {
      clearTimeout(reconnectTimer.current);
    }
    ws.current?.close(1000);
    setReadyState(WebSocket.CLOSED);
  }, []);

  useEffect(() => {
    connect();
    return () => {
      close();
    };
  }, [connect, close]);

  return {
    readyState,
    message,
    error,
    sendMessage: useCallback((data: string | ArrayBuffer | Blob) => {
      if (ws.current?.readyState === WebSocket.OPEN) {
        ws.current.send(data);
      } else {
        throw new Error('WebSocket 未连接');
      }
    }, []),
    close,
    messageQueue: messageQueue.current,
  };
};