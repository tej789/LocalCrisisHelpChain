const express = require('express');
const router = express.Router();
const Volunteer = require('../models/Volunteer');
const { verifyToken, requireAnyRole, requireRole } = require('../middleware/auth');

// GET /api/volunteers
// Query params:
//   verified=true   -> only verified volunteers (backward compatible: isVerified===true OR legacy verified===true if isVerified missing)
//   available=true  -> only volunteers with isAvailable===true
// Access: NGO or Admin
router.get('/', verifyToken, requireAnyRole(['ngo', 'admin']), async (req, res) => {
  try {
    const { verified, available } = req.query;

    const filters = {};

    // Backward compatible verification filter
    if (String(verified).toLowerCase() === 'true') {
      filters.$or = [
        { isVerified: true },
        { $and: [ { isVerified: { $exists: false } }, { verified: true } ] }
      ];
    }

    if (String(available).toLowerCase() === 'true') {
      filters.isAvailable = true;
    }

    // Projection: restrict to allowed fields only
    const projection = { name: 1, email: 1, isAvailable: 1 };

    const volunteers = await Volunteer.find(filters, projection).lean();

    return res.json(volunteers || []);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch volunteers' });
  }
});

module.exports = router;
 
// PATCH /api/volunteers/me/availability
// Allows only authenticated, VERIFIED volunteers to update their own isAvailable flag
router.patch('/me/availability', verifyToken, requireRole('volunteer'), async (req, res) => {
  try {
    console.log("Availability API called");

    const userId = req.user.id;
    const { isAvailable } = req.body || {};
    if (typeof isAvailable !== 'boolean') {
      return res.status(400).json({ error: 'isAvailable must be a boolean' });
    }

    // Load volunteer doc
    const vol = await Volunteer.findById(userId);
    if (!vol) return res.status(404).json({ error: 'Volunteer not found' });

    // Verified check (backward compatible)
    const verified = vol.isVerified === true || (vol.isVerified === undefined && vol.verified === true);
    if (!verified) return res.status(403).json({ error: 'Only verified volunteers can change availability' });

    vol.isAvailable = isAvailable;
    await vol.save();

    // Respond with minimal safe fields
    return res.json({ _id: vol._id, name: vol.name, email: vol.email, isAvailable: vol.isAvailable, isVerified: vol.isVerified });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update availability' });
  }
});
