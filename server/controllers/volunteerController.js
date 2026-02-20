const Volunteer = require('../models/Volunteer');

/* ============================
   GET volunteers
============================ */
exports.getVolunteers = async (req, res) => {
  try {
    const { verified, available, lng, lat } = req.query;

    const filters = {
      "location.coordinates.0": { $exists: true }
    };

    // verified filter
    if (String(verified).toLowerCase() === 'true') {
      filters.$or = [
        { isVerified: true },
        {
          $and: [
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

    let volunteers;

    // distance-based sorting
    if (lng && lat) {
      volunteers = await Volunteer.aggregate([
        {
          $geoNear: {
            near: {
              type: "Point",
              coordinates: [Number(lng), Number(lat)]
            },
            distanceField: "distance",
            spherical: true,
            query: filters
          }
        },
        {
          $project: {
            name: 1,
            email: 1,
            isAvailable: 1,
            distance: { $divide: ["$distance", 1000] }
          }
        }
      ]);
    } else {
      volunteers = await Volunteer
        .find(filters, {
          name: 1,
          email: 1,
          isAvailable: 1,
          location: 1
        })
        .sort({ name: 1 })
        .lean();
    }

    res.json(volunteers || []);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch volunteers' });
  }
};


/* ============================
   Update volunteer location
============================ */
exports.updateLocation = async (req, res) => {
  try {
    const userId = req.user.id;
    const { longitude, latitude } = req.body || {};

    if (typeof longitude !== 'number' || typeof latitude !== 'number') {
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
};


/* ============================
   Update availability
============================ */
exports.updateAvailability = async (req, res) => {
  try {
    const userId = req.user.id;
    const { isAvailable } = req.body;

    if (typeof isAvailable !== 'boolean') {
      return res.status(400).json({ error: 'isAvailable must be boolean' });
    }

    const vol = await Volunteer.findById(userId);
    if (!vol) return res.status(404).json({ error: 'Volunteer not found' });

    vol.isAvailable = isAvailable;
    await vol.save();

    res.json({
      isAvailable: vol.isAvailable,
      isVerified: vol.isVerified
    });

  } catch (err) {
    res.status(500).json({ error: 'Failed to update availability' });
  }
};
/* ============================
   Update Name Only
============================ */
exports.updateBasicProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ error: "Name is required" });
    }

    const vol = await Volunteer.findById(userId);
    if (!vol) return res.status(404).json({ error: "Volunteer not found" });

    vol.name = name;
    await vol.save();

    res.json({
      name: vol.name
    });

  } catch (err) {
    res.status(500).json({ error: "Failed to update profile" });
  }
};