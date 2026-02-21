import { useState, useEffect } from "react";
import { useSocket } from "@/providers/socket.provider";
import { useUser } from "@/providers/user.provider";
import { UserStatus } from "@/lib/sidebar.utils";

export function useUserStatus() {
  const { socket } = useSocket();
  const user = useUser();

  const [status, setStatus] = useState<UserStatus>(
    (user?.status_preference?.toLowerCase() as UserStatus) || "online",
  );

  useEffect(() => {
    if (!socket || !user) return;

    const handleStatusUpdate = ({
      userId,
      status: newStatus,
    }: {
      userId: string;
      status: string;
    }) => {
      if (userId === user.id) {
        setStatus(newStatus.toLowerCase() as UserStatus);
      }
    };

    socket.on("status:update", handleStatusUpdate);

    return () => {
      socket.off("status:update", handleStatusUpdate);
    };
  }, [socket, user]);

  const handleStatusChange = (newStatus: UserStatus) => {
    setStatus(newStatus);
    if (socket) {
      socket.emit("update_status", newStatus.toUpperCase());
    }
  };

  return { status, handleStatusChange };
}
