/**
 * Email Service using Resend
 * Handles all email notifications with smart delivery logic
 */

import { Resend } from 'resend';
import { Redis } from '@upstash/redis';
import PerfectStormAlertEmail from '@/lib/emails/templates/perfect-storm-alert';
import { createElement } from 'react';
import { renderAsync } from '@react-email/components';

const resend = new Resend(process.env.RESEND_API_KEY);
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export interface EmailRecipient {
  email: string;
  name?: string;
  userId: string;
}

export interface PerfectStormAlertData {
  stockSymbol: string;
  stockName: string;
  currentPrice: number;
  stockBeaconScore: number;
  triggers: {
    priceTarget: boolean;
    scoreThreshold: boolean;
    technicalSignal: boolean;
    fundamentalStrength: boolean;
  };
  moatStrength: 'Strong' | 'Moderate' | 'Weak';
  recommendation: string;
  strengths: string[];
}

export interface DailyDigestData {
  topMovers: Array<{
    symbol: string;
    name: string;
    change: number;
    score: number;
  }>;
  watchlistAlerts: Array<{
    symbol: string;
    message: string;
  }>;
  portfolioSummary: {
    totalValue: number;
    dailyChange: number;
    topPerformer: string;
  };
}

export class EmailService {
  private static RATE_LIMIT_PREFIX = 'email_rate:';
  private static LAST_SENT_PREFIX = 'email_last:';
  private static DAILY_COUNT_PREFIX = 'email_count:';
  
  // Email rate limits
  private static MAX_EMAILS_PER_DAY = 10;
  private static MIN_INTERVAL_MINUTES = 30;
  
  /**
   * Send Perfect Storm Alert Email
   */
  static async sendPerfectStormAlert(
    recipient: EmailRecipient,
    data: PerfectStormAlertData
  ): Promise<boolean> {
    try {
      // Check rate limits
      if (!(await this.checkRateLimit(recipient.userId, 'perfect_storm'))) {
        console.log(`Rate limit exceeded for user ${recipient.userId}`);
        return false;
      }

      // Render the email template
      const emailHtml = await renderAsync(
        createElement(PerfectStormAlertEmail, {
          userName: recipient.name || 'Investor',
          ...data,
        })
      );

      // Send the email
      const result = await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || 'StockBeacon <notifications@stockbeacon.app>',
        to: recipient.email,
        subject: `🚨 Perfect Storm Alert: ${data.stockSymbol} meets all your buy criteria!`,
        html: emailHtml,
        tags: [
          { name: 'type', value: 'perfect_storm' },
          { name: 'symbol', value: data.stockSymbol },
        ],
      });

