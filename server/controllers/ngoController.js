const NGO = require('../models/NGO');

/* ============================
   GET NGO PROFILE
============================ */
exports.getProfile = async (req, res) => {
  try {
    const ngoId = req.user.id;

    const ngo = await NGO.findById(ngoId).select('-password');
    if (!ngo) return res.status(404).json({ error: 'NGO not found' });

    res.json(ngo);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};


/* ============================
   UPDATE NGO PROFILE
============================ */
exports.updateProfile = async (req, res) => {
  try {
    const ngoId = req.user.id;

    const updated = await NGO.findByIdAndUpdate(
      ngoId,
      req.body,
      { new: true }
    ).select('-password');

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Update failed' });
  }
};
