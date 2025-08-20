/**
 * WebSocket Service for Real-time Updates
 * Handles live stock prices, notifications, and user presence
 */

import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { Redis } from '@upstash/redis';
import { EmailService } from '@/lib/services/email.service';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export interface RealtimeStockUpdate {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  timestamp: Date;
}

export interface RealtimeNotification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'perfect_storm';
  title: string;
  message: string;
  data?: any;
  timestamp: Date;
}

export interface UserPresence {
  userId: string;
  socketId: string;
  connectedAt: Date;
  lastActivity: Date;
  currentPage?: string;
}

export class WebSocketService {
  private io: SocketIOServer | null = null;
  private userSockets: Map<string, Set<string>> = new Map(); // userId -> Set of socketIds
  private socketUsers: Map<string, string> = new Map(); // socketId -> userId
  private stockSubscriptions: Map<string, Set<string>> = new Map(); // symbol -> Set of socketIds
  
  /**
   * Initialize WebSocket server
   */
  initialize(server: HTTPServer): void {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        credentials: true,
      },
      transports: ['websocket', 'polling'],
    });

    this.io.on('connection', (socket: Socket) => {
      console.log(`Client connected: ${socket.id}`);
      
      // Handle authentication
      socket.on('authenticate', async (data: { userId: string; token: string }) => {
        await this.handleAuthentication(socket, data);
      });
      
      // Handle stock subscriptions
      socket.on('subscribe:stock', (symbol: string) => {
        this.subscribeToStock(socket, symbol);
      });
      
      socket.on('unsubscribe:stock', (symbol: string) => {
        this.unsubscribeFromStock(socket, symbol);
      });
      
      // Handle page navigation (for presence tracking)
      socket.on('page:change', async (page: string) => {
        await this.updateUserPage(socket, page);
      });
      
      // Handle user activity
      socket.on('activity', async () => {
        await this.updateUserActivity(socket);
      });
      
      // Handle disconnection
      socket.on('disconnect', () => {
        this.handleDisconnect(socket);
      });
    });

    // Start periodic tasks
    this.startPeriodicTasks();
  }

  /**
   * Handle user authentication
   */
  private async handleAuthentication(
    socket: Socket,
    data: { userId: string; token: string }
  ): Promise<void> {
    try {
      // Verify token (simplified - in production, verify JWT)
      if (!data.userId || !data.token) {
        socket.emit('auth:error', 'Invalid credentials');
        socket.disconnect();
        return;
      }
      
      // Track user socket
      const userId = data.userId;
      this.socketUsers.set(socket.id, userId);
      
      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, new Set());
      }
      this.userSockets.get(userId)!.add(socket.id);
      
      // Update user presence
      await this.updateUserPresence(userId, socket.id, true);
      
      // Send success response
      socket.emit('auth:success', { userId });
      
      // Join user-specific room for targeted messages
      socket.join(`user:${userId}`);
      
      // Send any pending notifications
      await this.sendPendingNotifications(socket, userId);
      
      console.log(`User ${userId} authenticated with socket ${socket.id}`);
    } catch (error) {
      console.error('Authentication error:', error);
      socket.emit('auth:error', 'Authentication failed');
      socket.disconnect();
    }
  }

  /**
   * Subscribe to real-time stock updates
   */
  private subscribeToStock(socket: Socket, symbol: string): void {
    if (!symbol) return;
    
    const upperSymbol = symbol.toUpperCase();
    
    // Add socket to stock subscription
    if (!this.stockSubscriptions.has(upperSymbol)) {
      this.stockSubscriptions.set(upperSymbol, new Set());
    }
    this.stockSubscriptions.get(upperSymbol)!.add(socket.id);
    
    // Join stock-specific room
    socket.join(`stock:${upperSymbol}`);
    
    console.log(`Socket ${socket.id} subscribed to ${upperSymbol}`);
    
    // Send current stock data immediately
    this.sendCurrentStockData(socket, upperSymbol);
  }

  /**
   * Unsubscribe from stock updates
   */
  private unsubscribeFromStock(socket: Socket, symbol: string): void {
    if (!symbol) return;
    
    const upperSymbol = symbol.toUpperCase();
    
    // Remove socket from stock subscription
    if (this.stockSubscriptions.has(upperSymbol)) {
      this.stockSubscriptions.get(upperSymbol)!.delete(socket.id);
      
      // Clean up empty sets
      if (this.stockSubscriptions.get(upperSymbol)!.size === 0) {
        this.stockSubscriptions.delete(upperSymbol);
      }
    }
    
    // Leave stock-specific room
    socket.leave(`stock:${upperSymbol}`);
    
    console.log(`Socket ${socket.id} unsubscribed from ${upperSymbol}`);
  }

  /**
   * Handle socket disconnection
   */
  private handleDisconnect(socket: Socket): void {
    const userId = this.socketUsers.get(socket.id);
    
    if (userId) {
      // Remove socket from user's socket set
      const userSocketSet = this.userSockets.get(userId);
      if (userSocketSet) {
        userSocketSet.delete(socket.id);
        
        // If user has no more sockets, they're offline
        if (userSocketSet.size === 0) {
          this.userSockets.delete(userId);
          this.updateUserPresence(userId, socket.id, false);
        }
      }
      
      this.socketUsers.delete(socket.id);
    }
    
    // Remove from all stock subscriptions
    for (const [symbol, sockets] of this.stockSubscriptions.entries()) {
      sockets.delete(socket.id);
      if (sockets.size === 0) {
        this.stockSubscriptions.delete(symbol);
      }
    }
    
    console.log(`Client disconnected: ${socket.id}`);
  }

  /**
   * Update user presence in Redis
   */
  private async updateUserPresence(
    userId: string,
    socketId: string,
    isOnline: boolean
  ): Promise<void> {
    try {
      const presenceKey = `presence:${userId}`;
      
      if (isOnline) {
        const presence: UserPresence = {
          userId,
          socketId,
          connectedAt: new Date(),
          lastActivity: new Date(),
        };
        
        await redis.setex(presenceKey, 300, JSON.stringify(presence)); // 5 minute TTL
        
        // Update user activity for email service
        await EmailService.updateUserActivity(userId);
      } else {
        await redis.del(presenceKey);
      }
    } catch (error) {
      console.error('Presence update error:', error);
    }
  }

  /**
   * Update user's current page
   */
  private async updateUserPage(socket: Socket, page: string): Promise<void> {
    const userId = this.socketUsers.get(socket.id);
    if (!userId) return;
    
    try {
      const presenceKey = `presence:${userId}`;
      const presenceData = await redis.get(presenceKey);
      
      if (presenceData) {
        const presence = JSON.parse(presenceData as string) as UserPresence;
        presence.currentPage = page;
        presence.lastActivity = new Date();
        
        await redis.setex(presenceKey, 300, JSON.stringify(presence));
      }
    } catch (error) {
      console.error('Page update error:', error);
    }
  }

  /**
   * Update user activity timestamp
   */
  private async updateUserActivity(socket: Socket): Promise<void> {
    const userId = this.socketUsers.get(socket.id);
    if (!userId) return;
    
    await EmailService.updateUserActivity(userId);
    await this.updateUserPresence(userId, socket.id, true);
  }

  /**
   * Send current stock data to a socket
   */
  private async sendCurrentStockData(socket: Socket, symbol: string): Promise<void> {
    try {
      // Get cached stock data from Redis
      const stockKey = `stock:${symbol}`;
      const stockData = await redis.get(stockKey);
      
      if (stockData) {
        socket.emit('stock:update', stockData);
      }
    } catch (error) {
      console.error('Send stock data error:', error);
    }
  }

  /**
   * Send pending notifications to a user
   */
  private async sendPendingNotifications(socket: Socket, userId: string): Promise<void> {
    try {
      // Get unread notifications from database
      // This would normally query the database
      const notificationsKey = `notifications:${userId}:unread`;
      const notifications = await redis.lrange(notificationsKey, 0, -1);
      
      for (const notificationJson of notifications) {
        const notification = JSON.parse(notificationJson as string);
        socket.emit('notification', notification);
      }
      
      // Clear the unread notifications
      await redis.del(notificationsKey);
    } catch (error) {
      console.error('Send pending notifications error:', error);
    }
  }

  /**
   * Broadcast stock update to all subscribers
   */
  broadcastStockUpdate(update: RealtimeStockUpdate): void {
    if (!this.io) return;
    
    // Emit to stock-specific room
    this.io.to(`stock:${update.symbol}`).emit('stock:update', update);
    
    // Cache the update in Redis
    this.cacheStockUpdate(update);
  }

  /**
   * Send notification to specific user
   */
  sendNotificationToUser(userId: string, notification: RealtimeNotification): void {
    if (!this.io) return;
    
    // Check if user is online
    if (this.userSockets.has(userId)) {
      // User is online, send directly
      this.io.to(`user:${userId}`).emit('notification', notification);
    } else {
      // User is offline, queue the notification
      this.queueNotification(userId, notification);
    }
  }

  /**
   * Broadcast notification to all users
   */
  broadcastNotification(notification: RealtimeNotification): void {
    if (!this.io) return;
    
    this.io.emit('notification', notification);
  }

  /**
   * Cache stock update in Redis
   */
  private async cacheStockUpdate(update: RealtimeStockUpdate): Promise<void> {
    try {
      const stockKey = `stock:${update.symbol}`;
      await redis.setex(stockKey, 60, JSON.stringify(update)); // 1 minute cache
      
      // Also update in a sorted set for tracking latest updates
      const latestKey = 'stock:latest';
      await redis.zadd(latestKey, {
        score: Date.now(),
        member: update.symbol,
      });
    } catch (error) {
      console.error('Cache stock update error:', error);
    }
  }

  /**
   * Queue notification for offline user
   */
  private async queueNotification(
    userId: string,
    notification: RealtimeNotification
  ): Promise<void> {
    try {
      const notificationsKey = `notifications:${userId}:unread`;
      await redis.lpush(notificationsKey, JSON.stringify(notification));
      await redis.expire(notificationsKey, 86400); // Expire after 24 hours
    } catch (error) {
      console.error('Queue notification error:', error);
    }
  }

  /**
   * Start periodic tasks
   */
  private startPeriodicTasks(): void {
    // Heartbeat to keep connections alive
    setInterval(() => {
      if (this.io) {
        this.io.emit('heartbeat', { timestamp: new Date() });
      }
    }, 30000); // Every 30 seconds
    
    // Clean up stale presence data
    setInterval(async () => {
      await this.cleanupStalePresence();
    }, 60000); // Every minute
  }

  /**
   * Clean up stale presence data
   */
  private async cleanupStalePresence(): Promise<void> {
    try {
      // This would normally scan Redis for expired presence keys
      // and clean up the in-memory maps accordingly
      console.log('Cleaning up stale presence data...');
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  }

  /**
   * Get online users count
   */
  getOnlineUsersCount(): number {
    return this.userSockets.size;
  }

  /**
   * Get subscribed stocks
   */
  getSubscribedStocks(): string[] {
    return Array.from(this.stockSubscriptions.keys());
  }

  /**
   * Check if user is online
   */
  isUserOnline(userId: string): boolean {
    return this.userSockets.has(userId);
  }

  /**
   * Shutdown WebSocket server gracefully
   */
  shutdown(): void {
    if (this.io) {
      // Notify all clients
      this.io.emit('server:shutdown', { message: 'Server is shutting down' });
      
      // Close all connections
      this.io.disconnectSockets();
      
      // Close the server
      this.io.close();
      
      // Clear maps
      this.userSockets.clear();
      this.socketUsers.clear();
      this.stockSubscriptions.clear();
      
      console.log('WebSocket server shut down');
    }
  }
}

// Export singleton instance
export const websocketService = new WebSocketService();
