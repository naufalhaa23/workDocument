const axios = require('axios');
const prisma = require('../config/database');

async function sendWhatsAppMessage({ userId, phoneNumber, message, referenceType, referenceId, type = 'system' }) {
  if (!phoneNumber) return null;

  // Check if WA is enabled
  if (process.env.WA_ENABLED === 'false') {
    return { success: false, detail: 'WhatsApp notifications are disabled' };
  }

  let token = process.env.FONNTE_TOKEN;
  if (!token) {
    console.warn('[WhatsApp] FONNTE_TOKEN is missing. Skipping message.');
    return { success: false, detail: 'FONNTE_TOKEN missing' };
  }

  let status = 'PENDING';
  let responseData = null;
  let errorDetail = null;

  try {
    const res = await axios.post('https://api.fonnte.com/send', {
      target: phoneNumber,
      message: message,
    }, {
      headers: {
        Authorization: token
      }
    });
    
    // Fonnte returns status boolean
    if (res.data && res.data.status) {
      status = 'SUCCESS';
    } else {
      status = 'FAILED';
      errorDetail = res.data ? JSON.stringify(res.data) : 'Unknown Fonnte Error';
    }
    responseData = res.data;
  } catch (err) {
    status = 'FAILED';
    errorDetail = err.response ? JSON.stringify(err.response.data) : err.message;
    console.error(`[WhatsApp] Failed to send message to ${phoneNumber}:`, errorDetail);
  }

  // Save to Log
  try {
    const log = await prisma.whatsappLog.create({
      data: {
        user_id: userId,
        target_number: phoneNumber,
        message,
        status,
        error_detail: errorDetail,
        reference_type: referenceType,
        reference_id: referenceId
      }
    });
    return { success: status === 'SUCCESS', log, detail: errorDetail };
  } catch (dbErr) {
    console.error('[WhatsApp] Failed to save log:', dbErr.message);
    return { success: status === 'SUCCESS', detail: errorDetail };
  }
}

module.exports = {
  sendWhatsAppMessage
};
