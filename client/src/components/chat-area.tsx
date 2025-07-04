import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Phone, Video, Info, Paperclip, Smile, Send } from "lucide-react";
import type { User, Message } from "@shared/schema";

interface ChatAreaProps {
  user: User;
  activeChat: any;
  socket: WebSocket | null;
}

export default function ChatArea({ user, activeChat, socket }: ChatAreaProps) {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<any[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: fetchedMessages = [] } = useQuery({
    queryKey: [
      activeChat?.type === 'room' ? `/api/messages/room/${activeChat.id}` : `/api/messages/direct/${activeChat?.id}`,
    ],
    enabled: !!activeChat,
  });

  useEffect(() => {
    if (fetchedMessages.length > 0) {
      setMessages(fetchedMessages);
    }
  }, [fetchedMessages]);

  useEffect(() => {
    if (socket) {
      const handleMessage = (event: MessageEvent) => {
        const data = JSON.parse(event.data);
        
        if (data.type === 'new_message' || data.type === 'message_sent') {
          const newMessage = data.data;
          
          // Check if message belongs to current chat
          const belongsToChat = activeChat?.type === 'room' 
            ? newMessage.chatRoomId === activeChat.id
            : (newMessage.senderId === activeChat?.id || newMessage.receiverId === activeChat?.id) && !newMessage.chatRoomId;
          
          if (belongsToChat) {
            setMessages(prev => [...prev, newMessage]);
          }
        }
      };

      socket.addEventListener('message', handleMessage);
      return () => {
        socket.removeEventListener('message', handleMessage);
      };
    }
  }, [socket, activeChat]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = () => {
    if (!message.trim() || !socket || !activeChat) return;

    const messageData = {
      type: 'message',
      data: {
        content: message.trim(),
        senderId: user.id,
        receiverId: activeChat.type === 'room' ? null : activeChat.id,
        chatRoomId: activeChat.type === 'room' ? activeChat.id : null,
        messageType: 'text',
      },
    };

    socket.send(JSON.stringify(messageData));
    setMessage('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
        return 'bg-green-500';
      case 'away':
        return 'bg-yellow-500';
      case 'busy':
        return 'bg-red-500';
      default:
        return 'bg-gray-400';
    }
  };

  const getStatusText = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  if (!activeChat) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
            <Phone className="w-8 h-8 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2">
            Select a conversation
          </h2>
          <p className="text-muted-foreground">
            Choose a friend or chat room to start messaging
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Chat Header */}
      <div className="bg-background border-b border-border p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {activeChat.type === 'room' ? (
              <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                <span className="text-white font-semibold">
                  {activeChat.name.substring(0, 2).toUpperCase()}
                </span>
              </div>
            ) : (
              <div className="relative">
                <Avatar className="w-10 h-10">
                  <AvatarImage src={activeChat.profilePicture || undefined} alt={activeChat.displayName} />
                  <AvatarFallback>{activeChat.displayName.substring(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white dark:border-gray-800 ${getStatusColor(activeChat.status || 'online')}`}></div>
              </div>
            )}
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                {activeChat.type === 'room' ? activeChat.name : activeChat.displayName}
              </h2>
              <p className={`text-sm ${activeChat.type === 'room' ? 'text-muted-foreground' : `status-${activeChat.status || 'online'}`}`}>
                {activeChat.type === 'room' ? activeChat.description : getStatusText(activeChat.status || 'online')}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
              <Phone className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
              <Video className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
              <Info className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-muted/20 scrollbar-thin">
        {messages.map((msg: any, index: number) => {
          const isOwn = msg.senderId === user.id;
          const showAvatar = !isOwn && (index === 0 || messages[index - 1].senderId !== msg.senderId);
          
          return (
            <div
              key={msg.id}
              className={`flex items-start space-x-3 animate-fade-in ${isOwn ? 'justify-end' : ''}`}
            >
              {!isOwn && (
                <div className="w-8 h-8">
                  {showAvatar && (
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={msg.senderAvatar || undefined} alt={msg.senderName} />
                      <AvatarFallback>{msg.senderName?.substring(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                  )}
                </div>
              )}
              
              <div className={`flex-1 ${isOwn ? 'text-right' : ''}`}>
                {!isOwn && showAvatar && (
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="text-sm font-medium text-foreground">{msg.senderName}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatTime(msg.createdAt)}
                    </span>
                  </div>
                )}
                
                <div className={`message-bubble ${isOwn ? 'sent' : 'received'}`}>
                  <p className={isOwn ? 'text-primary-foreground' : 'text-foreground'}>
                    {msg.content}
                  </p>
                </div>
                
                {isOwn && (
                  <div className="text-xs text-muted-foreground mt-1">
                    {formatTime(msg.createdAt)}
                  </div>
                )}
              </div>
              
              {isOwn && (
                <div className="w-8 h-8">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={user.profilePicture || undefined} alt={user.displayName} />
                    <AvatarFallback>{user.displayName.substring(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                </div>
              )}
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input Area */}
      <div className="bg-background border-t border-border p-4">
        <div className="flex items-center space-x-3">
          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
            <Paperclip className="w-4 h-4" />
          </Button>
          
          <div className="flex-1 relative">
            <Input
              placeholder="Type a message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              className="pr-12"
            />
            <Button 
              variant="ghost" 
              size="sm" 
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <Smile className="w-4 h-4" />
            </Button>
          </div>
          
          <Button 
            onClick={sendMessage}
            disabled={!message.trim()}
            className="shrink-0"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
