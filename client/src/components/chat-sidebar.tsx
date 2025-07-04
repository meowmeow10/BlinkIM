import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Settings, Search, UserPlus, Hash, MessageCircle } from "lucide-react";
import type { User } from "@shared/schema";

interface ChatSidebarProps {
  user: User;
  activeChat: any;
  onChatSelect: (chat: any) => void;
  onSettingsOpen: () => void;
}

export default function ChatSidebar({ user, activeChat, onChatSelect, onSettingsOpen }: ChatSidebarProps) {
  const [activeTab, setActiveTab] = useState<'dms' | 'rooms'>('dms');
  const [searchQuery, setSearchQuery] = useState('');

  const { data: conversations = [] } = useQuery({
    queryKey: ['/api/conversations'],
    enabled: activeTab === 'dms',
  });

  const { data: chatRooms = [] } = useQuery({
    queryKey: ['/api/rooms'],
    enabled: activeTab === 'rooms',
  });

  const { data: friends = [] } = useQuery({
    queryKey: ['/api/friends'],
  });

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

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 60000) return 'now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
    return `${Math.floor(diff / 86400000)}d`;
  };

  return (
    <div className="w-80 bg-muted border-r border-border flex flex-col">
      {/* User Profile Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <Avatar className="w-10 h-10">
                <AvatarImage src={user.profilePicture || undefined} alt={user.displayName} />
                <AvatarFallback>{user.displayName.substring(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white dark:border-gray-800 ${getStatusColor(user.status || 'online')}`}></div>
            </div>
            <div>
              <h3 className="font-semibold text-foreground">{user.displayName}</h3>
              <p className={`text-sm status-${user.status || 'online'}`}>
                {getStatusText(user.status || 'online')}
              </p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={onSettingsOpen}
            className="text-muted-foreground hover:text-foreground"
          >
            <Settings className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-border">
        <button
          className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'dms'
              ? 'text-primary border-b-2 border-primary bg-background'
              : 'text-muted-foreground hover:text-foreground'
          }`}
          onClick={() => setActiveTab('dms')}
        >
          Direct Messages
        </button>
        <button
          className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'rooms'
              ? 'text-primary border-b-2 border-primary bg-background'
              : 'text-muted-foreground hover:text-foreground'
          }`}
          onClick={() => setActiveTab('rooms')}
        >
          Chat Rooms
        </button>
      </div>

      {/* Search */}
      <div className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {activeTab === 'dms' && (
          <div className="space-y-1 px-2">
            {conversations.map((conversation: any) => (
              <div
                key={conversation.user.id}
                className={`conversation-item ${activeChat?.id === conversation.user.id ? 'active' : ''}`}
                onClick={() => onChatSelect(conversation.user)}
              >
                <div className="relative">
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={conversation.user.profilePicture || undefined} alt={conversation.user.displayName} />
                    <AvatarFallback>{conversation.user.displayName.substring(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white dark:border-gray-800 ${getStatusColor(conversation.user.status || 'online')}`}></div>
                </div>
                <div className="ml-3 flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-foreground">{conversation.user.displayName}</h4>
                    <span className="text-xs text-muted-foreground">
                      {formatTime(conversation.lastMessageTime)}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    {conversation.lastMessage}
                  </p>
                </div>
                {conversation.unreadCount > 0 && (
                  <Badge className="ml-2 bg-primary text-primary-foreground">
                    {conversation.unreadCount}
                  </Badge>
                )}
              </div>
            ))}
            
            {/* Show friends who haven't messaged yet */}
            {friends.filter((friend: User) => 
              !conversations.some((conv: any) => conv.user.id === friend.id)
            ).map((friend: User) => (
              <div
                key={friend.id}
                className={`conversation-item ${activeChat?.id === friend.id ? 'active' : ''}`}
                onClick={() => onChatSelect(friend)}
              >
                <div className="relative">
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={friend.profilePicture || undefined} alt={friend.displayName} />
                    <AvatarFallback>{friend.displayName.substring(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white dark:border-gray-800 ${getStatusColor(friend.status || 'online')}`}></div>
                </div>
                <div className="ml-3 flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-foreground">{friend.displayName}</h4>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Click to start conversation
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'rooms' && (
          <div className="space-y-1 px-2">
            {chatRooms.map((room: any) => (
              <div
                key={room.id}
                className={`conversation-item ${activeChat?.id === room.id && activeChat?.type === 'room' ? 'active' : ''}`}
                onClick={() => onChatSelect({ ...room, type: 'room' })}
              >
                <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center">
                  <Hash className="w-6 h-6 text-white" />
                </div>
                <div className="ml-3 flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-foreground">{room.name}</h4>
                    <span className="text-xs text-muted-foreground">
                      {formatTime(room.createdAt)}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    {room.description || 'No description'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Friend/Room Button */}
      <div className="p-4 border-t border-border">
        <Button className="w-full" variant="default">
          <UserPlus className="w-4 h-4 mr-2" />
          {activeTab === 'dms' ? 'Add Friend' : 'Create Room'}
        </Button>
      </div>
    </div>
  );
}
