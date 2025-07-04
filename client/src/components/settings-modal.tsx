import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { X } from "lucide-react";
import type { User } from "@shared/schema";

interface SettingsModalProps {
  user: User;
  onClose: () => void;
}

export default function SettingsModal({ user, onClose }: SettingsModalProps) {
  const [displayName, setDisplayName] = useState(user.displayName);
  const [status, setStatus] = useState(user.status || 'online');
  const [isDarkMode, setIsDarkMode] = useState(
    document.documentElement.classList.contains('dark')
  );
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const { toast } = useToast();

  const updateProfileMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("PUT", "/api/users/profile", data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Profile updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update profile",
        variant: "destructive",
      });
    },
  });

  const uploadAvatarMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('avatar', file);
      return await fetch('/api/users/upload-avatar', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Avatar updated successfully",
      });
      window.location.reload();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: "Failed to upload avatar",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    updateProfileMutation.mutate({
      displayName,
      status,
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadAvatarMutation.mutate(file);
    }
  };

  const toggleTheme = () => {
    const newTheme = !isDarkMode;
    setIsDarkMode(newTheme);
    
    if (newTheme) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  const ToggleSwitch = ({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) => (
    <button
      onClick={onToggle}
      className={`toggle-switch ${enabled ? 'enabled' : 'disabled'}`}
    >
      <span className={`toggle-switch-thumb ${enabled ? 'enabled' : 'disabled'}`}></span>
    </button>
  );

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Profile Settings */}
          <div>
            <h3 className="text-lg font-medium text-foreground mb-4">Profile</h3>
            
            <div className="flex items-center space-x-4 mb-4">
              <Avatar className="w-16 h-16">
                <AvatarImage src={user.profilePicture || undefined} alt={user.displayName} />
                <AvatarFallback>{user.displayName.substring(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="avatar-upload"
                />
                <label htmlFor="avatar-upload">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="cursor-pointer"
                    disabled={uploadAvatarMutation.isPending}
                  >
                    {uploadAvatarMutation.isPending ? 'Uploading...' : 'Change Photo'}
                  </Button>
                </label>
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="display-name">Display Name</Label>
                <Input
                  id="display-name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Enter your display name"
                />
              </div>
              
              <div>
                <Label htmlFor="status">Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="online">Online</SelectItem>
                    <SelectItem value="away">Away</SelectItem>
                    <SelectItem value="busy">Busy</SelectItem>
                    <SelectItem value="offline">Offline</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Appearance Settings */}
          <div>
            <h3 className="text-lg font-medium text-foreground mb-4">Appearance</h3>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Dark Mode</span>
              <ToggleSwitch enabled={isDarkMode} onToggle={toggleTheme} />
            </div>
          </div>

          {/* Notification Settings */}
          <div>
            <h3 className="text-lg font-medium text-foreground mb-4">Notifications</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Push Notifications</span>
                <ToggleSwitch 
                  enabled={notificationsEnabled} 
                  onToggle={() => setNotificationsEnabled(!notificationsEnabled)} 
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Sound Notifications</span>
                <ToggleSwitch 
                  enabled={soundEnabled} 
                  onToggle={() => setSoundEnabled(!soundEnabled)} 
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-3 mt-8">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave}
            disabled={updateProfileMutation.isPending}
          >
            {updateProfileMutation.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
