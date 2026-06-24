const router = require('express').Router();
const prisma = require('../config/database');
const { auth, roleGuard } = require('../middleware/auth');

// GET /api/activity-logs
router.get('/', auth, roleGuard('admin', 'superadmin'), async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const [logs, total] = await Promise.all([
      prisma.activityLog.findMany({
        include: { user: { select: { id: true, username: true, role: true } } },
        orderBy: { created_at: 'desc' },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
      }),
      prisma.activityLog.count(),
    ]);
    res.json({ data: logs, total, page: Number(page), totalPages: Math.ceil(total / Number(limit)) });
  } catch (err) { next(err); }
});

module.exports = router;
