const router = require('express').Router();
const prisma = require('../config/database');
const { auth, roleGuard } = require('../middleware/auth');

const fs = require('fs');
const path = require('path');

const ENV_PATH = path.join(__dirname, '../../.env');

// Helper to update .env file
const updateEnvFile = (key, value) => {
  try {
    let envContent = '';
    if (fs.existsSync(ENV_PATH)) {
      envContent = fs.readFileSync(ENV_PATH, 'utf8');
    }
    
    const regex = new RegExp(`^${key}=.*`, 'm');
    if (regex.test(envContent)) {
      envContent = envContent.replace(regex, `${key}=${value}`);
    } else {
      envContent += `\n${key}=${value}`;
    }
    
    fs.writeFileSync(ENV_PATH, envContent.trim() + '\n');
    process.env[key] = value;
  } catch (err) {
    console.error('Error updating .env file', err);
  }
};

const { sendTelegramMessage } = require('../services/telegram.service');
const { initDeadlineCron } = require('../cron/deadline.cron');
const { createNotification } = require('../services/notification.service');

// GET /api/telegram/settings
router.get('/settings', auth, roleGuard('admin', 'superadmin'), (req, res) => {
  res.json({
    enabled: process.env.TELEGRAM_ENABLED !== 'false',
    token: process.env.TELEGRAM_BOT_TOKEN ? '********' + process.env.TELEGRAM_BOT_TOKEN.slice(-4) : '',
  });
});

// PUT /api/telegram/settings
router.put('/settings', auth, roleGuard('admin', 'superadmin'), (req, res) => {
  const { enabled, token } = req.body;
  
  if (enabled !== undefined) {
    updateEnvFile('TELEGRAM_ENABLED', enabled ? 'true' : 'false');
  }
  
  if (token && !token.startsWith('********')) {
    updateEnvFile('TELEGRAM_BOT_TOKEN', token);
  }

  res.json({ message: 'Pengaturan Telegram berhasil disimpan' });
});

// GET /api/telegram/logs
router.get('/logs', auth, roleGuard('admin', 'superadmin'), async (req, res, next) => {
  try {
    const logs = await prisma.telegramLog.findMany({
      orderBy: { created_at: 'desc' },
      take: 100,
      include: {
        user: { select: { username: true } }
      }
    });
    res.json(logs);
  } catch (err) { next(err); }
});

// POST /api/telegram/test
router.post('/test', auth, roleGuard('superadmin'), async (req, res, next) => {
  try {
    const { target_chat_id, message } = req.body;
    if (!target_chat_id || !message) {
      return res.status(400).json({ message: 'Target Chat ID dan pesan wajib diisi' });
    }

    const log = await sendTelegramMessage({
      userId: req.user.id,
      chatId: target_chat_id,
      message: `[TEST] ${message}`,
      type: 'system'
    });

    if (log && log.status === 'SUCCESS') {
      res.json({ message: 'Pesan test Telegram berhasil dikirim', log });
    } else {
      res.status(500).json({ message: 'Gagal mengirim pesan test Telegram', log });
    }
  } catch (err) { next(err); }
});

// POST /api/telegram/trigger-cron
router.post('/trigger-cron', auth, roleGuard('superadmin'), async (req, res, next) => {
  try {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const managementUsers = await prisma.user.findMany({
      where: { role: { in: ['admin', 'superadmin'] } },
      select: { id: true, username: true, telegram_chat_id: true }
    });

    if (managementUsers.length === 0) {
      return res.json({ message: 'Tidak ada admin/superadmin untuk dikirimi notifikasi', details: [] });
    }

    const dueDocs = await prisma.document.findMany({
      where: {
        status: 'draft_sn',
        deadline_sn: { gt: now }
      }
    });

    let notifCount = 0;
    let details = [];

    for (const doc of dueDocs) {
      if (!doc.deadline_sn) continue;

      const docDeadline = new Date(doc.deadline_sn);
      docDeadline.setHours(0, 0, 0, 0);
      
      const diffTime = docDeadline.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      // Trigger if 10, 3, or 1
      if ([10, 3, 1].includes(diffDays)) {
        for (const admin of managementUsers) {
          await createNotification({
            userId: admin.id,
            title: `Peringatan Deadline H-${diffDays}`,
            message: `Perhatian! Deadline untuk dokumen ${doc.document_number} (${doc.title}) akan berakhir dalam ${diffDays} hari. Mohon segera pantau penyelesaiannya.`,
            type: 'deadline_warning',
            referenceType: 'document',
            referenceId: doc.id,
            sendTele: true 
          });
          notifCount++;
          details.push({ doc: doc.document_number, diffDays, userId: admin.id });
        }
      }
    }

    res.json({ message: `Berhasil menjalankan cron. Terkirim ${notifCount} notifikasi.`, details });
  } catch (err) { next(err); }
});

module.exports = router;
