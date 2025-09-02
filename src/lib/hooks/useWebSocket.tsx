/**
 * WebSocket Hook for React Components
 * Provides real-time updates and notifications
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '@/lib/hooks/useAuth';
import { toast } from 'react-hot-toast';

export interface WebSocketStatus {
  connected: boolean;
  connecting: boolean;
  error: string | null;
}

export interface StockUpdate {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  timestamp: Date;
}

export interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'perfect_storm';
  title: string;
  message: string;
  data?: any;
  timestamp: Date;
}

export function useWebSocket() {
  const socketRef = useRef<Socket | null>(null);
  const [status, setStatus] = useState<WebSocketStatus>({
    connected: false,
    connecting: false,
    error: null,
  });
  const [stockUpdates, setStockUpdates] = useState<Map<string, StockUpdate>>(new Map());
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const { user } = useAuth();

  // Initialize WebSocket connection
  useEffect(() => {
    // Temporarily disable WebSocket connection to prevent errors
    // TODO: Re-enable when WebSocket server is properly configured
    return;
    
    if (!user) return;

    setStatus(prev => ({ ...prev, connecting: true }));

    // Create socket connection
    const socket = io(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000', {
      transports: ['websocket', 'polling'],
      autoConnect: true,
    });

    socketRef.current = socket;

    // Connection events
    socket.on('connect', () => {
      console.log('WebSocket connected');
      setStatus({ connected: true, connecting: false, error: null });
      
      // Authenticate with server
      if (user) {
        socket.emit('authenticate', {
          userId: user.id,
          // Note: In production, get the actual session token from Supabase
          token: 'mock-token', // TODO: Get actual session token
        });
      }
    });

    socket.on('disconnect', () => {
      console.log('WebSocket disconnected');
      setStatus({ connected: false, connecting: false, error: 'Disconnected' });
    });

    socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      setStatus({ connected: false, connecting: false, error: error.message });
    });

    // Authentication events
    socket.on('auth:success', (data) => {
      console.log('WebSocket authenticated:', data);
    });

    socket.on('auth:error', (error) => {
      console.error('WebSocket auth error:', error);
      setStatus({ connected: false, connecting: false, error });
      socket.disconnect();
    });

    // Stock update events
    socket.on('stock:update', (update: StockUpdate) => {
      setStockUpdates(prev => {
        const newMap = new Map(prev);
        newMap.set(update.symbol, {
          ...update,
          timestamp: new Date(update.timestamp),
        });
        return newMap;
      });
    });

    // Notification events
    socket.on('notification', (notification: Notification) => {
      // Add to notifications list
      setNotifications(prev => [{
        ...notification,
        timestamp: new Date(notification.timestamp),
      }, ...prev].slice(0, 50)); // Keep last 50 notifications
      
      // Show toast based on notification type
      switch (notification.type) {
        case 'perfect_storm':
          toast.custom((t) => (
            <div className="bg-green-600 text-white p-4 rounded-lg shadow-lg max-w-md">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <span className="text-2xl">⚡</span>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium">{notification.title}</p>
                  <p className="mt-1 text-sm opacity-90">{notification.message}</p>
                </div>
                <button
                  onClick={() => toast.dismiss(t.id)}
                  className="ml-4 flex-shrink-0 text-white hover:text-gray-200"
                >
                  ✕
                </button>
              </div>
            </div>
          ), {
            duration: 10000,
            position: 'top-right',
          });
          break;
        case 'success':
          toast.success(notification.message, { duration: 5000 });
          break;
        case 'error':
          toast.error(notification.message, { duration: 5000 });
          break;
        case 'warning':
          toast(notification.message, {
            icon: '⚠️',
            duration: 5000,
          });
          break;
        default:
          toast(notification.message, { duration: 5000 });
      }
    });

    // Heartbeat to keep connection alive
    socket.on('heartbeat', () => {
      // Send activity event to update user presence
      socket.emit('activity');
    });

    // Server shutdown notice
    socket.on('server:shutdown', (data) => {
      toast.error(data.message || 'Server is shutting down', { duration: 10000 });
    });

    // Cleanup on unmount
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [user]);

  // Subscribe to stock updates
  const subscribeToStock = useCallback((symbol: string) => {
    if (socketRef.current && status.connected) {
      socketRef.current.emit('subscribe:stock', symbol);
    }
  }, [status.connected]);

  // Unsubscribe from stock updates
  const unsubscribeFromStock = useCallback((symbol: string) => {
    if (socketRef.current && status.connected) {
      socketRef.current.emit('unsubscribe:stock', symbol);
      
      // Remove from local state
      setStockUpdates(prev => {
        const newMap = new Map(prev);
        newMap.delete(symbol);
        return newMap;
      });
    }
  }, [status.connected]);

  // Notify page change for presence tracking
  const notifyPageChange = useCallback((page: string) => {
    if (socketRef.current && status.connected) {
      socketRef.current.emit('page:change', page);
    }
  }, [status.connected]);

  // Clear notifications
  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  // Mark notification as read
  const markNotificationRead = useCallback((notificationId: string) => {
    setNotifications(prev => 
      prev.filter(n => n.id !== notificationId)
    );
  }, []);

  // Get latest stock update for a symbol
  const getStockUpdate = useCallback((symbol: string): StockUpdate | undefined => {
    return stockUpdates.get(symbol);
  }, [stockUpdates]);

  return {
    status,
    stockUpdates: Array.from(stockUpdates.values()),
    notifications,
    subscribeToStock,
    unsubscribeFromStock,
    notifyPageChange,
    clearNotifications,
    markNotificationRead,
    getStockUpdate,
  };
}

/**
 * Hook for subscribing to specific stock updates
 */
export function useStockSubscription(symbol: string | null) {
  const { subscribeToStock, unsubscribeFromStock, getStockUpdate, status } = useWebSocket();
  const [stockData, setStockData] = useState<StockUpdate | null>(null);

  useEffect(() => {
    if (!symbol || !status.connected) return;

    // Subscribe to stock
    subscribeToStock(symbol);

    // Check for updates periodically
    const interval = setInterval(() => {
      const update = getStockUpdate(symbol);
      if (update) {
        setStockData(update);
      }
    }, 1000);

    // Cleanup
    return () => {
      unsubscribeFromStock(symbol);
      clearInterval(interval);
    };
  }, [symbol, status.connected, subscribeToStock, unsubscribeFromStock, getStockUpdate]);

  return stockData;
}

/**
 * Hook for tracking page presence
 */
export function usePagePresence(pageName: string) {
  const { notifyPageChange, status } = useWebSocket();

  useEffect(() => {
    if (!status.connected) return;

    // Notify server of page change
    notifyPageChange(pageName);

    // Send activity ping every 30 seconds while on page
    const interval = setInterval(() => {
      notifyPageChange(pageName);
    }, 30000);

    return () => {
      clearInterval(interval);
    };
  }, [pageName, status.connected, notifyPageChange]);
}
