const router = require('express').Router();
const bcrypt = require('bcryptjs');
const prisma = require('../config/database');
const { auth, roleGuard } = require('../middleware/auth');
const { logActivity } = require('../services/activityLog.service');

// GET /api/users
router.get('/', auth, roleGuard('admin', 'superadmin'), async (req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, username: true, email: true, role: true, telegram_chat_id: true, created_at: true },
      orderBy: { created_at: 'desc' },
    });
    res.json(users);
  } catch (err) { next(err); }
});

// POST /api/users
router.post('/', auth, roleGuard('admin', 'superadmin'), async (req, res, next) => {
  try {
    const { username, email, password, role, telegram_chat_id } = req.body;
    const password_hash = await bcrypt.hash(password, 10);
    const resolvedEmail = email || `${username}@no-email.local`;
    const user = await prisma.user.create({
      data: { username, email: resolvedEmail, password_hash, role, telegram_chat_id },
      select: { id: true, username: true, email: true, role: true, telegram_chat_id: true, created_at: true },
    });

    await logActivity({
      userId: req.user.id, action: 'create', entityType: 'user', entityId: user.id,
      description: `Membuat user ${username} (${role})`, ipAddress: req.ip,
    });

    res.status(201).json(user);
  } catch (err) { next(err); }
});

// PUT /api/users/:id
router.put('/:id', auth, roleGuard('admin', 'superadmin'), async (req, res, next) => {
  try {
    const { username, email, role, telegram_chat_id } = req.body;
    const resolvedEmail = email || `${username}@no-email.local`;
    const user = await prisma.user.update({
      where: { id: Number(req.params.id) },
      data: { username, email: resolvedEmail, role, telegram_chat_id },
      select: { id: true, username: true, email: true, role: true, telegram_chat_id: true },
    });

    await logActivity({
      userId: req.user.id, action: 'update', entityType: 'user', entityId: user.id,
      description: `Update user ${username}`, ipAddress: req.ip,
    });

    res.json(user);
  } catch (err) { next(err); }
});

// PUT /api/users/:id/telegram
router.put('/:id/telegram', auth, async (req, res, next) => {
  try {
    // Only the user themselves can update their own telegram chat ID, unless they are admin/superadmin
    if (req.user.id !== Number(req.params.id) && !['admin', 'superadmin'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Akses ditolak' });
    }

    const { telegram_chat_id } = req.body;
    const user = await prisma.user.update({
      where: { id: Number(req.params.id) },
      data: { telegram_chat_id },
      select: { id: true, username: true, telegram_chat_id: true },
    });

    await logActivity({
      userId: req.user.id, action: 'update', entityType: 'user', entityId: user.id,
      description: `Update Telegram Chat ID`, ipAddress: req.ip,
    });

    res.json(user);
  } catch (err) { next(err); }
});

// PUT /api/users/:id/password
router.put('/:id/password', auth, async (req, res, next) => {
  try {
    if (req.user.id !== Number(req.params.id) && !['admin', 'superadmin'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Akses ditolak' });
    }

    const { currentPassword, newPassword } = req.body;
    
    // Get current user to verify old password
    const user = await prisma.user.findUnique({ where: { id: Number(req.params.id) } });
    if (!user) return res.status(404).json({ message: 'User tidak ditemukan' });

    // Verify current password
    const valid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!valid) return res.status(401).json({ message: 'Password saat ini salah' });

    // Hash new password
    const password_hash = await bcrypt.hash(newPassword, 10);
    
    await prisma.user.update({
      where: { id: Number(req.params.id) },
      data: { password_hash }
    });

    await logActivity({
      userId: req.user.id, action: 'update', entityType: 'user', entityId: user.id,
      description: `Update password`, ipAddress: req.ip,
    });

    res.json({ message: 'Password berhasil diubah' });
  } catch (err) { next(err); }
});

// DELETE /api/users/:id
router.delete('/:id', auth, roleGuard('superadmin'), async (req, res, next) => {
  try {
    const user = await prisma.user.delete({ where: { id: Number(req.params.id) } });
    await logActivity({
      userId: req.user.id, action: 'delete', entityType: 'user', entityId: Number(req.params.id),
      description: `Hapus user ${user.username}`, ipAddress: req.ip,
    });
    res.json({ message: 'User berhasil dihapus' });
  } catch (err) { next(err); }
});

module.exports = router;
