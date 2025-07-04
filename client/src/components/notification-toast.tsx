import { useState, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MessageCircle, X } from "lucide-react";

interface NotificationData {
  id: string;
  title: string;
  message: string;
  avatar?: string;
  timestamp: Date;
}

export default function NotificationToast() {
  const [notifications, setNotifications] = useState<NotificationData[]>([]);

  useEffect(() => {
    const handleNotification = (event: CustomEvent<NotificationData>) => {
      const notification = event.detail;
      setNotifications(prev => [...prev, notification]);
      
      // Auto-remove after 5 seconds
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== notification.id));
      }, 5000);
    };

    window.addEventListener('show-notification', handleNotification as EventListener);
    return () => {
      window.removeEventListener('show-notification', handleNotification as EventListener);
    };
  }, []);

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className="notification-toast animate-slide-in"
        >
          <div className="flex items-center space-x-3">
            {notification.avatar ? (
              <Avatar className="w-10 h-10">
                <AvatarImage src={notification.avatar} alt="Avatar" />
                <AvatarFallback>
                  <MessageCircle className="w-5 h-5" />
                </AvatarFallback>
              </Avatar>
            ) : (
              <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                <MessageCircle className="w-5 h-5 text-white" />
              </div>
            )}
            
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">
                {notification.title}
              </p>
              <p className="text-xs text-muted-foreground">
                {notification.message}
              </p>
            </div>
            
            <button
              onClick={() => removeNotification(notification.id)}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