      if (result.data) {
        // Update rate limit counters
        await this.updateRateLimitCounters(recipient.userId, 'perfect_storm');
        
        // Log the email send
        await this.logEmailSent(recipient.userId, 'perfect_storm', data.stockSymbol);
        
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error sending perfect storm alert:', error);
      return false;
    }
  }

  /**
   * Send Daily Digest Email
   */
  static async sendDailyDigest(
    recipient: EmailRecipient,
    data: DailyDigestData
  ): Promise<boolean> {
    try {
      // Check rate limits
      if (!(await this.checkRateLimit(recipient.userId, 'daily_digest'))) {
        return false;
      }

      // Create HTML content for daily digest
      const htmlContent = this.generateDailyDigestHTML(recipient.name || 'Investor', data);

      // Send the email
      const result = await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || 'StockBeacon <notifications@stockbeacon.app>',
        to: recipient.email,
        subject: `📊 Your Daily StockBeacon Digest`,
        html: htmlContent,
        tags: [
          { name: 'type', value: 'daily_digest' },
        ],
      });

      if (result.data) {
        await this.updateRateLimitCounters(recipient.userId, 'daily_digest');
        await this.logEmailSent(recipient.userId, 'daily_digest', 'digest');
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error sending daily digest:', error);
      return false;
    }
  }

  /**
   * Send Welcome Email
   */
  static async sendWelcomeEmail(recipient: EmailRecipient): Promise<boolean> {
    try {
      const htmlContent = this.generateWelcomeHTML(recipient.name || 'Investor');

      const result = await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || 'StockBeacon <welcome@stockbeacon.app>',
        to: recipient.email,
        subject: `🎯 Welcome to StockBeacon - Let's Get Started!`,
        html: htmlContent,
        tags: [
          { name: 'type', value: 'welcome' },
        ],
      });

      return !!result.data;
    } catch (error) {
      console.error('Error sending welcome email:', error);
      return false;
    }
  }

  /**
   * Check if user can receive an email (rate limiting)
   */
  private static async checkRateLimit(
    userId: string,
    emailType: string
  ): Promise<boolean> {
    try {
      // Check daily limit
      const dailyCountKey = `${this.DAILY_COUNT_PREFIX}${userId}:${new Date().toISOString().split('T')[0]}`;
      const dailyCount = await redis.get(dailyCountKey) as number || 0;
      
      if (dailyCount >= this.MAX_EMAILS_PER_DAY) {
        return false;
      }

      // Check minimum interval
      const lastSentKey = `${this.LAST_SENT_PREFIX}${userId}:${emailType}`;
      const lastSent = await redis.get(lastSentKey) as string;
      
      if (lastSent) {
        const minutesSinceLastEmail = (Date.now() - new Date(lastSent).getTime()) / (1000 * 60);
        if (minutesSinceLastEmail < this.MIN_INTERVAL_MINUTES) {
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error('Rate limit check error:', error);
      // If Redis is down, allow the email to be sent
      return true;
    }
  }

  /**
   * Update rate limit counters after sending an email
   */
  private static async updateRateLimitCounters(
    userId: string,
    emailType: string
  ): Promise<void> {
    try {
      // Update daily count
      const dailyCountKey = `${this.DAILY_COUNT_PREFIX}${userId}:${new Date().toISOString().split('T')[0]}`;
      const currentCount = await redis.get(dailyCountKey) as number || 0;
      await redis.setex(dailyCountKey, 86400, currentCount + 1); // Expire after 24 hours

      // Update last sent timestamp
      const lastSentKey = `${this.LAST_SENT_PREFIX}${userId}:${emailType}`;
      await redis.setex(lastSentKey, 86400, new Date().toISOString());
    } catch (error) {
      console.error('Rate limit update error:', error);
    }
  }

  /**
   * Log email sent for analytics
   */
  private static async logEmailSent(
    userId: string,
    emailType: string,
    context: string
  ): Promise<void> {
    try {
      const logKey = `email_log:${new Date().toISOString().split('T')[0]}`;
      const logEntry = {
        userId,
        emailType,
        context,
        timestamp: new Date().toISOString(),
      };
      
      await redis.lpush(logKey, JSON.stringify(logEntry));
      await redis.expire(logKey, 604800); // Keep logs for 7 days
    } catch (error) {
      console.error('Email logging error:', error);
    }
  }

  /**
   * Generate Daily Digest HTML
   */
  private static generateDailyDigestHTML(userName: string, data: DailyDigestData): string {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://stockbeacon.app';
    
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Your Daily StockBeacon Digest</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f6f9fc; margin: 0; padding: 20px;">
          <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden;">
            <!-- Header -->
            <div style="background: #1a1f2e; padding: 24px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 24px;">📊 Daily Digest</h1>
            </div>
            
            <!-- Content -->
            <div style="padding: 32px;">
              <p style="color: #484848; font-size: 16px;">Hi ${userName},</p>
              <p style="color: #484848; font-size: 16px;">Here's what's happening with your stocks today:</p>
              
              <!-- Portfolio Summary -->
              <div style="background: #f9fafb; border-radius: 8px; padding: 20px; margin: 24px 0;">
                <h3 style="margin: 0 0 16px 0; color: #1a1f2e;">Portfolio Summary</h3>
                <p style="margin: 8px 0;">Total Value: <strong>$${data.portfolioSummary.totalValue.toLocaleString()}</strong></p>
                <p style="margin: 8px 0;">Daily Change: <strong style="color: ${data.portfolioSummary.dailyChange >= 0 ? '#10b981' : '#ef4444'}">
                  ${data.portfolioSummary.dailyChange >= 0 ? '+' : ''}${data.portfolioSummary.dailyChange.toFixed(2)}%
                </strong></p>
                <p style="margin: 8px 0;">Top Performer: <strong>${data.portfolioSummary.topPerformer}</strong></p>
              </div>
              
              <!-- Top Movers -->
              ${data.topMovers.length > 0 ? `
                <h3 style="color: #1a1f2e; margin: 24px 0 16px 0;">🚀 Top Movers</h3>
                ${data.topMovers.map(stock => `
                  <div style="border-left: 3px solid #10b981; padding-left: 16px; margin-bottom: 16px;">
                    <strong>${stock.symbol}</strong> - ${stock.name}<br>
                    <span style="color: ${stock.change >= 0 ? '#10b981' : '#ef4444'}">
                      ${stock.change >= 0 ? '+' : ''}${stock.change.toFixed(2)}%
                    </span>
                    | Score: ${stock.score}/100
                  </div>
                `).join('')}
              ` : ''}
              
              <!-- Watchlist Alerts -->
              ${data.watchlistAlerts.length > 0 ? `
                <h3 style="color: #1a1f2e; margin: 24px 0 16px 0;">👁️ Watchlist Alerts</h3>
                ${data.watchlistAlerts.map(alert => `
                  <div style="background: #fef3c7; border-radius: 6px; padding: 12px; margin-bottom: 12px;">
                    <strong>${alert.symbol}</strong>: ${alert.message}
                  </div>
                `).join('')}
              ` : ''}
              
              <!-- CTA -->
              <div style="text-align: center; margin: 32px 0;">
                <a href="${baseUrl}/dashboard" style="display: inline-block; background: #1a1f2e; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600;">
                  View Full Dashboard →
                </a>
              </div>
            </div>
            
            <!-- Footer -->
            <div style="background: #f9fafb; padding: 24px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                © 2024 StockBeacon | 
                <a href="${baseUrl}/settings/notifications" style="color: #6b7280;">Manage Preferences</a> | 
                <a href="${baseUrl}/unsubscribe" style="color: #6b7280;">Unsubscribe</a>
              </p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Generate Welcome Email HTML
   */
  private static generateWelcomeHTML(userName: string): string {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://stockbeacon.app';
    
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Welcome to StockBeacon</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f6f9fc; margin: 0; padding: 20px;">
          <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden;">
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #1a1f2e 0%, #2d3748 100%); padding: 48px 24px; text-align: center;">
              <h1 style="color: white; margin: 0 0 8px 0; font-size: 32px;">🎯 Welcome to StockBeacon!</h1>
              <p style="color: #e2e8f0; margin: 0; font-size: 18px;">Your journey to confident investing starts here</p>
            </div>
            
            <!-- Content -->
            <div style="padding: 32px;">
              <p style="color: #484848; font-size: 16px; line-height: 24px;">Hi ${userName},</p>
              <p style="color: #484848; font-size: 16px; line-height: 24px;">
                Welcome aboard! We're excited to help you make smarter, more confident investment decisions.
              </p>
              
              <h2 style="color: #1a1f2e; margin: 32px 0 16px 0;">🚀 Get Started in 3 Steps:</h2>
              
              <div style="margin: 24px 0;">
                <div style="display: flex; align-items: start; margin-bottom: 20px;">
                  <div style="background: #10b981; color: white; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; margin-right: 16px; flex-shrink: 0;">1</div>
                  <div>
                    <h3 style="margin: 0 0 8px 0; color: #1a1f2e;">Set Your Risk Profile</h3>
                    <p style="margin: 0; color: #6b7280;">Tell us your investment style - Conservative, Balanced, or Growth</p>
                  </div>
                </div>
                
                <div style="display: flex; align-items: start; margin-bottom: 20px;">
                  <div style="background: #10b981; color: white; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; margin-right: 16px; flex-shrink: 0;">2</div>
                  <div>
                    <h3 style="margin: 0 0 8px 0; color: #1a1f2e;">Build Your Watchlist</h3>
                    <p style="margin: 0; color: #6b7280;">Add stocks you're interested in and set your buy triggers</p>
                  </div>
                </div>
                
                <div style="display: flex; align-items: start;">
                  <div style="background: #10b981; color: white; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; margin-right: 16px; flex-shrink: 0;">3</div>
                  <div>
                    <h3 style="margin: 0 0 8px 0; color: #1a1f2e;">Get Smart Alerts</h3>
                    <p style="margin: 0; color: #6b7280;">We'll notify you when stocks meet your perfect buy criteria</p>
                  </div>
                </div>
              </div>
              
              <!-- Features -->
              <div style="background: #f9fafb; border-radius: 8px; padding: 24px; margin: 32px 0;">
                <h3 style="margin: 0 0 16px 0; color: #1a1f2e;">✨ What You Get:</h3>
                <ul style="margin: 0; padding-left: 20px; color: #484848;">
                  <li style="margin-bottom: 8px;">StockBeacon Scores (0-100) for instant stock assessment</li>
                  <li style="margin-bottom: 8px;">AI-powered moat analysis in plain English</li>
                  <li style="margin-bottom: 8px;">Perfect Storm alerts when all buy signals align</li>
                  <li style="margin-bottom: 8px;">Exit radar to protect your gains</li>
                  <li>Monthly report cards to track your progress</li>
                </ul>
              </div>
              
              <!-- CTA -->
              <div style="text-align: center; margin: 32px 0;">
                <a href="${baseUrl}/dashboard" style="display: inline-block; background: #1a1f2e; color: white; padding: 16px 48px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 18px;">
                  Start Exploring →
                </a>
              </div>
              
              <p style="color: #6b7280; font-size: 14px; text-align: center; margin-top: 32px;">
                Need help? Reply to this email or check out our 
                <a href="${baseUrl}/help" style="color: #10b981;">help center</a>.
              </p>
            </div>
            
            <!-- Footer -->
            <div style="background: #f9fafb; padding: 24px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                © 2024 StockBeacon - Making investing simple and confident
              </p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Check if user is active (for smart email delivery)
   */
  static async isUserActive(userId: string): Promise<boolean> {
    try {
      const activityKey = `user_activity:${userId}`;
      const lastActivity = await redis.get(activityKey) as string;
      
      if (!lastActivity) {
        return false;
      }
      
      const minutesSinceActivity = (Date.now() - new Date(lastActivity).getTime()) / (1000 * 60);
      return minutesSinceActivity < 30; // Consider active if within last 30 minutes
    } catch (error) {
      console.error('Activity check error:', error);
      return false;
    }
  }

  /**
   * Update user activity timestamp
   */
  static async updateUserActivity(userId: string): Promise<void> {
    try {
      const activityKey = `user_activity:${userId}`;
      await redis.setex(activityKey, 86400, new Date().toISOString()); // Expire after 24 hours
    } catch (error) {
      console.error('Activity update error:', error);
    }
  }
}
