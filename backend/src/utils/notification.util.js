import { prisma } from '../config/database.js';
import { getIO } from '../config/socket.js';
import crypto from 'crypto';

/**
 * Automatically purges notifications older than 30 minutes from the database.
 */
export async function purgeExpiredNotifications() {
  try {
    const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000);
    const result = await prisma.notification.deleteMany({
      where: {
        timestamp: {
          lt: thirtyMinsAgo
        }
      }
    });
    if (result && result.count > 0) {
      console.log(`[Notification TTL Purge] Permanently deleted ${result.count} notification(s) older than 30 mins from DB.`);
    }
  } catch (err) {
    console.error("[Notification TTL Purge Error]:", err.message);
  }
}

/**
 * Broadcasts a real-time notification to all connected clients and stores it temporarily in database.
 * Automatically purges notifications older than 30 minutes.
 * 
 * @param {string} title - Notification Header Title
 * @param {string} message - Notification Body Details
 */
export async function broadcastSystemNotification(title, message) {
  try {
    // Purge any expired notifications older than 30 minutes first
    await purgeExpiredNotifications().catch(() => null);

    const notif = await prisma.notification.create({
      data: {
        id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        title: title,
        message: message,
        timestamp: new Date(),
        status: "unread"
      }
    });

    const io = getIO();
    if (io) {
      io.emit("notification:new", notif);
    }
    return notif;
  } catch (err) {
    console.error("[Notification Broadcast Failed]:", err.message);
  }
}

export const notificationUtil = {
  resolvePriority(category, eventType) {
    if (category === 'SECURITY' || eventType?.includes('ALERT')) return 'HIGH';
    if (category === 'CHECKOUT' || category === 'RETURN') return 'MEDIUM';
    return 'LOW';
  },

  generateNotificationReference() {
    return `NTF-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
  },

  buildNotificationMessage(eventType, context = {}) {
    const title = context.title || eventType || 'System Notification';
    const message = context.message || 'System notification logged in audit vault.';
    const description = context.description || message;
    return { title, message, description };
  },

  formatNotificationDate(date) {
    return new Date(date).toISOString();
  },

  purgeExpiredNotifications,
  broadcastSystemNotification
};

export default notificationUtil;
