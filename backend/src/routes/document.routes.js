const router = require('express').Router();
const prisma = require('../config/database');
const { auth, roleGuard } = require('../middleware/auth');
const { logActivity } = require('../services/activityLog.service');
const { createNotification } = require('../services/notification.service');

// ─── Helper: emit a socket event to given user IDs ───────────────────────────
function emitToUsers(userIds, event, payload) {
  try {
    const { getIO } = require('../config/socket');
    const io = getIO();
    if (!io) {
      console.warn('[Socket] IO not ready — skipping emit:', event);
      return;
    }
    for (const uid of userIds) {
      console.log(`[Socket] emit ${event} → user:${uid}`, payload);
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
    if (io) {
      io.to('public_board').emit(event, payload);
    }
  } catch (err) {
    console.error('[Socket] emitToPublicBoard error:', err.message);
  }
}

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

// GET /api/documents — List all (Admin/SA) with pagination, search, filter
router.get('/', auth, roleGuard('admin', 'superadmin'), async (req, res, next) => {
  try {
    const { page = 1, limit = 10, search, type, status, nama_kapal } = req.query;
    const where = {};
    if (search) {
      where.OR = [
        { document_number: { contains: search } },
        { title: { contains: search } },
      ];
    }
    if (type) where.document_type = type;
    if (status) where.status = status;
    if (nama_kapal) where.nama_kapal = nama_kapal;

    const [documents, total] = await Promise.all([
      prisma.document.findMany({
        where,
        include: {
          assignees: { include: { user: { select: { id: true, username: true } } } },
          createdBy: { select: { id: true, username: true } },
        },
        orderBy: { created_at: 'desc' },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
      }),
      prisma.document.count({ where }),
    ]);

    res.json({ data: documents, total, page: Number(page), totalPages: Math.ceil(total / Number(limit)) });
  } catch (err) { next(err); }
});

// GET /api/documents/export — Export all filtered docs for Excel
router.get('/export', auth, roleGuard('admin', 'superadmin'), async (req, res, next) => {
  try {
    const { search, type, status, nama_kapal } = req.query;
    const where = {};
    if (search) where.OR = [{ document_number: { contains: search } }, { title: { contains: search } }];
    if (type) where.document_type = type;
    if (status) where.status = status;
    if (nama_kapal) where.nama_kapal = nama_kapal;

    const documents = await prisma.document.findMany({
      where,
      include: { assignees: { include: { user: { select: { username: true } } } } },
      orderBy: { created_at: 'desc' },
    });
    res.json(documents);
  } catch (err) { next(err); }
});

// GET /api/documents/my-tasks — Teknisi's assigned tasks (now modified to show all documents)
router.get('/my-tasks', auth, roleGuard('teknisi'), async (req, res, next) => {
  try {
    const documents = await prisma.document.findMany({
      include: {
        assignees: { include: { user: { select: { id: true, username: true } } } },
      },
      orderBy: { created_at: 'desc' },
    });
    res.json(documents);
  } catch (err) { next(err); }
});

// GET /api/documents/vessels — Get unique vessel names
router.get('/vessels', auth, async (req, res, next) => {
  try {
    const documents = await prisma.document.findMany({
      where: { nama_kapal: { not: null } },
      select: { nama_kapal: true },
      distinct: ['nama_kapal'],
      orderBy: { nama_kapal: 'asc' },
    });
    const vessels = documents.map(d => d.nama_kapal).filter(Boolean);
    res.json(vessels);
  } catch (err) { next(err); }
});

// GET /api/documents/:id
router.get('/:id', auth, async (req, res, next) => {
  try {
    const doc = await prisma.document.findUnique({
      where: { id: Number(req.params.id) },
      include: {
        assignees: { include: { user: { select: { id: true, username: true } } } },
        createdBy: { select: { id: true, username: true } },
        uploads: true,
        uploadPermissions: {
          include: { requestedBy: { select: { username: true } } },
          orderBy: { requested_at: 'desc' },
        },
      },
    });
    if (!doc) return res.status(404).json({ message: 'Dokumen tidak ditemukan' });
    res.json(doc);
  } catch (err) { next(err); }
});

// POST /api/documents — Create
router.post('/', auth, roleGuard('admin', 'superadmin'), async (req, res, next) => {
  try {
    const { document_type, document_number, document_date, title, nama_kapal, assignees } = req.body;
    const doc = await prisma.document.create({
      data: {
        document_type,
        document_number,
        document_date: new Date(document_date),
        title,
        nama_kapal,
        created_by: req.user.id,
        assignees: assignees && assignees.length > 0 ? {
          create: assignees.map((id) => ({ user_id: Number(id) }))
        } : undefined,
      },
    });

    await logActivity({
      userId: req.user.id, action: 'create', entityType: 'document', entityId: doc.id,
      description: `Membuat dokumen ${document_number}`, ipAddress: req.ip,
    });

    if (assignees && assignees.length > 0) {
      const assigneeIds = assignees.map(Number);

      for (const assigneeId of assigneeIds) {
        await createNotification({
          userId: assigneeId, title: 'Tugas Baru',
          message: `Anda menerima tugas baru: ${document_number}`,
          type: 'system', referenceType: 'document', referenceId: doc.id,
          sendTele: true
        });
      }

      // Notify all assignees via socket (document:updated triggers list refresh)
      emitToUsers(assigneeIds, 'document:updated', {
        documentId: doc.id,
        status: doc.status,
        document_number: doc.document_number,
      });
    }

    emitToPublicBoard('board:updated', { documentId: doc.id });
    emitToAdmins('document:created', { documentId: doc.id });
    res.status(201).json(doc);
  } catch (err) { next(err); }
});

// PUT /api/documents/:id — Update (title, type, date, assignees, and optionally status/deadline)
router.put('/:id', auth, roleGuard('admin', 'superadmin'), async (req, res, next) => {
  try {
    const docId = Number(req.params.id);
    const { document_type, document_number, document_date, title, nama_kapal, assignees, status, deadline_sn } = req.body;

    // Fetch old doc (for assignees + status validation)
    const oldDoc = await prisma.document.findUnique({
      where: { id: docId },
      include: { assignees: true },
    });
    if (!oldDoc) return res.status(404).json({ message: 'Dokumen tidak ditemukan' });

    // Validate status transition if status is changing
    if (status && status !== oldDoc.status) {
      const validTransitions = {
        'proses': ['menunggu_izin', 'draft_sn'],
        'menunggu_izin': ['upload_diizinkan', 'proses', 'draft_sn'],
        'upload_diizinkan': ['draft_sn', 'proses'],
        'draft_sn': ['draft_pra', 'assigned', 'proses'],
        'draft_pra': ['assigned', 'proses'],
        'assigned': ['selesai', 'proses'],
        'selesai': ['proses'],
      };
      const allowed = validTransitions[oldDoc.status] || [];
      if (!allowed.includes(status)) {
        return res.status(400).json({
          message: `Transisi status tidak valid: '${oldDoc.status}' → '${status}'`,
        });
      }
    }

    const updateData = {
      document_type, document_number,
      document_date: document_date ? new Date(document_date) : undefined,
      title,
      nama_kapal: nama_kapal !== undefined ? nama_kapal : undefined,
      ...(status ? { status } : {}),
      ...(deadline_sn !== undefined ? {
        deadline_sn: deadline_sn === null ? null : new Date(deadline_sn),
      } : {}),
    };

    if (assignees !== undefined) {
      updateData.assignees = {
        deleteMany: {},
        create: assignees.map((id) => ({ user_id: Number(id) })),
      };
    }

    const doc = await prisma.document.update({
      where: { id: docId },
      data: updateData,
      include: { assignees: true },
    });

    await logActivity({
      userId: req.user.id, action: 'update', entityType: 'document', entityId: doc.id,
      description: `Mengupdate dokumen ${doc.document_number}`, ipAddress: req.ip,
    });

    // Collect all affected user IDs (old + new assignees)
    const oldIds = (oldDoc.assignees || []).map((a) => a.user_id);
    const newIds = (doc.assignees || []).map((a) => a.user_id);
    const allAffectedIds = [...new Set([...oldIds, ...newIds])];

    if (allAffectedIds.length > 0) {
      for (const uid of newIds) {
        if (!oldIds.includes(uid)) {
          await createNotification({
            userId: uid, title: 'Tugas Diperbarui',
            message: `Anda ditambahkan ke dokumen: ${doc.document_number}`,
            type: 'system', referenceType: 'document', referenceId: doc.id,
            sendTele: true
          });
        }
      }

      emitToUsers(allAffectedIds, 'document:updated', {
        documentId: doc.id,
        status: doc.status,
        document_number: doc.document_number,
      });
    }

    emitToPublicBoard('board:updated', { documentId: doc.id });
    emitToAdmins('document:updated', { documentId: doc.id });
    res.json(doc);
  } catch (err) { next(err); }
});

// PATCH /api/documents/:id/status — Change status + set deadline
router.patch('/:id/status', auth, roleGuard('admin', 'superadmin'), async (req, res, next) => {
  try {
    const { status, deadline_sn } = req.body;

    const currentDoc = await prisma.document.findUnique({
      where: { id: Number(req.params.id) },
      include: { assignees: true },
    });

    if (!currentDoc) {
      return res.status(404).json({ message: 'Dokumen tidak ditemukan' });
    }

    const validTransitions = {
      'proses': ['menunggu_izin', 'draft_sn'],
      'menunggu_izin': ['upload_diizinkan', 'proses', 'draft_sn'],
      'upload_diizinkan': ['draft_sn', 'proses'],
      'draft_sn': ['draft_pra', 'assigned', 'proses'],
      'draft_pra': ['assigned', 'proses'],
      'assigned': ['selesai', 'proses'],
      'selesai': ['proses']
    };

    if (currentDoc.status !== status) {
      const allowedNextStates = validTransitions[currentDoc.status] || [];
      if (!allowedNextStates.includes(status)) {
        return res.status(400).json({
          message: `Transisi status tidak valid. Tidak bisa berpindah dari '${currentDoc.status}' langsung ke '${status}'.`
        });
      }
    }

    const doc = await prisma.document.update({
      where: { id: Number(req.params.id) },
      data: {
        status,
        deadline_sn: deadline_sn === null ? null : deadline_sn ? new Date(deadline_sn) : undefined,
      },
    });

    await logActivity({
      userId: req.user.id, action: 'update', entityType: 'document', entityId: doc.id,
      description: `Mengubah status ${doc.document_number} → ${status}`, ipAddress: req.ip,
    });

    const assigneeIds = currentDoc.assignees.map((a) => a.user_id);

    if (assigneeIds.length > 0) {
      for (const uid of assigneeIds) {
        await createNotification({
          userId: uid, title: 'Status Berubah',
          message: `Status dokumen ${doc.document_number} diubah menjadi ${status}`,
          type: 'system', referenceType: 'document', referenceId: doc.id,
          sendTele: true
        });
      }

      emitToUsers(assigneeIds, 'document:updated', {
        documentId: doc.id,
        status,
        document_number: doc.document_number,
      });
    }

    emitToPublicBoard('board:updated', { documentId: doc.id });
    emitToAdmins('document:updated', { documentId: doc.id });
    res.json(doc);
  } catch (err) { next(err); }
});

// DELETE /api/documents/:id
router.delete('/:id', auth, roleGuard('superadmin'), async (req, res, next) => {
  try {
    const docId = Number(req.params.id);

    const doc = await prisma.document.findUnique({
      where: { id: docId },
      include: { assignees: true }
    });

    if (!doc) {
      return res.status(404).json({ message: 'Dokumen tidak ditemukan' });
    }

    // Save assignee IDs before deletion
    const assigneeIds = doc.assignees.map((a) => a.user_id);

    // Delete related records safely within a transaction
    await prisma.$transaction([
      prisma.documentUpload.deleteMany({ where: { document_id: docId } }),
      prisma.uploadPermission.deleteMany({ where: { document_id: docId } }),
      prisma.document.delete({ where: { id: docId } })
    ]);

    await logActivity({
      userId: req.user.id, action: 'delete', entityType: 'document', entityId: docId,
      description: `Menghapus dokumen ${doc.document_number}`, ipAddress: req.ip,
    });

    if (assigneeIds.length > 0) {
      emitToUsers(assigneeIds, 'document:deleted', {
        documentId: docId,
        document_number: doc.document_number,
      });
    }

    emitToPublicBoard('board:updated', { documentId: docId });
    emitToAdmins('document:deleted', { documentId: docId });
    res.json({ message: 'Dokumen berhasil dihapus' });
  } catch (err) { next(err); }
});

module.exports = router;
