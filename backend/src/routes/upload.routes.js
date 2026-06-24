const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const prisma = require('../config/database');
const { auth, roleGuard } = require('../middleware/auth');
const { logActivity } = require('../services/activityLog.service');
const { createNotification } = require('../services/notification.service');

// Multer config
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

// ─── Socket helpers ──────────────────────────────────────────────────────────
function emitToAdmins(event, payload) {
  try {
    const { getIO } = require('../config/socket');
    const io = getIO();
    if (!io) return;
    io.to('role:admin').emit(event, payload);
    io.to('role:superadmin').emit(event, payload);
  } catch (err) {
    console.error('[Socket] emitToAdmins error:', err.message);
  }
}

function emitToUsers(userIds, event, payload) {
  try {
    const { getIO } = require('../config/socket');
    const io = getIO();
    if (!io) return;
    for (const uid of userIds) {
      io.to(`user:${uid}`).emit(event, payload);
    }
  } catch (err) {
    console.error('[Socket] emitToUsers error:', err.message);
  }
}

function emitToPublicBoard(event, payload) {
  try {
    const { getIO } = require('../config/socket');
    const io = getIO();
    if (io) io.to('public_board').emit(event, payload);
  } catch (err) {
    console.error('[Socket] emitToPublicBoard error:', err.message);
  }
}

// POST /api/uploads/request-permission — Teknisi requests upload permission
router.post('/request-permission', auth, roleGuard('teknisi'), async (req, res, next) => {
  try {
    const { document_id } = req.body;
    const perm = await prisma.uploadPermission.create({
      data: { document_id: Number(document_id), requested_by: req.user.id },
    });

    await prisma.document.update({ where: { id: Number(document_id) }, data: { status: 'menunggu_izin' } });

    const doc = await prisma.document.findUnique({ where: { id: Number(document_id) } });

    // Notify all admins
    const admins = await prisma.user.findMany({ where: { role: { in: ['admin', 'superadmin'] } } });
    for (const admin of admins) {
      await createNotification({
        userId: admin.id, title: 'Permintaan Upload',
        message: `${req.user.username} meminta izin upload untuk ${doc?.document_number}`,
        type: 'upload_request', referenceType: 'upload_permission', referenceId: perm.id,
      });
    }

    await logActivity({
      userId: req.user.id, action: 'create', entityType: 'upload_permission', entityId: perm.id,
      description: `Minta izin upload untuk ${doc?.document_number}`, ipAddress: req.ip,
    });

    // Real-time: refresh admin list + public board (status changed to menunggu_izin)
    emitToAdmins('document:updated', { documentId: Number(document_id) });
    emitToPublicBoard('board:updated', { documentId: Number(document_id) });

    res.status(201).json(perm);
  } catch (err) { next(err); }
});

// PATCH /api/uploads/permissions/:id — Admin approves/rejects
router.patch('/permissions/:id', auth, roleGuard('admin', 'superadmin'), async (req, res, next) => {
  try {
    const { status, admin_notes } = req.body;
    const perm = await prisma.uploadPermission.update({
      where: { id: Number(req.params.id) },
      data: { status, admin_notes, approved_by: req.user.id, responded_at: new Date() },
      include: { document: true },
    });

    if (status === 'approved') {
      await prisma.document.update({ where: { id: perm.document_id }, data: { status: 'upload_diizinkan' } });
    } else {
      await prisma.document.update({ where: { id: perm.document_id }, data: { status: 'proses' } });
    }

    const notifType = status === 'approved' ? 'upload_approved' : 'upload_rejected';
    const notifMsg = status === 'approved'
      ? `Upload diizinkan untuk ${perm.document.document_number}`
      : `Permintaan upload ${perm.document.document_number} ditolak: ${admin_notes || ''}`;

    await createNotification({
      userId: perm.requested_by, title: status === 'approved' ? 'Upload Diizinkan' : 'Upload Ditolak',
      message: notifMsg, type: notifType, referenceType: 'document', referenceId: perm.document_id,
    });

    await logActivity({
      userId: req.user.id, action: status === 'approved' ? 'approve' : 'reject',
      entityType: 'upload_permission', entityId: perm.id,
      description: `${status === 'approved' ? 'Approve' : 'Reject'} upload ${perm.document.document_number}`,
      ipAddress: req.ip,
    });

    // Real-time: refresh admin list, requesting teknisi, and public board
    emitToAdmins('document:updated', { documentId: perm.document_id });
    emitToUsers([perm.requested_by], 'document:updated', { documentId: perm.document_id });
    emitToPublicBoard('board:updated', { documentId: perm.document_id });

    res.json(perm);
  } catch (err) { next(err); }
});

