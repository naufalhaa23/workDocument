const router = require('express').Router();
const prisma = require('../config/database');
const { auth } = require('../middleware/auth');

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

// PATCH /api/notifications/:id/read
router.patch('/:id/read', auth, async (req, res, next) => {
  try {
    await prisma.notification.update({
      where: { id: Number(req.params.id) },
      data: { is_read: true },
    });
    res.json({ message: 'Marked as read' });
  } catch (err) { next(err); }
});

// PATCH /api/notifications/read-all
router.patch('/read-all', auth, async (req, res, next) => {
  try {
    await prisma.notification.updateMany({
      where: { user_id: req.user.id, is_read: false },
      data: { is_read: true },
    });
    res.json({ message: 'All marked as read' });
  } catch (err) { next(err); }
});

module.exports = router;
