// src/context/SocketProvider.jsx
import React, { createContext, useMemo, useContext } from "react";
import { io } from "socket.io-client";

const SocketContext = createContext(null);
const SOCKET_SERVER_URL = import.meta.env.VITE_API_BASE_URL?.trim() || "http://localhost:5000";

export const useSocket = () => {
  return useContext(SocketContext);
};

export const SocketProvider = ({ children }) => {
  const socket = useMemo(
    () =>
      io(SOCKET_SERVER_URL, {
        transports: ["websocket", "polling"],
      }),
    []
  );

  return (
    <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>
  );
};
