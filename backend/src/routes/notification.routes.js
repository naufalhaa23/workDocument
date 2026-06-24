const router = require('express').Router();
const prisma = require('../config/database');
const { auth } = require('../middleware/auth');

// Emit the user's fresh unread count so every open session updates its bell instantly
async function emitUnreadCount(userId) {
  try {
    const { getIO } = require('../config/socket');
    const io = getIO();
    if (!io) return;
    const unreadCount = await prisma.notification.count({
      where: { user_id: userId, is_read: false },
    });
    io.to(`user:${userId}`).emit('notification:count', { unreadCount });
  } catch (err) {
    console.error('[Socket] emitUnreadCount error:', err.message);
  }
}

// GET /api/notifications
router.get('/', auth, async (req, res, next) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { user_id: req.user.id },
      orderBy: { created_at: 'desc' },
      take: 50,
    });
    res.json(notifications);
  } catch (err) { next(err); }
});

// GET /api/notifications/unread-count
router.get('/unread-count', auth, async (req, res, next) => {
  try {
    const count = await prisma.notification.count({
      where: { user_id: req.user.id, is_read: false },
    });
    res.json({ unreadCount: count });
  } catch (err) { next(err); }
});

// PATCH /api/notifications/read-all
router.patch('/read-all', auth, async (req, res, next) => {
  try {
    await prisma.notification.updateMany({
      where: { user_id: req.user.id, is_read: false },
      data: { is_read: true },
    });
    await emitUnreadCount(req.user.id);
    res.json({ message: 'All marked as read' });
  } catch (err) { next(err); }
});

// PATCH /api/notifications/:id/read
router.patch('/:id/read', auth, async (req, res, next) => {
  try {
    // Scope to owner to prevent reading someone else's notification
    await prisma.notification.updateMany({
      where: { id: Number(req.params.id), user_id: req.user.id },
      data: { is_read: true },
    });
    await emitUnreadCount(req.user.id);
    res.json({ message: 'Marked as read' });
  } catch (err) { next(err); }
});

// DELETE /api/notifications — clear ALL of the user's notifications
router.delete('/', auth, async (req, res, next) => {
  try {
    await prisma.notification.deleteMany({ where: { user_id: req.user.id } });
    await emitUnreadCount(req.user.id);
    res.json({ message: 'All notifications cleared' });
  } catch (err) { next(err); }
});

// DELETE /api/notifications/:id — delete a single (own) notification
router.delete('/:id', auth, async (req, res, next) => {
  try {
    await prisma.notification.deleteMany({
      where: { id: Number(req.params.id), user_id: req.user.id },
    });
    await emitUnreadCount(req.user.id);
    res.json({ message: 'Notification deleted' });
  } catch (err) { next(err); }
});

module.exports = router;
