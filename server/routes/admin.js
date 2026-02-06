const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { verifyToken, requireRole } = require('../middleware/auth');

// GET /api/admin/pending
router.get('/pending', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const pending = await User.find({ role: { $in: ['ngo', 'volunteer'] }, verified: false }).select('-password');
    res.json(pending);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/verify/:id
router.post('/verify/:id', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { verified: true }, { new: true }).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ message: 'User verified', user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;