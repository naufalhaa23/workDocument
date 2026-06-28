const router = require('express').Router();
const prisma = require('../config/database');

// Middleware to check board access code
const checkBoardAccess = async (req, res, next) => {
  const code = req.headers['x-board-code'];
  
  try {
    const setting = await prisma.systemSetting.findUnique({ where: { key: 'BOARD_ACCESS_CODE' } });
    const expectedCode = setting?.value || process.env.BOARD_ACCESS_CODE || 'TAS2026';
    
    if (code !== expectedCode) {
      return res.status(403).json({ message: 'Kode akses salah atau tidak ada' });
    }
    next();
  } catch (err) {
    next(err);
  }
};

// GET /api/public/documents — List documents for public Kanban board
router.get('/documents', checkBoardAccess, async (req, res, next) => {
  try {
    const { search, nama_kapal } = req.query;
    const where = {};

    if (search) {
      where.OR = [
        { document_number: { contains: search } },
        { title: { contains: search } },
      ];
    }
    
    if (nama_kapal) {
      where.nama_kapal = nama_kapal;
    }

    const documents = await prisma.document.findMany({
      where,
      select: {
        id: true,
        document_number: true,
        title: true,
        status: true,
        nama_kapal: true,
        document_date: true,
        deadline_sn: true,
      },
      orderBy: [
        { nama_kapal: { sort: 'asc', nulls: 'last' } }, // default: A–Z by vessel name
        { document_date: 'desc' },                       // tiebreak: newest first within same vessel
      ],
      take: 200 // Limit to 200 documents for performance on public view
    });

    res.json(documents);
  } catch (err) { 
    next(err); 
  }
});

// GET /api/public/vessels — List unique vessels for public filter
router.get('/vessels', checkBoardAccess, async (req, res, next) => {
  try {
    const documents = await prisma.document.findMany({
      where: { nama_kapal: { not: null } },
      select: { nama_kapal: true },
      distinct: ['nama_kapal'],
      orderBy: { nama_kapal: 'asc' },
    });
    const vessels = documents.map(d => d.nama_kapal).filter(Boolean);
    res.json(vessels);
  } catch (err) { 
    next(err); 
  }
});

// GET /api/public/documents/:id — Get details for a document
router.get('/documents/:id', checkBoardAccess, async (req, res, next) => {
  try {
    const doc = await prisma.document.findUnique({
      where: { id: Number(req.params.id) },
      include: {
        assignees: { include: { user: { select: { username: true } } } },
        uploads: { select: { file_name: true, file_path: true, uploaded_at: true, file_size: true } }
      }
    });
    if (!doc) return res.status(404).json({ message: 'Dokumen tidak ditemukan' });
    res.json(doc);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
