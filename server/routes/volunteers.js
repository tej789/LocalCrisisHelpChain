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

    // verified filter
    if (String(verified).toLowerCase() === 'true') {
      filters.$or = [
        { isVerified: true },
        { $and: [
            { isVerified: { $exists: false } },
            { verified: true }
          ]
        }
      ];
    }

    // availability filter
    if (String(available).toLowerCase() === 'true') {
      filters.isAvailable = true;
    }

    const projection = {
      name: 1,
      email: 1,
      isAvailable: 1
    };

    const volunteers = await Volunteer
  .find(filters, projection)
  .sort({ name: 1 })
  .lean();

    res.json(volunteers || []);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch volunteers' });
  }
});

// PATCH /api/volunteers/me/location
// Save volunteer live location
router.patch('/me/location', verifyToken, requireRole('volunteer'), async (req, res) => {
  try {
   const userId = req.user.id;

    const { longitude, latitude } = req.body || {};

    if (
      typeof longitude !== 'number' ||
      typeof latitude !== 'number'
    ) {
      return res.status(400).json({ error: 'Invalid coordinates' });
    }

    const vol = await Volunteer.findById(userId);
    if (!vol) return res.status(404).json({ error: 'Volunteer not found' });

    vol.location = {
      type: 'Point',
      coordinates: [longitude, latitude]
    };

    await vol.save();

    res.json({
      message: 'Location updated',
      location: vol.location
    });

  } catch (err) {
    res.status(500).json({ error: 'Failed to update location' });
  }
});
// PATCH /api/volunteers/me/location
router.patch('/me/location', verifyToken, requireRole('volunteer'), async (req, res) => {
  try {
    const userId = req.user.id;
    const { longitude, latitude } = req.body || {};

    if (
      typeof longitude !== 'number' ||
      typeof latitude !== 'number'
    ) {
      return res.status(400).json({ error: 'Invalid coordinates' });
    }

    const vol = await Volunteer.findById(userId);
    if (!vol) return res.status(404).json({ error: 'Volunteer not found' });

    vol.location = {
      type: 'Point',
      coordinates: [longitude, latitude]
    };

    await vol.save();

    res.json({
      message: 'Location updated',
      location: vol.location
    });

  } catch (err) {
    res.status(500).json({ error: 'Failed to update location' });
  }
});

module.exports = router;