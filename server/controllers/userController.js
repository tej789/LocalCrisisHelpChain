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
const Notification = require("../models/Notification");

/* =========================
   GET USER NOTIFICATIONS
========================= */
exports.getMyNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({
      userId: req.user.id
    })
    .sort({ createdAt: -1 });

    res.status(200).json(notifications);

  } catch (err) {
    console.error("Fetch notification error:", err);
    res.status(500).json({ error: "Failed to fetch notifications" });
  }
};
// mark as read
exports.markNotificationRead = async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      {
        _id: req.params.id,
        userId: req.user.id
      },
      { isRead: true },
      { new: true }
    );

    if (!notification)
      return res.status(404).json({ error: "Notification not found" });

    res.json(notification);

  } catch (err) {
    console.error("Mark read error:", err);
    res.status(500).json({ error: "Failed to update notification" });
  }
};