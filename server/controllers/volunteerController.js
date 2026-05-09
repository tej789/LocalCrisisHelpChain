const Volunteer = require('../models/Volunteer');
const Notification = require('../models/Notification');

/* ============================
   Get current volunteer profile
============================ */
exports.getMe = async (req, res) => {
  try {
    const userId = req.user.id;
    const volunteer = await Volunteer.findById(userId).select('-password');

    if (!volunteer) {
      return res.status(404).json({ error: 'Volunteer not found' });
    }

    res.json(volunteer);
  } catch (err) {
    console.error('Get volunteer profile error:', err);
    res.status(500).json({ error: 'Failed to fetch volunteer profile' });
  }
};

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
    const userId = req.user._id || req.user.id;
    let { longitude, latitude } = req.body;

    console.log('📍 Location Update Request:', {
      userId,
      latitude,
      longitude,
      body: req.body
    });

    longitude = Number(longitude);
    latitude = Number(latitude);

    if (isNaN(longitude) || isNaN(latitude)) {
      console.warn('⚠️ Invalid coordinates provided');
      return res.status(400).json({ error: "Invalid coordinates" });
    }

    const updated = await Volunteer.findByIdAndUpdate(
      userId,
      {
        location: {
          type: "Point",
          coordinates: [longitude, latitude]
        }
      },
      { new: true }
    );

    console.log('✅ Volunteer location updated successfully:', {
      userId,
      newLocation: updated?.location?.coordinates
    });

    res.json(updated);

  } catch (err) {
    console.error("❌ LOCATION ERROR FULL:", err);
    res.status(500).json({ error: err.message });
  }
};

/* ============================
   Update availability
============================ */
exports.updateAvailability = async (req, res) => {
  try {
    const userId = req.user.id;
    const { isAvailable } = req.body;

    if (typeof isAvailable !== "boolean") {
      return res.status(400).json({ error: "isAvailable must be boolean" });
    }

    const updated = await Volunteer.findByIdAndUpdate(
      userId,
      { $set: { isAvailable } },
      { new: true, runValidators: true }
    );

    if (!updated) {
      return res.status(404).json({ error: "Volunteer not found" });
    }

    res.json({ isAvailable: updated.isAvailable });

  } catch (err) {
    console.error("Availability Error:", err);
    res.status(500).json({ error: "Failed to update availability" });
  }
};
/* ============================
   Update Name Only
============================ */
exports.updateBasicProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, profilePhoto } = req.body;

    if (!name) {
      return res.status(400).json({ error: "Name is required" });
    }

    if (profilePhoto !== undefined && typeof profilePhoto !== 'string') {
      return res.status(400).json({ error: 'profilePhoto must be a string' });
    }

    if (typeof profilePhoto === 'string' && profilePhoto.length > 2_000_000) {
      return res.status(400).json({ error: 'Profile photo is too large' });
    }

    const update = { name };
    if (profilePhoto !== undefined) {
      update.profilePhoto = profilePhoto;
    }

    const updated = await Volunteer.findByIdAndUpdate(
      userId,
      { $set: update },
      { new: true, runValidators: true }
    );

    if (!updated) {
      return res.status(404).json({ error: "Volunteer not found" });
    }

    res.json({
      name: updated.name,
      profilePhoto: updated.profilePhoto || ''
    });

  } catch (err) {
    console.error("Profile Error:", err);
    res.status(500).json({ error: "Failed to update profile" });
  }
};

/* ============================
   GET volunteer notifications
============================ */
exports.getMyNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({
      volunteerId: req.user.id
    }).sort({ createdAt: -1 });

    res.status(200).json(notifications);
  } catch (err) {
    console.error('Fetch volunteer notification error:', err);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
};

/* ============================
   Mark volunteer notification read
============================ */
exports.markNotificationRead = async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      {
        _id: req.params.id,
        volunteerId: req.user.id
      },
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json(notification);
  } catch (err) {
    console.error('Mark volunteer notification read error:', err);
    res.status(500).json({ error: 'Failed to update notification' });
  }
};