// GET /api/uploads/permissions — Get pending upload permissions
router.get('/permissions', auth, roleGuard('admin', 'superadmin'), async (req, res, next) => {
  try {
    const { status } = req.query;
    const permissions = await prisma.uploadPermission.findMany({
      where: status ? { status } : undefined,
      include: {
        document: true,
        requestedBy: { select: { id: true, username: true } },
      },
      orderBy: { requested_at: 'desc' },
    });
    res.json(permissions);
  } catch (err) { next(err); }
});

// POST /api/uploads/files — Upload evidence files
router.post('/files', auth, roleGuard('teknisi', 'admin', 'superadmin'), upload.array('files', 5), async (req, res, next) => {
  try {
    const { document_id, notes } = req.body;
    
    // Strict RBAC & Status Validation
    const doc = await prisma.document.findUnique({ 
      where: { id: Number(document_id) },
      include: { assignees: true }
    });

    if (!doc) {
      return res.status(404).json({ message: 'Dokumen tidak ditemukan' });
    }

    const isAdminOrSA = ['admin', 'superadmin'].includes(req.user.role);

    if (!isAdminOrSA) {
      const isAssigned = doc.assignees.some(a => a.user_id === req.user.id);
      if (!isAssigned) {
        return res.status(403).json({ message: 'Akses ditolak: Anda tidak ditugaskan pada dokumen ini.' });
      }

      if (doc.status !== 'upload_diizinkan' && doc.status !== 'draft_pra') {
        return res.status(403).json({ message: 'Akses ditolak: Status dokumen belum diizinkan untuk upload evidence atau TTD.' });
      }
    }

    const uploads = [];

    for (const file of req.files) {
      const record = await prisma.documentUpload.create({
        data: {
          document_id: Number(document_id),
          uploaded_by: req.user.id,
          file_path: file.path,
          file_name: file.originalname,
          file_type: file.mimetype,
          file_size: file.size,
          notes: notes || null,
        },
      });
      uploads.push(record);
    }
    const admins = await prisma.user.findMany({ where: { role: { in: ['admin', 'superadmin'] } } });
    for (const admin of admins) {
      await createNotification({
        userId: admin.id, title: 'File Di-upload',
        message: `${req.user.username} telah upload file untuk ${doc?.document_number}`,
        type: 'upload_request', referenceType: 'document', referenceId: Number(document_id),
      });
    }

    // Auto-update status if the document was in draft_pra
    if (doc.status === 'draft_pra') {
      await prisma.document.update({
        where: { id: Number(document_id) },
        data: { status: 'assigned' }
      });
      
      const { getIO } = require('../config/socket');
      const io = getIO();
      if (io) {
        io.to('public_board').emit('board:updated', { documentId: doc.id });
        doc.assignees.forEach(a => io.to(`user:${a.user_id}`).emit('document:updated', { documentId: doc.id }));
      }
      emitToAdmins('document:updated', { documentId: doc.id });
    }

    await logActivity({
      userId: req.user.id, action: 'upload', entityType: 'document', entityId: Number(document_id),
      description: `Upload ${req.files.length} file untuk ${doc?.document_number}`, ipAddress: req.ip,
    });

    res.status(201).json(uploads);
  } catch (err) { next(err); }
});

// GET /api/uploads/document/:docId
router.get('/document/:docId', auth, async (req, res, next) => {
  try {
    const uploads = await prisma.documentUpload.findMany({
      where: { document_id: Number(req.params.docId) },
      orderBy: { uploaded_at: 'desc' },
    });
    res.json(uploads);
  } catch (err) { next(err); }
});

module.exports = router;
