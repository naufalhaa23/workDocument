const router = require('express').Router();
const prisma = require('../config/database');
const { auth, roleGuard } = require('../middleware/auth');

// GET /api/settings/:key — Get a specific setting
router.get('/:key', auth, roleGuard('superadmin'), async (req, res, next) => {
  try {
    const setting = await prisma.systemSetting.findUnique({
      where: { key: req.params.key },
    });
    
    // Provide default fallback if not found
    if (!setting && req.params.key === 'BOARD_ACCESS_CODE') {
      return res.json({ key: 'BOARD_ACCESS_CODE', value: process.env.BOARD_ACCESS_CODE || 'TAS2026' });
    }
    
    if (!setting) return res.status(404).json({ message: 'Setting not found' });
    res.json(setting);
  } catch (err) {
    next(err);
  }
});

// PUT /api/settings/:key — Update or create a setting
router.put('/:key', auth, roleGuard('superadmin'), async (req, res, next) => {
  try {
    const { value, description } = req.body;
    
    const setting = await prisma.systemSetting.upsert({
      where: { key: req.params.key },
      update: { value, description },
      create: { key: req.params.key, value, description },
    });
    
    res.json(setting);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
