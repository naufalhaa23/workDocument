const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../config/database');
const { auth } = require('../middleware/auth');
const { logActivity } = require('../services/activityLog.service');
const { sendResetEmail } = require('../services/email.service');

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ message: 'Username dan password wajib diisi' });
    }

    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) return res.status(401).json({ message: 'Username atau password salah' });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ message: 'Username atau password salah' });

    const payload = { id: user.id, username: user.username, email: user.email, role: user.role };

    const accessToken = jwt.sign(payload, process.env.JWT_ACC_SECRET, { expiresIn: '15m' });
    const refreshToken = jwt.sign(payload, process.env.JWT_REF_SECRET, { expiresIn: '7d' });

    // Store refresh token
    await prisma.refreshToken.create({
      data: {
        user_id: user.id,
        token: refreshToken,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    // Set refresh token as httpOnly cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    await logActivity({
      userId: user.id,
      action: 'login',
      description: `${user.username} login ke sistem`,
      ipAddress: req.ip,
    });

    res.json({
      accessToken,
      user: payload,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/refresh
router.post('/refresh', async (req, res, next) => {
  try {
    const token = req.cookies.refreshToken;
    if (!token) return res.status(401).json({ message: 'Refresh token tidak ditemukan' });

    const stored = await prisma.refreshToken.findUnique({ where: { token } });
    if (!stored || stored.expires_at < new Date()) {
      return res.status(401).json({ message: 'Refresh token expired' });
    }

    const decoded = jwt.verify(token, process.env.JWT_REF_SECRET);
    const payload = { id: decoded.id, username: decoded.username, email: decoded.email, role: decoded.role };
    const accessToken = jwt.sign(payload, process.env.JWT_ACC_SECRET, { expiresIn: '15m' });

    res.json({ accessToken, user: payload });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/logout
router.post('/logout', auth, async (req, res, next) => {
  try {
    const token = req.cookies.refreshToken;
    if (token) {
      await prisma.refreshToken.deleteMany({ where: { token } });
    }
    res.clearCookie('refreshToken');

    await logActivity({
      userId: req.user.id,
      action: 'logout',
      description: `${req.user.username} logout dari sistem`,
      ipAddress: req.ip,
    });

    res.json({ message: 'Berhasil logout' });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/me
router.get('/me', auth, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, username: true, email: true, role: true, telegram_chat_id: true, created_at: true },
    });
    res.json(user);
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email wajib diisi' });

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(404).json({ message: 'Email tidak terdaftar' });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await prisma.passwordReset.create({
      data: {
        email,
        token: otp,
        expires_at: expiresAt
      }
    });

    await sendResetEmail(email, otp);

    res.json({ message: 'Kode OTP telah dikirim ke email Anda' });
  } catch (err) { next(err); }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res, next) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) return res.status(400).json({ message: 'Lengkapi semua data' });

    const resetRecord = await prisma.passwordReset.findFirst({
      where: {
        email,
        token: otp,
        expires_at: { gt: new Date() }
      },
      orderBy: { created_at: 'desc' }
    });

    if (!resetRecord) {
      return res.status(400).json({ message: 'Kode OTP salah atau telah kedaluwarsa' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { email },
      data: { password_hash: passwordHash }
    });

    await prisma.passwordReset.deleteMany({
      where: { email }
    });

    res.json({ message: 'Password berhasil diubah. Silakan login kembali.' });
  } catch (err) { next(err); }
});

module.exports = router;
