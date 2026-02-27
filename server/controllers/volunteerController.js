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

    
    const userId = req.user._id || req.user.id;
    let { longitude, latitude } = req.body;

    longitude = Number(longitude);
    latitude = Number(latitude);

    if (isNaN(longitude) || isNaN(latitude)) {
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

    res.json(updated);

  } catch (err) {
    console.error("LOCATION ERROR FULL:", err);
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
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ error: "Name is required" });
    }

    const updated = await Volunteer.findByIdAndUpdate(
      userId,
      { $set: { name } },
      { new: true, runValidators: true }
    );

    if (!updated) {
      return res.status(404).json({ error: "Volunteer not found" });
    }

    res.json({ name: updated.name });

  } catch (err) {
    console.error("Profile Error:", err);
    res.status(500).json({ error: "Failed to update profile" });
  }
};