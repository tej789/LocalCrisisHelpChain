const User = require('../models/User');

/* ============================
   GET /api/users/me
============================ */
exports.getProfile = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId)
      return res.status(401).json({ error: 'Unauthorized' });

    const user = await User.findById(userId).select('-password');

    if (!user)
      return res.status(404).json({ error: 'User not found' });

    const payload = user.toObject();

    // frontend compatibility
    payload.phone = payload.contact || '';

    res.json(payload);

  } catch (err) {
    console.error('[Users] /me error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};


/* ============================
   PUT /api/users/update-profile
============================ */
exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId)
      return res.status(401).json({ error: 'Unauthorized' });

    const { name, phone } = req.body || {};

    const update = {};

    if (typeof name === 'string')
      update.name = name;

    if (typeof phone === 'string')
      update.contact = phone; // stored as contact

    const updated = await User.findByIdAndUpdate(
      userId,
      { $set: update },
      { new: true, runValidators: true, projection: { password: 0 } }
    );

    if (!updated)
      return res.status(404).json({ error: 'User not found' });

    const payload = updated.toObject();
    payload.phone = payload.contact || '';

    res.json(payload);

  } catch (err) {
    console.error('[Users] update-profile error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};
