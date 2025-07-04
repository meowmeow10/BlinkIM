// Main Application State
class MessagingApp {
  constructor() {
    this.currentUser = null;
    this.activeChat = null;
    this.friends = [];
    this.chatRooms = [];
    this.messages = [];
    this.socket = null;
    this.notificationPermission = false;
    
    this.init();
  }

  async init() {
    // Check if user is already logged in
    await this.checkAuthStatus();
    
    // Set up event listeners
    this.setupEventListeners();
    
    // Request notification permission
    this.requestNotificationPermission();
  }

  async checkAuthStatus() {
    try {
      const response = await this.apiRequest('/api/auth/me');
      if (response.ok) {
        this.currentUser = await response.json();
        this.showApp();
        this.loadUserData();
        this.connectWebSocket();
      } else {
        this.showAuth();
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      this.showAuth();
    }
  }

  setupEventListeners() {
    // Auth form listeners
    document.getElementById('login-form').addEventListener('submit', this.handleLogin.bind(this));
    document.getElementById('register-form').addEventListener('submit', this.handleRegister.bind(this));
    document.getElementById('show-register').addEventListener('click', this.showRegisterForm.bind(this));
    document.getElementById('show-login').addEventListener('click', this.showLoginForm.bind(this));

    // Main app listeners
    document.getElementById('logout-btn').addEventListener('click', this.handleLogout.bind(this));
    document.getElementById('settings-btn').addEventListener('click', this.showSettingsModal.bind(this));
    document.getElementById('add-friend-btn').addEventListener('click', this.showAddFriendModal.bind(this));
    document.getElementById('create-room-btn').addEventListener('click', this.showCreateRoomModal.bind(this));
    
    // Message sending
    document.getElementById('message-input').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.sendMessage();
      }
    });
    document.getElementById('send-btn').addEventListener('click', this.sendMessage.bind(this));

    // Modal listeners
    document.getElementById('save-settings-btn').addEventListener('click', this.saveSettings.bind(this));
    document.getElementById('send-friend-request-btn').addEventListener('click', this.sendFriendRequest.bind(this));
    document.getElementById('create-room-submit-btn').addEventListener('click', this.createChatRoom.bind(this));

    // Close modal listeners
    document.querySelectorAll('.close-btn').forEach(btn => {
      btn.addEventListener('click', this.hideModals.bind(this));
    });
    
    document.getElementById('modal-overlay').addEventListener('click', (e) => {
      if (e.target === document.getElementById('modal-overlay')) {
        this.hideModals();
      }
    });
  }

  // API Helper
  async apiRequest(url, options = {}) {
    const defaultOptions = {
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    };

    const mergedOptions = { ...defaultOptions, ...options };
    
    // Handle FormData (don't set Content-Type header for FormData)
    if (mergedOptions.body instanceof FormData) {
      delete mergedOptions.headers['Content-Type'];
    } else if (mergedOptions.body && typeof mergedOptions.body === 'object') {
      mergedOptions.body = JSON.stringify(mergedOptions.body);
    }

    return fetch(url, mergedOptions);
  }

  // Authentication Methods
  async handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    try {
      const response = await this.apiRequest('/api/auth/login', {
        method: 'POST',
        body: { email, password }
      });

      if (response.ok) {
        this.currentUser = await response.json();
        this.showApp();
        this.loadUserData();
        this.connectWebSocket();
        this.showToast('Welcome back!', 'success');
      } else {
        const error = await response.json();
        this.showToast(error.message || 'Login failed', 'error');
      }
    } catch (error) {
      console.error('Login error:', error);
      this.showToast('Login failed. Please try again.', 'error');
    }
  }

  async handleRegister(e) {
    e.preventDefault();
    
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    const displayName = document.getElementById('register-display-name').value;

    try {
      const response = await this.apiRequest('/api/auth/register', {
        method: 'POST',
        body: { email, password, displayName }
      });

      if (response.ok) {
        this.currentUser = await response.json();
        this.showApp();
        this.loadUserData();
        this.connectWebSocket();
        this.showToast('Welcome to the messaging platform!', 'success');
      } else {
        const error = await response.json();
        this.showToast(error.message || 'Registration failed', 'error');
      }
    } catch (error) {
      console.error('Registration error:', error);
      this.showToast('Registration failed. Please try again.', 'error');
    }
  }

  async handleLogout() {
    try {
      await this.apiRequest('/api/auth/logout', { method: 'POST' });
      this.currentUser = null;
      this.activeChat = null;
      this.friends = [];
      this.chatRooms = [];
      this.messages = [];
      
      if (this.socket) {
        this.socket.close();
        this.socket = null;
      }
      
      this.showAuth();
      this.showToast('Logged out successfully', 'success');
    } catch (error) {
      console.error('Logout error:', error);
      this.showToast('Logout failed', 'error');
    }
  }

  // UI Methods
  showAuth() {
    document.getElementById('auth-container').classList.remove('hidden');
    document.getElementById('app-container').classList.add('hidden');
  }

  showApp() {
    document.getElementById('auth-container').classList.add('hidden');
    document.getElementById('app-container').classList.remove('hidden');
    
    // Update user profile in sidebar
    document.getElementById('user-name').textContent = this.currentUser.displayName;
    document.getElementById('user-avatar').src = this.currentUser.profilePicture || '/default-avatar.svg';
  }

  showRegisterForm() {
    document.getElementById('login-form').classList.remove('active');
    document.getElementById('register-form').classList.add('active');
  }

  showLoginForm() {
    document.getElementById('register-form').classList.remove('active');
    document.getElementById('login-form').classList.add('active');
  }

  showSettingsModal() {
    document.getElementById('settings-display-name').value = this.currentUser.displayName;
    document.getElementById('modal-overlay').classList.remove('hidden');
    document.getElementById('settings-modal').classList.remove('hidden');
  }

  showAddFriendModal() {
    document.getElementById('modal-overlay').classList.remove('hidden');
    document.getElementById('add-friend-modal').classList.remove('hidden');
  }

  showCreateRoomModal() {
    document.getElementById('modal-overlay').classList.remove('hidden');
    document.getElementById('create-room-modal').classList.remove('hidden');
  }

  hideModals() {
    document.getElementById('modal-overlay').classList.add('hidden');
    document.querySelectorAll('.modal').forEach(modal => {
      modal.classList.add('hidden');
    });
  }

  // Data Loading Methods
  async loadUserData() {
    await Promise.all([
      this.loadFriends(),
      this.loadChatRooms(),
      this.loadRecentConversations()
    ]);
  }

  async loadFriends() {
    try {
      const response = await this.apiRequest('/api/friends');
      if (response.ok) {
        this.friends = await response.json();
        this.renderFriends();
      }
    } catch (error) {
      console.error('Error loading friends:', error);
    }
  }

  async loadChatRooms() {
    try {
      const response = await this.apiRequest('/api/chat-rooms');
      if (response.ok) {
        this.chatRooms = await response.json();
        this.renderChatRooms();
      }
    } catch (error) {
      console.error('Error loading chat rooms:', error);
    }
  }

  async loadRecentConversations() {
    try {
      const response = await this.apiRequest('/api/conversations');
      if (response.ok) {
        const conversations = await response.json();
        // Handle recent conversations if needed
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
    }
  }

  // Rendering Methods
  renderFriends() {
    const friendsList = document.getElementById('friends-list');
    friendsList.innerHTML = '';

    this.friends.forEach(friend => {
      const friendElement = document.createElement('div');
      friendElement.className = 'friend-item';
      friendElement.innerHTML = `
        <img src="${friend.profilePicture || '/default-avatar.svg'}" alt="${friend.displayName}" class="avatar">
        <div class="friend-info">
          <div class="friend-name">${friend.displayName}</div>
          <div class="friend-status status ${friend.status}">${friend.status || 'offline'}</div>
        </div>
      `;
      
      friendElement.addEventListener('click', () => {
        this.selectChat('friend', friend);
      });
      
      friendsList.appendChild(friendElement);
    });
  }

  renderChatRooms() {
    const chatRoomsList = document.getElementById('chat-rooms-list');
    chatRoomsList.innerHTML = '';

    this.chatRooms.forEach(room => {
      const roomElement = document.createElement('div');
      roomElement.className = 'chat-room-item';
      roomElement.innerHTML = `
        <div class="room-info">
          <div class="room-name">${room.name}</div>
          <div class="room-description">${room.description || 'No description'}</div>
        </div>
      `;
      
      roomElement.addEventListener('click', () => {
        this.selectChat('room', room);
      });
      
      chatRoomsList.appendChild(roomElement);
    });
  }

  renderMessages() {
    const messagesList = document.getElementById('messages-list');
    messagesList.innerHTML = '';

    this.messages.forEach(message => {
      const messageElement = document.createElement('div');
      messageElement.className = `message ${message.senderId === this.currentUser.id ? 'own' : ''}`;
      
      const isOwnMessage = message.senderId === this.currentUser.id;
      const sender = isOwnMessage ? this.currentUser : 
        this.friends.find(f => f.id === message.senderId) || { displayName: 'Unknown' };
      
      messageElement.innerHTML = `
        <img src="${sender.profilePicture || '/default-avatar.svg'}" alt="${sender.displayName}" class="message-avatar">
        <div class="message-content">
          <div class="message-bubble">${message.content}</div>
          <div class="message-info">
            <span class="message-sender">${sender.displayName}</span>
            <span class="message-time">${this.formatTime(message.createdAt)}</span>
          </div>
        </div>
      `;
      
      messagesList.appendChild(messageElement);
    });

    // Scroll to bottom
    messagesList.scrollTop = messagesList.scrollHeight;
  }

  // Chat Methods
  async selectChat(type, target) {
    // Remove active class from all chat items
    document.querySelectorAll('.friend-item, .chat-room-item').forEach(item => {
      item.classList.remove('active');
    });
    
    // Add active class to selected item
    event.currentTarget.classList.add('active');
    
    this.activeChat = { type, target };
    
    // Update chat header
    document.getElementById('chat-title').textContent = 
      type === 'friend' ? target.displayName : target.name;
    document.getElementById('chat-subtitle').textContent = 
      type === 'friend' ? target.status : target.description;
    
    // Enable message input
    document.getElementById('message-input').disabled = false;
    document.getElementById('send-btn').disabled = false;
    
    // Load messages
    await this.loadMessages();
  }

  async loadMessages() {
    if (!this.activeChat) return;

    try {
      const { type, target } = this.activeChat;
      let url;
      
      if (type === 'friend') {
        url = `/api/messages/direct/${target.id}`;
      } else {
        url = `/api/messages/room/${target.id}`;
      }
      
      const response = await this.apiRequest(url);
      if (response.ok) {
        this.messages = await response.json();
        this.renderMessages();
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  }

  async sendMessage() {
    if (!this.activeChat) return;
    
    const messageInput = document.getElementById('message-input');
    const content = messageInput.value.trim();
    
    if (!content) return;
    
    try {
      const { type, target } = this.activeChat;
      const messageData = {
        content,
        messageType: 'text'
      };
      
      if (type === 'friend') {
        messageData.receiverId = target.id;
      } else {
        messageData.chatRoomId = target.id;
      }
      
      const response = await this.apiRequest('/api/messages', {
        method: 'POST',
        body: messageData
      });
      
      if (response.ok) {
        const message = await response.json();
        this.messages.push(message);
        this.renderMessages();
        messageInput.value = '';
        
        // Send via WebSocket for real-time updates
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
          this.socket.send(JSON.stringify({
            type: 'message',
            message: message
          }));
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      this.showToast('Failed to send message', 'error');
    }
  }

  // WebSocket Methods
  connectWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    this.socket = new WebSocket(wsUrl);
    
    this.socket.onopen = () => {
      console.log('WebSocket connected');
      // Send user identification
      this.socket.send(JSON.stringify({
        type: 'auth',
        userId: this.currentUser.id
      }));
    };
    
    this.socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      this.handleWebSocketMessage(data);
    };
    
    this.socket.onclose = () => {
      console.log('WebSocket disconnected');
      // Attempt to reconnect after 3 seconds
      setTimeout(() => {
        if (this.currentUser) {
          this.connectWebSocket();
        }
      }, 3000);
    };
    
    this.socket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  }

  handleWebSocketMessage(data) {
    switch (data.type) {
      case 'message':
        this.handleNewMessage(data.message);
        break;
      case 'friend_request':
        this.handleFriendRequest(data.request);
        break;
      case 'friend_status':
        this.handleFriendStatusUpdate(data.friend);
        break;
      case 'notification':
        this.handleNotification(data.notification);
        break;
    }
  }

  handleNewMessage(message) {
    // Add message to current chat if it belongs to the active chat
    if (this.activeChat) {
      const { type, target } = this.activeChat;
      const belongsToActiveChat = 
        (type === 'friend' && (message.senderId === target.id || message.receiverId === target.id)) ||
        (type === 'room' && message.chatRoomId === target.id);
      
      if (belongsToActiveChat) {
        this.messages.push(message);
        this.renderMessages();
      }
    }
    
    // Show notification if message is not from current user
    if (message.senderId !== this.currentUser.id) {
      this.showMessageNotification(message);
    }
  }

  handleFriendRequest(request) {
    this.showToast(`Friend request from ${request.senderName}`, 'info');
    // Reload friends list to show pending requests
    this.loadFriends();
  }

  handleFriendStatusUpdate(friend) {
    // Update friend status in the friends list
    const friendIndex = this.friends.findIndex(f => f.id === friend.id);
    if (friendIndex !== -1) {
      this.friends[friendIndex].status = friend.status;
      this.renderFriends();
    }
  }

  handleNotification(notification) {
    this.showToast(notification.message, notification.type);
  }

  // Settings Methods
  async saveSettings() {
    const displayName = document.getElementById('settings-display-name').value;
    const profilePictureFile = document.getElementById('settings-profile-picture').files[0];
    
    try {
      // Update display name
      const response = await this.apiRequest('/api/user/profile', {
        method: 'PATCH',
        body: { displayName }
      });
      
      if (response.ok) {
        this.currentUser.displayName = displayName;
        document.getElementById('user-name').textContent = displayName;
        
        // Upload profile picture if selected
        if (profilePictureFile) {
          const formData = new FormData();
          formData.append('profilePicture', profilePictureFile);
          
          const uploadResponse = await this.apiRequest('/api/user/profile-picture', {
            method: 'POST',
            body: formData,
            headers: {} // Let browser set content-type for FormData
          });
          
          if (uploadResponse.ok) {
            const result = await uploadResponse.json();
            this.currentUser.profilePicture = result.profilePicture;
            document.getElementById('user-avatar').src = result.profilePicture;
          }
        }
        
        this.hideModals();
        this.showToast('Settings saved successfully', 'success');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      this.showToast('Failed to save settings', 'error');
    }
  }

  // Friend Methods
  async sendFriendRequest() {
    const email = document.getElementById('friend-email').value;
    
    try {
      const response = await this.apiRequest('/api/friends/request', {
        method: 'POST',
        body: { email }
      });
      
      if (response.ok) {
        this.hideModals();
        this.showToast('Friend request sent!', 'success');
        document.getElementById('friend-email').value = '';
      } else {
        const error = await response.json();
        this.showToast(error.message || 'Failed to send friend request', 'error');
      }
    } catch (error) {
      console.error('Error sending friend request:', error);
      this.showToast('Failed to send friend request', 'error');
    }
  }

  // Chat Room Methods
  async createChatRoom() {
    const name = document.getElementById('room-name').value;
    const description = document.getElementById('room-description').value;
    const isPrivate = document.getElementById('room-private').checked;
    
    try {
      const response = await this.apiRequest('/api/chat-rooms', {
        method: 'POST',
        body: { name, description, isPrivate }
      });
      
      if (response.ok) {
        const room = await response.json();
        this.chatRooms.push(room);
        this.renderChatRooms();
        this.hideModals();
        this.showToast('Chat room created!', 'success');
        
        // Clear form
        document.getElementById('room-name').value = '';
        document.getElementById('room-description').value = '';
        document.getElementById('room-private').checked = false;
      } else {
        const error = await response.json();
        this.showToast(error.message || 'Failed to create chat room', 'error');
      }
    } catch (error) {
      console.error('Error creating chat room:', error);
      this.showToast('Failed to create chat room', 'error');
    }
  }

  // Notification Methods
  requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then(permission => {
        this.notificationPermission = permission === 'granted';
      });
    } else if (Notification.permission === 'granted') {
      this.notificationPermission = true;
    }
  }

  showMessageNotification(message) {
    if (!this.notificationPermission) return;
    
    const sender = this.friends.find(f => f.id === message.senderId);
    const senderName = sender ? sender.displayName : 'Unknown';
    
    const notification = new Notification(`New message from ${senderName}`, {
      body: message.content,
      icon: sender ? sender.profilePicture : '/default-avatar.svg'
    });
    
    notification.onclick = () => {
      window.focus();
      if (sender) {
        this.selectChat('friend', sender);
      }
      notification.close();
    };
    
    // Play notification sound
    this.playNotificationSound();
    
    // Auto-close after 5 seconds
    setTimeout(() => {
      notification.close();
    }, 5000);
  }

  playNotificationSound() {
    const audio = document.getElementById('notification-sound');
    if (audio) {
      audio.play().catch(e => {
        // Silently fail if audio can't play
        console.log('Could not play notification sound:', e);
      });
    }
  }

  // Toast Methods
  showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <div class="toast-header">
        <div class="toast-title">${type.charAt(0).toUpperCase() + type.slice(1)}</div>
        <button class="toast-close">&times;</button>
      </div>
      <div class="toast-body">${message}</div>
    `;
    
    const closeBtn = toast.querySelector('.toast-close');
    closeBtn.addEventListener('click', () => {
      toast.remove();
    });
    
    document.getElementById('toast-container').appendChild(toast);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (toast.parentNode) {
        toast.remove();
      }
    }, 5000);
  }

  // Utility Methods
  formatTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      return 'just now';
    } else if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString();
    }
  }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.app = new MessagingApp();
});