import { useCallback, useEffect, useState } from "react";
import { playNotificationSound } from "@/lib/notificationSound";

export function useNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>("default");

  useEffect(() => {
    if ("Notification" in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = useCallback(async () => {
    if ("Notification" in window) {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result;
    }
    return "denied";
  }, []);

  const showNotification = useCallback((title: string, body: string, avatar?: string) => {
    // Play sound
    playNotificationSound();
    
    // Show browser notification
    if (permission === "granted") {
      const notification = new Notification(title, {
        body,
        icon: avatar || "/favicon.ico",
        tag: "message",
      });
      
      setTimeout(() => notification.close(), 5000);
    }
    
    // Show custom toast notification
    const customEvent = new CustomEvent("show-notification", {
      detail: {
        id: Date.now().toString(),
        title,
        message: body,
        avatar,
        timestamp: new Date(),
      },
    });
    
    window.dispatchEvent(customEvent);
  }, [permission]);

  return {
    permission,
    requestPermission,
    showNotification,
  };
}
