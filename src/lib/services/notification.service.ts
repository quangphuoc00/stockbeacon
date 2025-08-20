/**
 * Smart Notification Service
 * Handles multi-channel notifications with intelligent delivery
 */

import { EmailService, EmailRecipient, PerfectStormAlertData } from './email.service';
import { createClient } from '@/lib/supabase/server';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export interface NotificationPreferences {
  emailEnabled: boolean;
  pushEnabled: boolean;
  perfectStormAlerts: boolean;
  priceAlerts: boolean;
  dailyDigest: boolean;
  weeklyReport: boolean;
  maxEmailsPerDay: number;
  quietHoursStart?: string; // e.g., "22:00"
  quietHoursEnd?: string; // e.g., "08:00"
}

export interface NotificationData {
  userId: string;
  type: 'perfect_storm' | 'price_alert' | 'score_change' | 'exit_signal' | 'daily_digest';
  priority: 'high' | 'medium' | 'low';
  channel: 'email' | 'push' | 'in_app' | 'all';
  data: any;
}

export interface WatchlistTrigger {
  userId: string;
  stockSymbol: string;
  priceTarget?: number;
  scoreThreshold?: number;
  technicalTrigger?: string;
  fundamentalTrigger?: string;
}

export class NotificationService {
  private static NOTIFICATION_QUEUE = 'notification_queue';
  private static USER_PREFERENCES_PREFIX = 'notification_prefs:';
  private static NOTIFICATION_LOG_PREFIX = 'notification_log:';
  
  /**
   * Send a notification through appropriate channels
   */
  static async sendNotification(notification: NotificationData): Promise<boolean> {
    try {
      // Get user preferences
      const preferences = await this.getUserPreferences(notification.userId);
      
      // Check if user wants this type of notification
      if (!this.shouldSendNotification(notification, preferences)) {
        console.log(`Notification blocked by user preferences: ${notification.type}`);
        return false;
      }
      
      // Check if we're in quiet hours
      if (this.isInQuietHours(preferences)) {
        console.log(`Notification delayed due to quiet hours`);
        await this.queueNotification(notification);
        return true;
      }
      
      // Check if user is active (for email decisions)
      const isActive = await EmailService.isUserActive(notification.userId);
      
      // Route notification based on channel and user activity
      let sent = false;
      
      if (notification.channel === 'all' || notification.channel === 'in_app') {
        await this.sendInAppNotification(notification);
        sent = true;
      }
      
      if (notification.channel === 'all' || notification.channel === 'push') {
        if (preferences.pushEnabled) {
          await this.sendPushNotification(notification);
          sent = true;
        }
      }
      
      if (notification.channel === 'all' || notification.channel === 'email') {
        // Only send email if user is not currently active
        if (!isActive && preferences.emailEnabled) {
          sent = await this.sendEmailNotification(notification) || sent;
        }
      }
      
      // Log the notification
      await this.logNotification(notification, sent);
      
      return sent;
    } catch (error) {
      console.error('Notification error:', error);
      return false;
    }
  }

  /**
   * Check watchlist triggers and send alerts
   */
  static async checkWatchlistTriggers(
    symbol: string,
    currentPrice: number,
    currentScore: number
  ): Promise<void> {
    try {
      const supabase = createClient();
      
      // Get all watchlist items for this symbol
      const { data: watchlistItems, error } = await supabase
        .from('watchlists')
        .select('*')
        .eq('symbol', symbol);
      
      if (error || !watchlistItems) {
        console.error('Error fetching watchlist items:', error);
        return;
      }
      
      // Check each watchlist item for triggered conditions
      for (const item of watchlistItems) {
        const triggers = await this.evaluateTriggers(item, currentPrice, currentScore);
        
        if (triggers.allMet) {
          // Perfect Storm Alert!
          await this.sendPerfectStormAlert(item.user_id, symbol, triggers);
        } else if (triggers.anyMet) {
          // Partial trigger alert
          await this.sendPartialTriggerAlert(item.user_id, symbol, triggers);
        }
      }
    } catch (error) {
      console.error('Watchlist trigger check error:', error);
    }
  }

  /**
   * Evaluate watchlist triggers
   */
  private static async evaluateTriggers(
    watchlistItem: any,
    currentPrice: number,
    currentScore: number
  ): Promise<any> {
    const triggers = watchlistItem.triggers || {};
    const results = {
      priceTarget: false,
      scoreThreshold: false,
      technicalSignal: false,
      fundamentalStrength: false,
      allMet: false,
      anyMet: false,
    };
    
    // Check price target
    if (triggers.priceTarget) {
      results.priceTarget = currentPrice <= triggers.priceTarget;
    }
    
    // Check score threshold
    if (triggers.scoreThreshold) {
      results.scoreThreshold = currentScore >= triggers.scoreThreshold;
    }
    
    // Check technical signals (simplified for now)
    if (triggers.technicalTrigger) {
      // This would normally check RSI, MACD, etc.
      results.technicalSignal = currentScore >= 70; // Placeholder
    }
    
    // Check fundamental strength
    if (triggers.fundamentalTrigger) {
      results.fundamentalStrength = currentScore >= 75; // Placeholder
    }
    
    // Determine if all or any triggers are met
    const triggerValues = [
      results.priceTarget,
      results.scoreThreshold,
      results.technicalSignal,
      results.fundamentalStrength,
    ].filter(t => t !== false);
    
    results.anyMet = triggerValues.some(t => t);
    results.allMet = triggerValues.length > 0 && triggerValues.every(t => t);
    
    return results;
  }

