import {
  users,
  messages,
  chatRooms,
  friendships,
  chatRoomMembers,
  type User,
  type InsertUser,
  type Message,
  type InsertMessage,
  type ChatRoom,
  type InsertChatRoom,
  type Friendship,
  type InsertFriendship,
  type ChatRoomMember,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, or, sql, isNull } from "drizzle-orm";
import bcrypt from "bcrypt";

export interface IStorage {
  // User operations
  createUser(user: InsertUser): Promise<User>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserById(id: number): Promise<User | undefined>;
  updateUser(id: number, updates: Partial<User>): Promise<User>;
  verifyPassword(password: string, hash: string): Promise<boolean>;
  
  // Message operations
  createMessage(message: InsertMessage): Promise<Message>;
  getDirectMessages(userId1: number, userId2: number, limit?: number): Promise<Message[]>;
  getChatRoomMessages(chatRoomId: number, limit?: number): Promise<Message[]>;
  getRecentConversations(userId: number): Promise<any[]>;
  
  // Chat room operations
  createChatRoom(room: InsertChatRoom): Promise<ChatRoom>;
  getChatRooms(): Promise<ChatRoom[]>;
  getChatRoom(id: number): Promise<ChatRoom | undefined>;
  joinChatRoom(userId: number, chatRoomId: number): Promise<void>;
  leaveChatRoom(userId: number, chatRoomId: number): Promise<void>;
  getChatRoomMembers(chatRoomId: number): Promise<Omit<User, 'password'>[]>;
  
