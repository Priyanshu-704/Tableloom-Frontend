import { logger } from "../../common/utils/logger.js";
import { useEffect, useRef, useState } from "react";
export function useWebSocket(url, options = {}) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState(null);
  const [reconnectCount, setReconnectCount] = useState(0);
  const ws = useRef(null);
  const connect = () => {
    try {
      ws.current = new WebSocket(url);
      ws.current.onopen = () => {
        logger.info("WebSocket connected");
        setIsConnected(true);
        if (options.onOpen) options.onOpen();
      };
      ws.current.onmessage = (event) => {
        const data = JSON.parse(event.data);
        setLastMessage(data);
        if (options.onMessage) options.onMessage(data);
      };
      ws.current.onclose = () => {
        logger.info("WebSocket disconnected");
        setIsConnected(false);
        if (options.autoReconnect && reconnectCount < 5) {
          setTimeout(() => {
            setReconnectCount((prev) => prev + 1);
            connect();
          }, 3000);
        }
      };
      ws.current.onerror = (error) => {
        logger.error("WebSocket error:", error);
        if (options.onError) options.onError(error);
      };
    } catch (error) {
      logger.error("Failed to connect WebSocket:", error);
    }
  };
  const sendMessage = (message) => {
    if (ws.current && isConnected) {
      ws.current.send(JSON.stringify(message));
    }
  };
  const disconnect = () => {
    if (ws.current) {
      ws.current.close();
    }
  };
  useEffect(() => {
    connect();
    return () => {
      disconnect();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);
  return {
    isConnected,
    lastMessage,
    sendMessage,
    disconnect,
    reconnect: connect,
  };
}
