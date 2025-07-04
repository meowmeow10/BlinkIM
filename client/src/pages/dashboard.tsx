import { useAuth } from "@/hooks/useAuth";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useNotifications } from "@/hooks/useNotifications";
import { useState, useEffect } from "react";
import ChatSidebar from "@/components/chat-sidebar";
import ChatArea from "@/components/chat-area";
import SettingsModal from "@/components/settings-modal";

export default function Dashboard() {
  const { user } = useAuth();
  const { socket } = useWebSocket();
  const { showNotification } = useNotifications();
  const [activeChat, setActiveChat] = useState<any>(null);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    if (socket && user) {
      // Authenticate WebSocket connection
      socket.send(JSON.stringify({
        type: 'auth',
        userId: user.id,
      }));

      // Listen for new messages
      const handleMessage = (event: MessageEvent) => {
        const data = JSON.parse(event.data);
        
        if (data.type === 'new_message') {
          // Show notification if not in active chat
          if (!activeChat || 
              (data.data.receiverId === user.id && data.data.senderId !== activeChat.id) ||
              (data.data.chatRoomId && data.data.chatRoomId !== activeChat.id)) {
            showNotification(
              'New Message',
              `${data.data.senderName}: ${data.data.content}`,
              data.data.senderAvatar
            );
          }
        }
      };

      socket.addEventListener('message', handleMessage);
      return () => {
        socket.removeEventListener('message', handleMessage);
      };
    }
  }, [socket, user, activeChat, showNotification]);

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="flex h-screen">
        <ChatSidebar
          user={user}
          activeChat={activeChat}
          onChatSelect={setActiveChat}
          onSettingsOpen={() => setShowSettings(true)}
        />
        
        <ChatArea
          user={user}
          activeChat={activeChat}
          socket={socket}
        />
      </div>
      
      {showSettings && (
        <SettingsModal
          user={user}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}