  /**
   * Send Perfect Storm Alert
   */
  private static async sendPerfectStormAlert(
    userId: string,
    symbol: string,
    triggers: any
  ): Promise<void> {
    try {
      const supabase = createClient();
      
      // Get user details
      const { data: userProfile } = await supabase
        .from('user_profiles')
        .select('email, full_name')
        .eq('user_id', userId)
        .single();
      
      if (!userProfile) return;
      
      // Get stock details
      const { data: stockData } = await supabase
        .from('stocks')
        .select('*')
        .eq('symbol', symbol)
        .single();
      
      if (!stockData) return;
      
      // Prepare alert data
      const alertData: PerfectStormAlertData = {
        stockSymbol: symbol,
        stockName: stockData.company_name || symbol,
        currentPrice: stockData.current_price || 0,
        stockBeaconScore: stockData.beacon_score || 0,
        triggers: {
          priceTarget: triggers.priceTarget,
          scoreThreshold: triggers.scoreThreshold,
          technicalSignal: triggers.technicalSignal,
          fundamentalStrength: triggers.fundamentalStrength,
        },
        moatStrength: stockData.moat_strength || 'Moderate',
        recommendation: 'All your buy criteria have been met. This is an excellent entry opportunity.',
        strengths: stockData.strengths || [],
      };
      
      // Send the notification
      await this.sendNotification({
        userId,
        type: 'perfect_storm',
        priority: 'high',
        channel: 'all',
        data: alertData,
      });
      
      // Also send email if user is not active
      const recipient: EmailRecipient = {
        email: userProfile.email,
        name: userProfile.full_name,
        userId,
      };
      
      await EmailService.sendPerfectStormAlert(recipient, alertData);
    } catch (error) {
      console.error('Perfect storm alert error:', error);
    }
  }

  /**
   * Send partial trigger alert
   */
  private static async sendPartialTriggerAlert(
    userId: string,
    symbol: string,
    triggers: any
  ): Promise<void> {
    // Send a lower priority notification for partial triggers
    await this.sendNotification({
      userId,
      type: 'price_alert',
      priority: 'medium',
      channel: 'in_app',
      data: {
        symbol,
        message: `${symbol} is approaching your buy criteria`,
        triggers,
      },
    });
  }

  /**
   * Send email notification
   */
  private static async sendEmailNotification(
    notification: NotificationData
  ): Promise<boolean> {
    try {
      const supabase = createClient();
      
      // Get user email
      const { data: userProfile } = await supabase
        .from('user_profiles')
        .select('email, full_name')
        .eq('user_id', notification.userId)
        .single();
      
      if (!userProfile) return false;
      
      const recipient: EmailRecipient = {
        email: userProfile.email,
        name: userProfile.full_name,
        userId: notification.userId,
      };
      
      // Route to appropriate email template based on type
      switch (notification.type) {
        case 'perfect_storm':
          return await EmailService.sendPerfectStormAlert(recipient, notification.data);
        case 'daily_digest':
          return await EmailService.sendDailyDigest(recipient, notification.data);
        default:
          // Generic email for other types
          return false;
      }
    } catch (error) {
      console.error('Email notification error:', error);
      return false;
    }
  }

  /**
   * Send push notification (placeholder for future implementation)
   */
  private static async sendPushNotification(
    notification: NotificationData
  ): Promise<boolean> {
    try {
      // This would integrate with a push notification service
      // like Firebase Cloud Messaging or OneSignal
      console.log('Push notification would be sent:', notification);
      return true;
    } catch (error) {
      console.error('Push notification error:', error);
      return false;
    }
  }

  /**
   * Send in-app notification
   */
  private static async sendInAppNotification(
    notification: NotificationData
  ): Promise<boolean> {
    try {
      const supabase = createClient();
      
      // Store in-app notification in database
      const { error } = await supabase
        .from('notifications')
        .insert({
          user_id: notification.userId,
          type: notification.type,
          priority: notification.priority,
          data: notification.data,
          read: false,
          created_at: new Date().toISOString(),
        });
      
      if (error) {
        console.error('In-app notification error:', error);
        return false;
      }
      
      // If WebSocket is connected, send real-time update
      // This will be implemented in the WebSocket service
      
      return true;
    } catch (error) {
      console.error('In-app notification error:', error);
      return false;
    }
  }

