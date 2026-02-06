const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const User = require('../models/User');

// GET /api/users/me - return authenticated user's profile
router.get('/me', verifyToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    console.log('[Users] /me userId:', userId);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const user = await User.findById(userId).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Map contact to phone for compatibility with frontend
    const payload = user.toObject();
    payload.phone = payload.contact || '';
    return res.json(payload);
  } catch (err) {
    console.error('[Users] /me error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/users/update-profile - update allowed fields: name, phone(contact)
router.put('/update-profile', verifyToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    console.log('[Users] /update-profile userId:', userId);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { name, phone } = req.body || {};

    const update = {};
    if (typeof name === 'string') update.name = name;
    if (typeof phone === 'string') update.contact = phone; // store as contact in DB

    console.log('[Users] /update-profile update object:', update);

    const updated = await User.findByIdAndUpdate(
      userId,
      { $set: update },
      { new: true, runValidators: true, projection: { password: 0 } }
    );

    if (!updated) return res.status(404).json({ error: 'User not found' });
    const payload = updated.toObject();
    payload.phone = payload.contact || '';

    console.log('[Users] /update-profile updated OK for user:', userId, 'result:', { name: payload.name, phone: payload.phone });
    return res.json(payload);
  } catch (err) {
    console.error('[Users] /update-profile error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
