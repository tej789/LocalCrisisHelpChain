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
            skills: 1,
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
          location: 1,
          skills: 1
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
   GET nearby volunteer locations for volunteer dashboard
============================ */
exports.getNearbyVolunteers = async (req, res) => {
  try {
    const userId = req.user.id;
    const radiusKm = Math.max(1, Math.min(Number(req.query.radiusKm) || 25, 100));
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);

    let centerLat = lat;
    let centerLng = lng;

    if (!Number.isFinite(centerLat) || !Number.isFinite(centerLng)) {
      const currentVolunteer = await Volunteer.findById(userId).select('location').lean();
      const coords = currentVolunteer?.location?.coordinates;
      if (!Array.isArray(coords) || coords.length !== 2) {
        return res.json([]);
      }
      centerLng = Number(coords[0]);
      centerLat = Number(coords[1]);
    }

    if (!Number.isFinite(centerLat) || !Number.isFinite(centerLng)) {
      return res.json([]);
    }

    const radiusMeters = radiusKm * 1000;

    const volunteers = await Volunteer.aggregate([
      {
        $geoNear: {
          near: {
            type: 'Point',
            coordinates: [centerLng, centerLat]
          },
          distanceField: 'distance',
          spherical: true,
          maxDistance: radiusMeters,
          query: {
            _id: { $ne: require('mongoose').Types.ObjectId.isValid(userId) ? require('mongoose').Types.ObjectId(userId) : userId },
            'location.coordinates.0': { $exists: true }
          }
        }
      },
      {
        $project: {
          name: 1,
          profilePhoto: 1,
          isAvailable: 1,
          verified: 1,
          isVerified: 1,
          location: 1,
          distance: { $divide: ['$distance', 1000] }
        }
      },
      { $sort: { distance: 1, name: 1 } }
    ]);

    res.json(volunteers || []);
  } catch (err) {
    console.error('Failed to fetch nearby volunteers:', err);
    res.status(500).json({ error: 'Failed to fetch nearby volunteers' });
  }
};

/* ============================
   GET all other volunteer locations for dashboard overlay
============================ */
exports.getOtherVolunteerLocations = async (req, res) => {
  try {
    const userId = req.user && (req.user.id || req.user._id);
    console.debug('getOtherVolunteerLocations called, userId:', userId, 'type:', typeof userId);

    // Build safe _id filter - compare as strings to avoid ObjectId issues
    const userIdStr = String(userId || '');

    const otherVolunteers = await Volunteer.find(
      {
        'location.coordinates.0': { $exists: true },
        'location.coordinates.1': { $exists: true }
      },
      {
        _id: 1,
        name: 1,
        profilePhoto: 1,
        isAvailable: 1,
        verified: 1,
        isVerified: 1,
        location: 1
      }
    )
      .sort({ name: 1 })
      .lean();

    console.debug('getOtherVolunteerLocations: total found count=', Array.isArray(otherVolunteers) ? otherVolunteers.length : 0);

    // Filter out current user in post-processing
    const filtered = (Array.isArray(otherVolunteers) ? otherVolunteers : []).filter(v => {
      const vIdStr = String(v._id || '');
      const match = vIdStr !== userIdStr;
      if (!match) console.debug('  Excluding current user:', vIdStr);
      return match;
    });

    console.debug('getOtherVolunteerLocations: after filtering out current user, count=', filtered.length);

    res.json(filtered);
  } catch (err) {
    console.error('Failed to fetch other volunteer locations:', err && err.stack ? err.stack : err);
    res.status(500).json({ error: err?.message || 'Failed to fetch other volunteer locations' });
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

    const io = req.app.get('io');
    if (io && updated) {
      io.emit('volunteerLocationUpdated', {
        volunteerId: updated._id,
        volunteerName: updated.name || '',
        profilePhoto: updated.profilePhoto || '',
        latitude,
        longitude,
        isAvailable: updated.isAvailable === true,
        timestamp: Date.now()
      });
    }

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
    const { name, profilePhoto, skills } = req.body;

    if (!name) {
      return res.status(400).json({ error: "Name is required" });
    }

    if (profilePhoto !== undefined && typeof profilePhoto !== 'string') {
      return res.status(400).json({ error: 'profilePhoto must be a string' });
    }

    if (typeof profilePhoto === 'string' && profilePhoto.length > 2_000_000) {
      return res.status(400).json({ error: 'Profile photo is too large' });
    }

    // Validate skills if provided
    const validSkills = ['medical', 'rescue', 'food', 'shelter', 'transport', 'first-aid', 'counseling', 'logistics'];
    if (skills !== undefined) {
      if (!Array.isArray(skills)) {
        return res.status(400).json({ error: 'Skills must be an array' });
      }
      const invalidSkills = skills.filter(s => !validSkills.includes(s));
      if (invalidSkills.length > 0) {
        return res.status(400).json({ error: `Invalid skills: ${invalidSkills.join(', ')}` });
      }
    }

    const update = { name };
    if (profilePhoto !== undefined) {
      update.profilePhoto = profilePhoto;
    }
    if (skills !== undefined) {
      update.skills = skills;
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
      profilePhoto: updated.profilePhoto || '',
      skills: updated.skills || []
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