  /**
   * Get user notification preferences
   */
  private static async getUserPreferences(
    userId: string
  ): Promise<NotificationPreferences> {
    try {
      const cacheKey = `${this.USER_PREFERENCES_PREFIX}${userId}`;
      const cached = await redis.get(cacheKey);
      
      if (cached) {
        return cached as NotificationPreferences;
      }
      
      const supabase = createClient();
      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', userId)
        .single();
      
      if (error || !data) {
        // Return default preferences
        return {
          emailEnabled: true,
          pushEnabled: true,
          perfectStormAlerts: true,
          priceAlerts: true,
          dailyDigest: false,
          weeklyReport: false,
          maxEmailsPerDay: 10,
        };
      }
      
      // Cache preferences for 1 hour
      await redis.setex(cacheKey, 3600, JSON.stringify(data));
      
      return data as NotificationPreferences;
    } catch (error) {
      console.error('Preferences fetch error:', error);
      // Return default preferences on error
      return {
        emailEnabled: true,
        pushEnabled: true,
        perfectStormAlerts: true,
        priceAlerts: true,
        dailyDigest: false,
        weeklyReport: false,
        maxEmailsPerDay: 10,
      };
    }
  }

  /**
   * Check if notification should be sent based on preferences
   */
  private static shouldSendNotification(
    notification: NotificationData,
    preferences: NotificationPreferences
  ): boolean {
    switch (notification.type) {
      case 'perfect_storm':
        return preferences.perfectStormAlerts;
      case 'price_alert':
        return preferences.priceAlerts;
      case 'daily_digest':
        return preferences.dailyDigest;
      default:
        return true;
    }
  }

  /**
   * Check if current time is within quiet hours
   */
  private static isInQuietHours(preferences: NotificationPreferences): boolean {
    if (!preferences.quietHoursStart || !preferences.quietHoursEnd) {
      return false;
    }
    
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTime = currentHour * 60 + currentMinute;
    
    const [startHour, startMinute] = preferences.quietHoursStart.split(':').map(Number);
    const [endHour, endMinute] = preferences.quietHoursEnd.split(':').map(Number);
    
    const startTime = startHour * 60 + startMinute;
    const endTime = endHour * 60 + endMinute;
    
    if (startTime < endTime) {
      // Normal case: quiet hours don't cross midnight
      return currentTime >= startTime && currentTime < endTime;
    } else {
      // Quiet hours cross midnight
      return currentTime >= startTime || currentTime < endTime;
    }
  }

  /**
   * Queue notification for later delivery
   */
  private static async queueNotification(notification: NotificationData): Promise<void> {
    try {
      await redis.lpush(this.NOTIFICATION_QUEUE, JSON.stringify(notification));
    } catch (error) {
      console.error('Queue notification error:', error);
    }
  }

  /**
   * Process queued notifications (called by cron job)
   */
  static async processQueuedNotifications(): Promise<void> {
    try {
      const queueLength = await redis.llen(this.NOTIFICATION_QUEUE);
      
      for (let i = 0; i < queueLength; i++) {
        const notificationJson = await redis.rpop(this.NOTIFICATION_QUEUE);
        if (!notificationJson) break;
        
        const notification = JSON.parse(notificationJson as string);
        const preferences = await this.getUserPreferences(notification.userId);
        
        // Check if we're still in quiet hours
        if (!this.isInQuietHours(preferences)) {
          await this.sendNotification(notification);
        } else {
          // Put it back in the queue
          await redis.lpush(this.NOTIFICATION_QUEUE, notificationJson as string);
        }
      }
    } catch (error) {
      console.error('Process queued notifications error:', error);
    }
  }

  /**
   * Log notification for analytics
   */
  private static async logNotification(
    notification: NotificationData,
    sent: boolean
  ): Promise<void> {
    try {
      const logKey = `${this.NOTIFICATION_LOG_PREFIX}${notification.userId}`;
      const logEntry = {
        type: notification.type,
        priority: notification.priority,
        channel: notification.channel,
        sent,
        timestamp: new Date().toISOString(),
      };
      
      await redis.lpush(logKey, JSON.stringify(logEntry));
      await redis.expire(logKey, 604800); // Keep logs for 7 days
    } catch (error) {
      console.error('Notification logging error:', error);
    }
  }

  /**
   * Get notification statistics for a user
   */
  static async getNotificationStats(userId: string): Promise<{
    total: number;
    sent: number;
    blocked: number;
    byType: Record<string, number>;
  }> {
    try {
      const logKey = `${this.NOTIFICATION_LOG_PREFIX}${userId}`;
      const logs = await redis.lrange(logKey, 0, -1);
      
      const stats = {
        total: 0,
        sent: 0,
        blocked: 0,
        byType: {} as Record<string, number>,
      };
      
      for (const logJson of logs) {
        const log = JSON.parse(logJson as string);
        stats.total++;
        if (log.sent) stats.sent++;
        else stats.blocked++;
        
        if (!stats.byType[log.type]) {
          stats.byType[log.type] = 0;
        }
        stats.byType[log.type]++;
      }
      
      return stats;
    } catch (error) {
      console.error('Notification stats error:', error);
      return {
        total: 0,
        sent: 0,
        blocked: 0,
        byType: {},
      };
    }
  }
}
