import { pgTable, text, serial, integer, boolean, timestamp, varchar, uuid } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  password: text("password").notNull(),
  displayName: varchar("display_name", { length: 100 }).notNull(),
  profilePicture: text("profile_picture"),
  status: varchar("status", { length: 20 }).default("online"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const chatRooms = pgTable("chat_rooms", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  isPrivate: boolean("is_private").default(false),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  content: text("content").notNull(),
  senderId: integer("sender_id").references(() => users.id).notNull(),
  receiverId: integer("receiver_id").references(() => users.id),
  chatRoomId: integer("chat_room_id").references(() => chatRooms.id),
  messageType: varchar("message_type", { length: 20 }).default("text"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const friendships = pgTable("friendships", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  friendId: integer("friend_id").references(() => users.id).notNull(),
  status: varchar("status", { length: 20 }).default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const chatRoomMembers = pgTable("chat_room_members", {
  id: serial("id").primaryKey(),
  chatRoomId: integer("chat_room_id").references(() => chatRooms.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  role: varchar("role", { length: 20 }).default("member"),
  joinedAt: timestamp("joined_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  sentMessages: many(messages, { relationName: "sentMessages" }),
  receivedMessages: many(messages, { relationName: "receivedMessages" }),
  friendships: many(friendships, { relationName: "userFriendships" }),
  friendOf: many(friendships, { relationName: "friendOf" }),
  chatRoomMemberships: many(chatRoomMembers),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  sender: one(users, {
    fields: [messages.senderId],
    references: [users.id],
    relationName: "sentMessages",
  }),
  receiver: one(users, {
    fields: [messages.receiverId],
    references: [users.id],
    relationName: "receivedMessages",
  }),
  chatRoom: one(chatRooms, {
    fields: [messages.chatRoomId],
    references: [chatRooms.id],
  }),
}));

export const chatRoomsRelations = relations(chatRooms, ({ many, one }) => ({
  messages: many(messages),
  members: many(chatRoomMembers),
  creator: one(users, {
    fields: [chatRooms.createdBy],
    references: [users.id],
  }),
}));

export const friendshipsRelations = relations(friendships, ({ one }) => ({
  user: one(users, {
    fields: [friendships.userId],
    references: [users.id],
    relationName: "userFriendships",
  }),
  friend: one(users, {
    fields: [friendships.friendId],
    references: [users.id],
    relationName: "friendOf",
  }),
}));

export const chatRoomMembersRelations = relations(chatRoomMembers, ({ one }) => ({
  chatRoom: one(chatRooms, {
    fields: [chatRoomMembers.chatRoomId],
    references: [chatRooms.id],
  }),
  user: one(users, {
    fields: [chatRoomMembers.userId],
    references: [users.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  email: true,
  password: true,
  displayName: true,
  profilePicture: true,
  status: true,
});

export const insertMessageSchema = createInsertSchema(messages).pick({
  content: true,
  senderId: true,
  receiverId: true,
  chatRoomId: true,
  messageType: true,
});

export const insertChatRoomSchema = createInsertSchema(chatRooms).pick({
  name: true,
  description: true,
  isPrivate: true,
  createdBy: true,
});

export const insertFriendshipSchema = createInsertSchema(friendships).pick({
  userId: true,
  friendId: true,
  status: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type ChatRoom = typeof chatRooms.$inferSelect;
export type InsertChatRoom = z.infer<typeof insertChatRoomSchema>;
export type Friendship = typeof friendships.$inferSelect;
export type InsertFriendship = z.infer<typeof insertFriendshipSchema>;
export type ChatRoomMember = typeof chatRoomMembers.$inferSelect;
