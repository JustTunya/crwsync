import { useEffect, useState } from "react";

export function useTimeAgo(dateString: string) {
  const [timeAgo, setTimeAgo] = useState("");

  useEffect(() => {
    const calculateTimeAgo = () => {
      const date = new Date(dateString);
      const now = new Date();
      const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

      let interval = Math.floor(seconds / 31536000);
      if (interval >= 1) return setTimeAgo(interval + " year" + (interval === 1 ? "" : "s") + " ago");

      interval = Math.floor(seconds / 2592000);
      if (interval >= 1) return setTimeAgo(interval + " month" + (interval === 1 ? "" : "s") + " ago");

      interval = Math.floor(seconds / 86400);
      if (interval >= 1) return setTimeAgo(interval + " day" + (interval === 1 ? "" : "s") + " ago");

      interval = Math.floor(seconds / 3600);
      if (interval >= 1) return setTimeAgo(interval + " hour" + (interval === 1 ? "" : "s") + " ago");

      interval = Math.floor(seconds / 60);
      if (interval >= 1) return setTimeAgo(interval + " minute" + (interval === 1 ? "" : "s") + " ago");

      return setTimeAgo("just now");
    };

    calculateTimeAgo();
    const intervalId = setInterval(calculateTimeAgo, 60000); // Update every minute

    return () => clearInterval(intervalId);
  }, [dateString]);

  return timeAgo;
}