  // Friendship operations
  createFriendship(friendship: InsertFriendship): Promise<Friendship>;
  getFriends(userId: number): Promise<Omit<User, 'password'>[]>;
  getFriendRequests(userId: number): Promise<Omit<User, 'password'>[]>;
  acceptFriendRequest(userId: number, friendId: number): Promise<void>;
  rejectFriendRequest(userId: number, friendId: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async createUser(insertUser: InsertUser): Promise<User> {
    const hashedPassword = await bcrypt.hash(insertUser.password, 10);
    const [user] = await db
      .insert(users)
      .values({
        ...insertUser,
        password: hashedPassword,
      })
      .returning();
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getUserById(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async updateUser(id: number, updates: Partial<User>): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    const [newMessage] = await db
      .insert(messages)
      .values(message)
      .returning();
    return newMessage;
  }

  async getDirectMessages(userId1: number, userId2: number, limit: number = 50): Promise<Message[]> {
    const messageList = await db
      .select({
        id: messages.id,
        content: messages.content,
        senderId: messages.senderId,
        receiverId: messages.receiverId,
        chatRoomId: messages.chatRoomId,
        messageType: messages.messageType,
        createdAt: messages.createdAt,
        senderName: users.displayName,
        senderAvatar: users.profilePicture,
      })
      .from(messages)
      .innerJoin(users, eq(messages.senderId, users.id))
      .where(
        and(
          or(
            and(eq(messages.senderId, userId1), eq(messages.receiverId, userId2)),
            and(eq(messages.senderId, userId2), eq(messages.receiverId, userId1))
          ),
          isNull(messages.chatRoomId)
        )
      )
      .orderBy(desc(messages.createdAt))
      .limit(limit);
    
    return messageList.reverse();
  }

  async getChatRoomMessages(chatRoomId: number, limit: number = 50): Promise<Message[]> {
    const messageList = await db
      .select({
        id: messages.id,
        content: messages.content,
        senderId: messages.senderId,
        receiverId: messages.receiverId,
        chatRoomId: messages.chatRoomId,
        messageType: messages.messageType,
        createdAt: messages.createdAt,
        senderName: users.displayName,
        senderAvatar: users.profilePicture,
      })
      .from(messages)
      .innerJoin(users, eq(messages.senderId, users.id))
      .where(eq(messages.chatRoomId, chatRoomId))
      .orderBy(desc(messages.createdAt))
      .limit(limit);
    
    return messageList.reverse();
  }

  async getRecentConversations(userId: number): Promise<any[]> {
    // Get recent direct messages
    const directMessages = await db
      .select({
        id: messages.id,
        content: messages.content,
        senderId: messages.senderId,
        receiverId: messages.receiverId,
        createdAt: messages.createdAt,
        otherUserId: sql<number>`CASE WHEN ${messages.senderId} = ${userId} THEN ${messages.receiverId} ELSE ${messages.senderId} END`,
      })
      .from(messages)
      .where(
        and(
          or(eq(messages.senderId, userId), eq(messages.receiverId, userId)),
          isNull(messages.chatRoomId)
        )
      )
      .orderBy(desc(messages.createdAt));

    // Get unique conversations with latest message
    const conversations = new Map();
    for (const msg of directMessages) {
      const otherUserId = msg.otherUserId;
      if (!conversations.has(otherUserId)) {
        conversations.set(otherUserId, msg);
      }
    }

    // Get user details for each conversation
    const conversationList = [];
    for (const [otherUserId, lastMessage] of Array.from(conversations.entries())) {
      const otherUser = await this.getUserById(otherUserId);
      if (otherUser) {
        conversationList.push({
          type: 'direct',
          user: otherUser,
          lastMessage: lastMessage.content,
          lastMessageTime: lastMessage.createdAt,
          unreadCount: 0, // TODO: Implement unread count
        });
      }
    }

    return conversationList.sort((a, b) => 
      new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime()
    );
  }

  async createChatRoom(room: InsertChatRoom): Promise<ChatRoom> {
    const [newRoom] = await db
      .insert(chatRooms)
      .values(room)
      .returning();
    return newRoom;
  }

  async getChatRooms(): Promise<ChatRoom[]> {
    return db.select().from(chatRooms).orderBy(desc(chatRooms.createdAt));
  }

  async getChatRoom(id: number): Promise<ChatRoom | undefined> {
    const [room] = await db.select().from(chatRooms).where(eq(chatRooms.id, id));
    return room;
  }

  async joinChatRoom(userId: number, chatRoomId: number): Promise<void> {
    await db
      .insert(chatRoomMembers)
      .values({
        userId,
        chatRoomId,
        role: 'member',
      })
      .onConflictDoNothing();
  }

  async leaveChatRoom(userId: number, chatRoomId: number): Promise<void> {
    await db
      .delete(chatRoomMembers)
      .where(
        and(
          eq(chatRoomMembers.userId, userId),
          eq(chatRoomMembers.chatRoomId, chatRoomId)
        )
      );
  }

  async getChatRoomMembers(chatRoomId: number): Promise<Omit<User, 'password'>[]> {
    const members = await db
      .select({
        id: users.id,
        email: users.email,
        displayName: users.displayName,
        profilePicture: users.profilePicture,
        status: users.status,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(chatRoomMembers)
      .innerJoin(users, eq(chatRoomMembers.userId, users.id))
      .where(eq(chatRoomMembers.chatRoomId, chatRoomId));
    
    return members;
  }

  async createFriendship(friendship: InsertFriendship): Promise<Friendship> {
    const [newFriendship] = await db
      .insert(friendships)
      .values(friendship)
      .returning();
    return newFriendship;
  }

  async getFriends(userId: number): Promise<Omit<User, 'password'>[]> {
    const friends = await db
      .select({
        id: users.id,
        email: users.email,
        displayName: users.displayName,
        profilePicture: users.profilePicture,
        status: users.status,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(friendships)
      .innerJoin(users, eq(friendships.friendId, users.id))
      .where(
        and(
          eq(friendships.userId, userId),
          eq(friendships.status, 'accepted')
        )
      );
    
    return friends;
  }

  async getFriendRequests(userId: number): Promise<Omit<User, 'password'>[]> {
    const requests = await db
      .select({
        id: users.id,
        email: users.email,
        displayName: users.displayName,
        profilePicture: users.profilePicture,
        status: users.status,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(friendships)
      .innerJoin(users, eq(friendships.userId, users.id))
      .where(
        and(
          eq(friendships.friendId, userId),
          eq(friendships.status, 'pending')
        )
      );
    
    return requests;
  }

  async acceptFriendRequest(userId: number, friendId: number): Promise<void> {
    await db
      .update(friendships)
      .set({ status: 'accepted' })
      .where(
        and(
          eq(friendships.userId, friendId),
          eq(friendships.friendId, userId)
        )
      );
  }

  async rejectFriendRequest(userId: number, friendId: number): Promise<void> {
    await db
      .delete(friendships)
      .where(
        and(
          eq(friendships.userId, friendId),
          eq(friendships.friendId, userId)
        )
      );
  }
}

export const storage = new DatabaseStorage();
