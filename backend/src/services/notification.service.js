const prisma = require('../config/database');
const { sendTelegramMessage } = require('./telegram.service');

/**
 * Create a notification and emit it via Socket.io, and optionally Telegram
 */
async function createNotification({ userId, title, message, type, referenceType, referenceId, sendTele = false }) {
  const notification = await prisma.notification.create({
    data: {
      user_id: userId,
      title,
      message,
      type,
      reference_type: referenceType || null,
      reference_id: referenceId || null,
    },
  });

  // Emit via Socket.io
  try {
    const { getIO } = require('../config/socket');
    const io = getIO();
    io.to(`user:${userId}`).emit('notification:new', {
      id: notification.id,
      title,
      message,
      type,
      created_at: notification.created_at,
    });

    // Also update unread count
    const unreadCount = await prisma.notification.count({
      where: { user_id: userId, is_read: false },
    });
    io.to(`user:${userId}`).emit('notification:count', { unreadCount });
  } catch (socketErr) {
    // Socket may not be initialized
  }

  // Trigger Telegram if requested
  if (sendTele) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { telegram_chat_id: true, role: true }
      });
      
      if (user && user.role !== 'teknisi') {
        // Hanya kirim Telegram jika bukan teknisi
        sendTelegramMessage({
          userId,
          chatId: user.telegram_chat_id,
          message: `<b>Sistem Notifikasi Dokumen</b>\n\n<b>${title}</b>\n${message}`,
          referenceType,
          referenceId
        }).catch(err => console.error('[Telegram Background Error]', err));
      }
    } catch (teleErr) {
      console.error('[Telegram Error] Failed to fetch user chat id:', teleErr);
    }
  }

  return notification;
}

module.exports = { createNotification };
