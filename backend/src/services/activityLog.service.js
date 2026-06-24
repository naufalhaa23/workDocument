const prisma = require('../config/database');

/**
 * Log an activity to the audit trail
 */
async function logActivity({ userId, action, entityType, entityId, description, oldValues, newValues, ipAddress }) {
  try {
    await prisma.activityLog.create({
      data: {
        user_id: userId,
        action,
        entity_type: entityType || null,
        entity_id: entityId || null,
        description,
        old_values: oldValues || undefined,
        new_values: newValues || undefined,
        ip_address: ipAddress || null,
      },
    });

    // Also emit to admin/superadmin via Socket.io
    try {
      const { getIO } = require('../config/socket');
      const io = getIO();
      const user = await prisma.user.findUnique({ where: { id: userId }, select: { username: true } });
      io.to('role:admin').to('role:superadmin').emit('activity:new', {
        user: user?.username,
        action,
        entity_type: entityType,
        entity_id: entityId,
        description,
        created_at: new Date().toISOString(),
      });
    } catch (socketErr) {
      // Socket may not be initialized during seeding, that's fine
    }
  } catch (err) {
    console.error('Failed to log activity:', err.message);
  }
}

module.exports = { logActivity };
