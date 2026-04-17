import { useEffect, useMemo, useRef } from "react";
import { io } from "socket.io-client";
import { useAuth } from "../../common/context/AuthContext";
import { axiosInstance } from "../../common/services/api";
import { logger } from "../../common/utils/logger.js";

const buildSocketUrl = () => {
  const baseUrl = axiosInstance?.defaults?.baseURL || "";
  return baseUrl.replace(/\/api\/?$/, "");
};

export function useAdminLiveSync({
  enabled = true,
  events = [],
  joinRooms,
  onEvent,
  debounceMs = 250,
}) {
  const { isAuthenticated, user } = useAuth();
  const joinRoomsRef = useRef(joinRooms);
  const onEventRef = useRef(onEvent);
  const timerRef = useRef(null);

  useEffect(() => {
    joinRoomsRef.current = joinRooms;
  }, [joinRooms]);

  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  const normalizedEvents = useMemo(
    () => [...new Set((events || []).filter(Boolean))],
    [events],
  );

  useEffect(() => {
    if (
      !enabled ||
      !isAuthenticated ||
      !user?._id ||
      normalizedEvents.length === 0
    ) {
      return undefined;
    }

    const socketUrl = buildSocketUrl();
    if (!socketUrl) {
      return undefined;
    }

    const socket = io(socketUrl, {
      withCredentials: true,
      transports: ["websocket", "polling"],
    });

    const emitJoinedRooms = () => {
      joinRoomsRef.current?.(socket, user);
    };

    const handleIncomingEvent = (eventName) => (payload = {}) => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      timerRef.current = setTimeout(() => {
        onEventRef.current?.({
          eventName,
          payload,
        });
      }, debounceMs);
    };

    const eventHandlers = normalizedEvents.map((eventName) => ({
      eventName,
      handler: handleIncomingEvent(eventName),
    }));

    socket.on("connect", emitJoinedRooms);
    socket.on("connect_error", (error) => {
      logger.warn(
        "Admin live sync socket connection failed:",
        error?.message || error,
      );
    });

    eventHandlers.forEach(({ eventName, handler }) => {
      socket.on(eventName, handler);
    });

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      eventHandlers.forEach(({ eventName, handler }) => {
        socket.off(eventName, handler);
      });
      socket.off("connect", emitJoinedRooms);
      socket.disconnect();
    };
  }, [
    debounceMs,
    enabled,
    isAuthenticated,
    normalizedEvents,
    user,
    user?._id,
  ]);
}

export default useAdminLiveSync;
