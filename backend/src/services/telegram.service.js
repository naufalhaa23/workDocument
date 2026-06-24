const axios = require('axios');
const prisma = require('../config/database');

async function sendTelegramMessage({ userId, chatId, message, referenceType, referenceId, type = 'system' }) {
  if (!chatId) {
    console.warn(`[Telegram] User ${userId} tidak memiliki telegram_chat_id. Pesan dilewati.`);
    try {
      await prisma.telegramLog.create({
        data: {
          user_id: userId,
          telegram_chat_id: '-',
          message,
          status: 'FAILED',
          error_detail: 'Telegram Chat ID belum diatur untuk user ini',
          reference_type: referenceType,
          reference_id: referenceId
        }
      });
    } catch (e) {
      console.error('[Telegram] Gagal menyimpan log:', e.message);
    }
    return null;
  }

  // Retrieve Bot Token from SystemSettings, fallback to ENV
  let token = process.env.TELEGRAM_BOT_TOKEN;
  try {
    const setting = await prisma.systemSetting.findUnique({ where: { key: 'TELEGRAM_BOT_TOKEN' } });
    if (setting && setting.value) token = setting.value;
  } catch (err) {
    console.error('[Telegram] Failed to fetch token setting:', err.message);
  }

  if (!token) {
    console.warn('[Telegram] TELEGRAM_BOT_TOKEN is missing. Skipping message.');
    return null;
  }

  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  
  let status = 'PENDING';
  let responseData = null;
  let errorDetail = null;

  try {
    const res = await axios.post(url, {
      chat_id: chatId,
      text: message,
      parse_mode: 'HTML' // Allow bold/italics
    });
    status = 'SUCCESS';
    responseData = res.data;
  } catch (err) {
    status = 'FAILED';
    errorDetail = err.response ? JSON.stringify(err.response.data) : err.message;
    console.error(`[Telegram] Failed to send message to ${chatId}:`, errorDetail);
  }

  // Save to Log
  try {
    const log = await prisma.telegramLog.create({
      data: {
        user_id: userId,
        telegram_chat_id: chatId,
        message,
        status,
        message_id: responseData?.result?.message_id?.toString() || null,
        error_detail: errorDetail,
        reference_type: referenceType,
        reference_id: referenceId
      }
    });
    return log;
  } catch (dbErr) {
    console.error('[Telegram] Failed to save log:', dbErr.message);
    return null;
  }
}

module.exports = {
  sendTelegramMessage
};
