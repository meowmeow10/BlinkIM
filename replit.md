# replit.md

## Overview

This is a full-stack chat application built with React, Express, and PostgreSQL. The application provides real-time messaging capabilities with direct messages, chat rooms, and friend management. It uses modern web technologies including WebSockets for real-time communication, shadcn/ui for the frontend components, and Drizzle ORM for database operations.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript
- **Styling**: Tailwind CSS with shadcn/ui components
- **State Management**: TanStack Query for server state management
- **Routing**: Wouter for client-side routing
- **Build Tool**: Vite for development and production builds
- **Real-time Communication**: WebSocket client for live messaging

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Session-based authentication with express-session
- **Real-time Communication**: WebSocket server for message broadcasting
- **File Handling**: Multer for file uploads (profile pictures)
- **Security**: bcrypt for password hashing

### Database Architecture
- **ORM**: Drizzle ORM with PostgreSQL dialect
- **Connection**: Neon serverless PostgreSQL
- **Session Store**: PostgreSQL-based session storage
- **Schema**: Defined in shared/schema.ts with proper relations

## Key Components

### Database Schema
- **users**: User profiles with authentication and status
- **messages**: Direct and chat room messages
- **chatRooms**: Public and private chat rooms
- **friendships**: Friend relationships and requests
- **chatRoomMembers**: Chat room membership management

### Authentication System
- Session-based authentication using express-session
- Password hashing with bcrypt
- Session persistence in PostgreSQL
- Protected routes with authentication middleware

### Real-time Messaging
- WebSocket server for real-time communication
- Message broadcasting to relevant users
- Online status tracking
- Notification system with browser notifications

### File Management
- Profile picture upload with Multer
- File type validation (images only)
- Size limits (5MB)
- Secure file storage

## Data Flow

1. **User Authentication**
   - User registers/logs in through React frontend
   - Credentials sent to Express server
   - Server validates and creates session
   - Session stored in PostgreSQL

2. **Message Flow**
   - User sends message through React interface
   - Message sent via WebSocket to server
   - Server validates and stores in database
   - Message broadcasted to relevant recipients
   - Real-time updates in recipient interfaces

3. **Friend Management**
   - Friend requests sent through API
   - Status updates stored in database
   - Real-time notifications for requests/acceptances

## External Dependencies

### Frontend Dependencies
- React ecosystem (React, React DOM)
- shadcn/ui components (@radix-ui/react-*)
- TanStack Query for data fetching
- Tailwind CSS for styling
- Wouter for routing
- Lucide React for icons

### Backend Dependencies
- Express.js with TypeScript support
- Drizzle ORM with PostgreSQL
- Neon serverless PostgreSQL
- WebSocket (ws) for real-time communication
- bcrypt for password hashing
- express-session for authentication
- Multer for file uploads

### Development Dependencies
- Vite for frontend tooling
- TypeScript for type safety
- ESBuild for backend bundling
- Tailwind CSS for styling
- PostCSS for CSS processing

## Deployment Strategy

### Development Environment
- Vite dev server for frontend hot reloading
- tsx for TypeScript execution in development
- WebSocket server integrated with Express
- Database migrations with Drizzle Kit

### Production Build
- Frontend: Vite build to static assets
- Backend: ESBuild bundle to single JavaScript file
- Database: Migrations applied via Drizzle Kit
- Environment variables for configuration

### Environment Configuration
- `DATABASE_URL`: PostgreSQL connection string
- `SESSION_SECRET`: Session encryption key
- `NODE_ENV`: Environment indicator
- File upload directory configuration

## User Preferences

Preferred communication style: Simple, everyday language.

## Changelog

```
Changelog:
- July 04, 2025. Initial setup
```