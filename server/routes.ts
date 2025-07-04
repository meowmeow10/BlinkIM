import express, { type Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { insertUserSchema, insertMessageSchema, insertChatRoomSchema, insertFriendshipSchema } from "@shared/schema";
import session from "express-session";
import connectPg from "connect-pg-simple";
import multer from "multer";
import path from "path";
import fs from "fs";

const upload = multer({ 
  dest: 'uploads/',
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

// Session configuration
const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
const pgStore = connectPg(session);
const sessionStore = new pgStore({
  conString: process.env.DATABASE_URL,
  createTableIfMissing: true,
  ttl: sessionTtl,
  tableName: "sessions",
});

declare module 'express-session' {
  interface SessionData {
    userId: number;
  }
}

const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET || "your-secret-key",
  store: sessionStore,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: sessionTtl,
  },
});

// Authentication middleware
const requireAuth = (req: any, res: any, next: any) => {
  if (!req.session?.userId) {
    return res.status(401).json({ message: "Authentication required" });
  }
  next();
};

// WebSocket connection tracking
const activeConnections = new Map<number, WebSocket>();

export async function registerRoutes(app: Express): Promise<Server> {
  // Session middleware
  app.use(sessionMiddleware);

  // Create uploads directory if it doesn't exist
  const uploadsDir = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  // Serve uploaded files
  app.use('/uploads', express.static(uploadsDir));

  // Auth routes
  app.post('/api/auth/register', async (req, res) => {
    try {
      const validatedData = insertUserSchema.parse(req.body);
      const existingUser = await storage.getUserByEmail(validatedData.email);
      
      if (existingUser) {
        return res.status(400).json({ message: "Email already registered" });
      }

      const user = await storage.createUser(validatedData);
      req.session.userId = user.id;
      
      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Registration error:", error);
      res.status(400).json({ message: "Registration failed" });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password } = req.body;
      const user = await storage.getUserByEmail(email);
      
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const isValidPassword = await storage.verifyPassword(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      req.session.userId = user.id;
      
      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  app.post('/api/auth/logout', (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Logout failed" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });

  app.get('/api/auth/me', requireAuth, async (req: any, res) => {
    try {
      const user = await storage.getUserById(req.session.userId);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }
      
      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Get user error:", error);
      res.status(500).json({ message: "Failed to get user" });
    }
  });

  // User routes
  app.put('/api/users/profile', requireAuth, async (req: any, res) => {
    try {
      const updates = req.body;
      const updatedUser = await storage.updateUser(req.session.userId, updates);
      
      const { password, ...userWithoutPassword } = updatedUser;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Profile update error:", error);
      res.status(500).json({ message: "Profile update failed" });
    }
  });

  app.post('/api/users/upload-avatar', requireAuth, upload.single('avatar'), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const avatarPath = `/uploads/${req.file.filename}`;
      const updatedUser = await storage.updateUser(req.session.userId, {
        profilePicture: avatarPath,
      });
      
      const { password, ...userWithoutPassword } = updatedUser;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Avatar upload error:", error);
      res.status(500).json({ message: "Avatar upload failed" });
    }
  });

  // Message routes
  app.get('/api/messages/direct/:userId', requireAuth, async (req: any, res) => {
    try {
      const otherUserId = parseInt(req.params.userId);
      const messages = await storage.getDirectMessages(req.session.userId, otherUserId);
      res.json(messages);
    } catch (error) {
      console.error("Get direct messages error:", error);
      res.status(500).json({ message: "Failed to get messages" });
    }
  });

  app.get('/api/messages/room/:roomId', requireAuth, async (req: any, res) => {
    try {
      const roomId = parseInt(req.params.roomId);
      const messages = await storage.getChatRoomMessages(roomId);
      res.json(messages);
    } catch (error) {
      console.error("Get room messages error:", error);
      res.status(500).json({ message: "Failed to get room messages" });
    }
  });

  app.get('/api/conversations', requireAuth, async (req: any, res) => {
    try {
      const conversations = await storage.getRecentConversations(req.session.userId);
      res.json(conversations);
    } catch (error) {
      console.error("Get conversations error:", error);
      res.status(500).json({ message: "Failed to get conversations" });
    }
  });

  // Chat room routes
  app.get('/api/rooms', requireAuth, async (req: any, res) => {
    try {
      const rooms = await storage.getChatRooms();
      res.json(rooms);
    } catch (error) {
      console.error("Get rooms error:", error);
      res.status(500).json({ message: "Failed to get rooms" });
    }
  });

  app.post('/api/rooms', requireAuth, async (req: any, res) => {
    try {
      const validatedData = insertChatRoomSchema.parse({
        ...req.body,
        createdBy: req.session.userId,
      });
      
      const room = await storage.createChatRoom(validatedData);
      await storage.joinChatRoom(req.session.userId, room.id);
      
      res.json(room);
    } catch (error) {
      console.error("Create room error:", error);
      res.status(500).json({ message: "Failed to create room" });
    }
  });

  app.post('/api/rooms/:roomId/join', requireAuth, async (req: any, res) => {
    try {
      const roomId = parseInt(req.params.roomId);
      await storage.joinChatRoom(req.session.userId, roomId);
      res.json({ message: "Joined room successfully" });
    } catch (error) {
      console.error("Join room error:", error);
      res.status(500).json({ message: "Failed to join room" });
    }
  });

  app.post('/api/rooms/:roomId/leave', requireAuth, async (req: any, res) => {
    try {
      const roomId = parseInt(req.params.roomId);
      await storage.leaveChatRoom(req.session.userId, roomId);
      res.json({ message: "Left room successfully" });
    } catch (error) {
      console.error("Leave room error:", error);
      res.status(500).json({ message: "Failed to leave room" });
    }
  });

  // Friend routes
  app.get('/api/friends', requireAuth, async (req: any, res) => {
    try {
      const friends = await storage.getFriends(req.session.userId);
      res.json(friends);
    } catch (error) {
      console.error("Get friends error:", error);
      res.status(500).json({ message: "Failed to get friends" });
    }
  });

  app.get('/api/friends/requests', requireAuth, async (req: any, res) => {
    try {
      const requests = await storage.getFriendRequests(req.session.userId);
      res.json(requests);
    } catch (error) {
      console.error("Get friend requests error:", error);
      res.status(500).json({ message: "Failed to get friend requests" });
    }
  });

  app.post('/api/friends/request', requireAuth, async (req: any, res) => {
    try {
      const { friendId } = req.body;
      const validatedData = insertFriendshipSchema.parse({
        userId: req.session.userId,
        friendId,
        status: 'pending',
      });
      
      const friendship = await storage.createFriendship(validatedData);
      res.json(friendship);
    } catch (error) {
      console.error("Send friend request error:", error);
      res.status(500).json({ message: "Failed to send friend request" });
    }
  });

  app.post('/api/friends/accept', requireAuth, async (req: any, res) => {
    try {
      const { friendId } = req.body;
      await storage.acceptFriendRequest(req.session.userId, friendId);
      res.json({ message: "Friend request accepted" });
    } catch (error) {
      console.error("Accept friend request error:", error);
      res.status(500).json({ message: "Failed to accept friend request" });
    }
  });

  app.post('/api/friends/reject', requireAuth, async (req: any, res) => {
    try {
      const { friendId } = req.body;
      await storage.rejectFriendRequest(req.session.userId, friendId);
      res.json({ message: "Friend request rejected" });
    } catch (error) {
      console.error("Reject friend request error:", error);
      res.status(500).json({ message: "Failed to reject friend request" });
    }
  });

  // Create HTTP server
  const httpServer = createServer(app);

  // WebSocket server
  const wss = new WebSocketServer({ 
    server: httpServer, 
    path: '/ws',
    verifyClient: (info: any) => {
      return true; // We'll handle auth in the connection handler
    }
  });

  wss.on('connection', (ws, req) => {
    let userId: number | null = null;

    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());
        
        if (message.type === 'auth') {
          // Handle authentication
          userId = message.userId;
          if (userId) {
            activeConnections.set(userId, ws);
            ws.send(JSON.stringify({ type: 'auth_success' }));
          }
        } else if (message.type === 'message' && userId) {
          // Handle new message
          const validatedMessage = insertMessageSchema.parse({
            ...message.data,
            senderId: userId,
          });
          
          const newMessage = await storage.createMessage(validatedMessage);
          
          // Broadcast to relevant users
          const messageData = {
            type: 'new_message',
            data: newMessage,
          };
          
          // Send to receiver (if direct message)
          if (newMessage.receiverId) {
            const receiverWs = activeConnections.get(newMessage.receiverId);
            if (receiverWs && receiverWs.readyState === WebSocket.OPEN) {
              receiverWs.send(JSON.stringify(messageData));
            }
          }
          
          // Send to chat room members (if room message)
          if (newMessage.chatRoomId) {
            const members = await storage.getChatRoomMembers(newMessage.chatRoomId);
            members.forEach(member => {
              if (member.id !== userId) {
                const memberWs = activeConnections.get(member.id);
                if (memberWs && memberWs.readyState === WebSocket.OPEN) {
                  memberWs.send(JSON.stringify(messageData));
                }
              }
            });
          }
          
          // Send confirmation to sender
          ws.send(JSON.stringify({
            type: 'message_sent',
            data: newMessage,
          }));
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
        ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
      }
    });

    ws.on('close', () => {
      if (userId) {
        activeConnections.delete(userId);
      }
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  });

  return httpServer;
}
