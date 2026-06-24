const router = require('express').Router();
const prisma = require('../config/database');
const { auth, roleGuard } = require('../middleware/auth');
const { logActivity } = require('../services/activityLog.service');

// Helper: map frontend fields to Prisma schema fields
function mapItemFields({ item_code, name, category, description, unit, stock, stock_qty, min_stock, is_active }) {
  return {
    ...(item_code !== undefined && { item_code }),
    ...(name !== undefined && { name }),
    ...(category !== undefined && { category }),
    ...(description !== undefined && { description }),
    ...(unit !== undefined && { unit }),
    // Accept both `stock` (frontend) and `stock_qty` (schema)
    ...((stock !== undefined || stock_qty !== undefined) && { stock_qty: Number(stock ?? stock_qty) }),
    ...(min_stock !== undefined && { min_stock: Number(min_stock) }),
    ...(is_active !== undefined && { is_active }),
  };
}

// GET /api/inventory — List items
router.get('/', auth, async (req, res, next) => {
  try {
    const { search, category } = req.query;
    const where = { is_active: true };
    if (search) where.OR = [{ name: { contains: search } }, { item_code: { contains: search } }];
    if (category) where.category = category;

    const items = await prisma.inventoryItem.findMany({ where, orderBy: { name: 'asc' } });
    res.json(items);
  } catch (err) { next(err); }
});

// POST /api/inventory
router.post('/', auth, roleGuard('admin', 'superadmin'), async (req, res, next) => {
  try {
    const data = mapItemFields(req.body);
    const item = await prisma.inventoryItem.create({ data });
    await logActivity({ userId: req.user.id, action: 'create', entityType: 'inventory', entityId: item.id, description: `Tambah barang ${item.name}`, ipAddress: req.ip });
    res.status(201).json(item);
  } catch (err) { next(err); }
});

// PUT /api/inventory/:id
router.put('/:id', auth, roleGuard('admin', 'superadmin'), async (req, res, next) => {
  try {
    const data = mapItemFields(req.body);
    const item = await prisma.inventoryItem.update({ where: { id: Number(req.params.id) }, data });
    await logActivity({ userId: req.user.id, action: 'update', entityType: 'inventory', entityId: item.id, description: `Update barang ${item.name}`, ipAddress: req.ip });
    res.json(item);
  } catch (err) { next(err); }
});

// DELETE /api/inventory/:id
router.delete('/:id', auth, roleGuard('superadmin'), async (req, res, next) => {
  try {
    const item = await prisma.inventoryItem.delete({ where: { id: Number(req.params.id) } });
    await logActivity({ userId: req.user.id, action: 'delete', entityType: 'inventory', entityId: item.id, description: `Hapus barang ${item.name}`, ipAddress: req.ip });
    res.json({ message: 'Barang berhasil dihapus' });
  } catch (err) { next(err); }
});

module.exports = router;

