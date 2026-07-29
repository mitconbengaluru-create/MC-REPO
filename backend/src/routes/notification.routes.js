import { Router } from 'express';
import { prisma } from '../config/database.js';
import { purgeExpiredNotifications } from '../utils/notification.util.js';
import { requireAuth, requireRole } from '../middleware/auth.middleware.js';

const router = Router();

// All notification routes require authentication
router.use(requireAuth);

// GET /api/notifications — Any authenticated user can read notifications
router.get('/', async (req, res) => {
  try {
    await purgeExpiredNotifications().catch(() => null);

    const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000);
    const notifications = await prisma.notification.findMany({
      where: { timestamp: { gte: thirtyMinsAgo } },
      orderBy: { timestamp: 'desc' }
    });
    res.status(200).json(notifications);
  } catch (err) {
    console.error('Error reading notifications from PostgreSQL:', err);
    res.status(500).json({ success: false, message: 'Failed to read notifications.' });
  }
});

// PUT /api/notifications/:id/read — Any authenticated user can mark as read
router.put('/:id/read', async (req, res) => {
  const { id } = req.params;
  try {
    const updated = await prisma.notification.update({
      where: { id },
      data: { status: 'read' }
    });
    res.status(200).json({ success: true, notification: updated });
  } catch (err) {
    console.error('Error marking notification as read in PostgreSQL:', err);
    res.status(500).json({ success: false, message: 'Failed to update notification status.' });
  }
});

// POST /api/notifications/clear-all — Only admins can wipe all notifications
router.post('/clear-all', requireRole(['admin', 'super-admin']), async (req, res) => {
  try {
    await prisma.notification.deleteMany();
    res.status(200).json({ success: true });
  } catch (err) {
    console.error('Error clearing notifications in PostgreSQL:', err);
    res.status(500).json({ success: false, message: 'Failed to clear notifications.' });
  }
});

export default router;
