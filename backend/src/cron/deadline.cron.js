const cron = require('node-cron');
const prisma = require('../config/database');
const { createNotification } = require('../services/notification.service');
const { getIO } = require('../config/socket');

function initDeadlineCron() {
  // Run automatically every day at 08:00 (WIB / Asia/Jakarta)
  cron.schedule('0 8 * * *', async () => {
    console.log('⏰ [CRON] Running daily deadline checker for Draft SN...');
  
    try {
      const now = new Date();
      now.setHours(0, 0, 0, 0);

      // Fetch management users (admin, superadmin) who will receive the notifications
      const managementUsers = await prisma.user.findMany({
        where: { role: { in: ['admin', 'superadmin'] } },
        select: { id: true, username: true, telegram_chat_id: true }
      });

      if (managementUsers.length === 0) {
        console.log('✅ [CRON] No admins/superadmins found. Skipping.');
        return;
      }

      // We want to find documents where deadline is strictly in the future.
      const dueDocs = await prisma.document.findMany({
        where: {
          status: 'draft_sn',
          deadline_sn: {
            gt: now,
          }
        }
      });

      if (dueDocs.length === 0) {
        console.log('✅ [CRON] No active deadlines found for Draft SN.');
        return;
      }

      let notifCount = 0;

      for (const doc of dueDocs) {
        if (!doc.deadline_sn) continue;

        const docDeadline = new Date(doc.deadline_sn);
        docDeadline.setHours(0, 0, 0, 0);
        
        // Calculate diff in days
        const diffTime = docDeadline.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        // Check if it matches thresholds: 10, 3, 1
        if ([10, 3, 1].includes(diffDays)) {
          for (const admin of managementUsers) {
            // Create DB Notification + Socket + Telegram for Admins
            await createNotification({
              userId: admin.id,
              title: `Peringatan Deadline H-${diffDays}`,
              message: `Perhatian! Deadline untuk dokumen ${doc.document_number} (${doc.title}) akan berakhir dalam ${diffDays} hari. Mohon segera pantau penyelesaiannya.`,
              type: 'deadline_warning',
              referenceType: 'document',
              referenceId: doc.id,
              sendTele: true // Trigger Telegram notification
            });
            
            notifCount++;
          }
        }
      }

      console.log(`⚠️ [CRON] Successfully triggered ${notifCount} deadline reminders.`);
    } catch (error) {
      console.error('❌ [CRON] Error running deadline checker:', error);
    }
  }, {
    scheduled: true,
    timezone: "Asia/Jakarta"
  });
}

module.exports = { initDeadlineCron };
