const router = require('express').Router();
const prisma = require('../config/database');
const { auth, roleGuard } = require('../middleware/auth');
const { logActivity } = require('../services/activityLog.service');
const { createNotification } = require('../services/notification.service');

// POST /api/inventory-requests — Teknisi requests item
router.post('/', auth, roleGuard('teknisi'), async (req, res, next) => {
  try {
    const { item_id, quantity, reason } = req.body;
    const request = await prisma.inventoryRequest.create({
      data: { item_id: Number(item_id), requested_by: req.user.id, quantity: Number(quantity), reason },
    });

    const item = await prisma.inventoryItem.findUnique({ where: { id: Number(item_id) } });
    const admins = await prisma.user.findMany({ where: { role: { in: ['admin', 'superadmin'] } } });
    for (const admin of admins) {
      await createNotification({
        userId: admin.id, title: 'Permintaan Barang',
        message: `${req.user.username} mengajukan ${quantity} ${item?.unit} ${item?.name}`,
        type: 'inventory_request', referenceType: 'inventory_request', referenceId: request.id,
      });
    }

    await logActivity({
      userId: req.user.id, action: 'create', entityType: 'inventory_request', entityId: request.id,
      description: `Request ${quantity} ${item?.unit} ${item?.name}`, ipAddress: req.ip,
    });

    res.status(201).json(request);
  } catch (err) { next(err); }
});

// GET /api/inventory-requests — Admin list all
router.get('/', auth, roleGuard('admin', 'superadmin'), async (req, res, next) => {
  try {
    const { status } = req.query;
    const requests = await prisma.inventoryRequest.findMany({
      where: status ? { status } : undefined,
      include: { item: true, requestedBy: { select: { id: true, username: true } } },
      orderBy: { requested_at: 'desc' },
    });
    res.json(requests);
  } catch (err) { next(err); }
});

// GET /api/inventory-requests/my — Teknisi's own requests
router.get('/my', auth, roleGuard('teknisi'), async (req, res, next) => {
  try {
    const requests = await prisma.inventoryRequest.findMany({
      where: { requested_by: req.user.id },
      include: { item: true },
      orderBy: { requested_at: 'desc' },
    });
    res.json(requests);
  } catch (err) { next(err); }
});

// PATCH /api/inventory-requests/:id — Approve/Reject (auto deduct stock)
router.patch('/:id', auth, roleGuard('admin', 'superadmin'), async (req, res, next) => {
  try {
    const { status, admin_notes } = req.body;
    const request = await prisma.inventoryRequest.update({
      where: { id: Number(req.params.id) },
      data: { status, admin_notes, approved_by: req.user.id, responded_at: new Date() },
      include: { item: true },
    });

    // Auto deduct stock on approval
    if (status === 'approved') {
      await prisma.inventoryItem.update({
        where: { id: request.item_id },
        data: { stock_qty: { decrement: request.quantity } },
      });
    }

    const notifType = status === 'approved' ? 'inventory_approved' : 'inventory_rejected';
    const msg = status === 'approved'
      ? `Permintaan ${request.item.name} disetujui`
      : `Permintaan ${request.item.name} ditolak: ${admin_notes || ''}`;

    await createNotification({
      userId: request.requested_by, title: status === 'approved' ? 'Barang Disetujui' : 'Barang Ditolak',
      message: msg, type: notifType, referenceType: 'inventory_request', referenceId: request.id,
    });

    await logActivity({
      userId: req.user.id, action: status === 'approved' ? 'approve' : 'reject',
      entityType: 'inventory_request', entityId: request.id,
      description: `${status === 'approved' ? 'Approve' : 'Reject'} permintaan ${request.item.name}`, ipAddress: req.ip,
    });

    res.json(request);
  } catch (err) { next(err); }
});

module.exports = router;
