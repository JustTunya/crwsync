"use client";

import { createContext, useContext, useEffect, useReducer } from "react";
import { io, Socket } from "socket.io-client";
import { useUser } from "@/providers/user.provider";

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
});

type SocketAction =
  | { type: "CONNECT"; payload: Socket }
  | { type: "DISCONNECT" };

function socketReducer(state: SocketContextType, action: SocketAction): SocketContextType {
  switch (action.type) {
    case "CONNECT":
      return { socket: action.payload, isConnected: true };
    case "DISCONNECT":
      return { socket: null, isConnected: false };
    default:
      return state;
  }
}

export function useSocket() {
  return useContext(SocketContext);
}

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const user = useUser();
  const [state, dispatch] = useReducer(socketReducer, {
    socket: null,
    isConnected: false,
  });

  useEffect(() => {
    if (!user) {
        return;
    }

    const socketInstance = io(`${SOCKET_URL}/status`, {
      withCredentials: true,
      transports: ["websocket"],
      autoConnect: true,
    });

    socketInstance.on("connect", () => {
      dispatch({ type: "CONNECT", payload: socketInstance });
    });

    socketInstance.on("disconnect", () => {
      dispatch({ type: "DISCONNECT" });
    });

    return () => {
      socketInstance.disconnect();
      dispatch({ type: "DISCONNECT" });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally depend on user?.id, not user object reference (Bug 4 fix)
  }, [user?.id]);

  return (
    <SocketContext.Provider value={state}>
      {children}
    </SocketContext.Provider>
  );
}
