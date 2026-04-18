const HelpRequest = require('../models/HelpRequest');
const Volunteer = require('../models/Volunteer');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { 
  sendAssignmentEmail,
  sendVolunteerAssignmentEmail
} = require("../utils/otpService");
/* =========================
   CREATE REQUEST
========================= */
exports.createRequest = async (req, res) => {
  try {
    const helpRequest = new HelpRequest({
      ...req.body,
      createdBy: req.user.id
    });

    await helpRequest.save();

    const io = req.app.get('io');
    if (io) io.emit('newRequest', helpRequest);

    res.status(201).json(helpRequest);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};
/* =========================
   GET ALL REQUESTS (WITH PAGINATION + FILTERING)
========================= */
exports.getRequests = async (req, res) => {
  try {
    // ✅ Extract query params
    let {
      page = 1,
      limit = 10,
      status,
      urgency,
      type,
      search,
      sort = "-createdAt",
      filter // for volunteer logic
    } = req.query;

    page = parseInt(page);
    limit = parseInt(limit);

    // 🔐 Prevent abuse
    if (limit > 50) limit = 50;

    const skip = (page - 1) * limit;

    // ✅ Base query object
    let query = {};

    if (status) query.status = status;
    if (urgency) query.urgency = urgency;
    if (type) query.type = type;

    // 🔍 Search
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { name: { $regex: search, $options: "i" } }
      ];
    }

    let requests;
    let total;

    /* ======================
       👤 USER
    ====================== */
    if (req.user.role?.toLowerCase() === "user") {

      const myQuery = { ...query, createdBy: req.user.id };
      const communityQuery = {
        ...query,
        createdBy: { $ne: req.user.id }
      };

      const myTotal = await HelpRequest.countDocuments(myQuery);
      const communityTotal = await HelpRequest.countDocuments(communityQuery);

      const myRequests = await HelpRequest.find(myQuery)
        .populate("assignedTo", "name")
        .sort(sort)
        .skip(skip)
        .limit(limit);

      const communityRequests = await HelpRequest.find(communityQuery)
        .select("-contact")
        .populate("assignedTo", "name")
        .sort(sort)
        .skip(skip)
        .limit(limit);

      return res.status(200).json({
        success: true,
        myRequests,
        communityRequests,
        pagination: {
          page,
          limit,
          myTotal,
          communityTotal,
          myPages: Math.ceil(myTotal / limit),
          communityPages: Math.ceil(communityTotal / limit)
        }
      });
    }

    /* ======================
       🙋 VOLUNTEER
    ====================== */
    else if (req.user.role?.toLowerCase() === "volunteer") {

      if (filter === "open") {
        query.status = "open";
      } 
      else if (filter === "assigned") {
        query.assignedTo = req.user.id;
      } 
      else if (filter === "resolved") {
        query.handledBy = req.user.id;
        query.status = "resolved";
      } 
      else {
        query.assignedTo = req.user.id;
      }
    }

    /* ======================
       👑 ADMIN / 🏢 NGO
    ====================== */
    else if (
      req.user.role?.toLowerCase() === "admin" ||
      req.user.role?.toLowerCase() === "ngo"
    ) {
      // full access with filters
    }

    // ✅ Count documents
    total = await HelpRequest.countDocuments(query);

    // ✅ Fetch paginated data
    requests = await HelpRequest.find(query)
      .populate("assignedTo", "name email")
      .sort(sort)
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      total,
      page,
      pages: Math.ceil(total / limit),
      results: requests.length,
      data: requests
    });

  } catch (err) {
    console.error("Get requests error:", err);
    res.status(500).json({ error: err.message });
  }
};
/* =========================
   ASSIGN VOLUNTEER
========================= */
exports.assignVolunteer = async (req, res) => {
  try {
    const { volunteerId } = req.body;

    if (!volunteerId)
      return res.status(400).json({ error: 'volunteerId required' });

    const reqDoc = await HelpRequest.findById(req.params.id);
    if (!reqDoc)
      return res.status(404).json({ error: 'Request not found' });

    if (reqDoc.status !== 'open')
      return res.status(400).json({ error: 'Request already assigned' });

    const vol = await Volunteer.findById(volunteerId);
    if (!vol)
      return res.status(404).json({ error: 'Volunteer not found' });

    // ✅ safer verification check
    const verified =
      vol.isVerified === true ||
      (vol.isVerified === undefined && vol.verified === true);

    if (!verified)
      return res.status(400).json({ error: 'Volunteer not verified' });

    if (!vol.isAvailable)
      return res.status(400).json({ error: 'Volunteer not available' });

    const updated = await HelpRequest.findByIdAndUpdate(
      req.params.id,
      {
        assignedTo: volunteerId,
        status: 'assigned',
        assignedAt: new Date()
      },
      { new: true }
    ).populate('assignedTo', 'name email');

    // volunteer becomes unavailable
    vol.isAvailable = false;
    await vol.save();
    // send assignment email
    const user = await User.findById(updated.createdBy);

if (user) {
  await sendAssignmentEmail(user, vol);
}
await sendVolunteerAssignmentEmail(vol, updated, user);

    // Create notifications for both user and assigned volunteer.
    await Notification.insertMany([
      {
        userId: updated.createdBy,
        requestId: updated._id,
        type: 'assigned',
        title: 'Request Assigned',
        message: `Volunteer ${vol.name} has been assigned to your request.`
      },
      {
        volunteerId: vol._id,
        requestId: updated._id,
        type: 'assigned',
        title: 'New Assignment',
        message: `You have been assigned to a ${updated.type} request.`
      }
    ]);
    const io = req.app.get('io');
    if (io) io.emit('requestAssigned', updated);

    res.json(updated);
  } catch (err) {
    console.error("Assign error:", err);
    res.status(500).json({ error: 'Assignment failed' });
  }
};


/* =========================
   RESOLVE REQUEST
========================= */
exports.resolveRequest = async (req, res) => {
  try {
    const updated = await HelpRequest.findByIdAndUpdate(
      req.params.id,
      {
        status: 'resolved',
        handledBy: req.user.id
      },
      { new: true }
    );

    if (!updated)
      return res.status(404).json({ error: 'Request not found' });

   
    if (updated.assignedTo) {
      await Volunteer.findByIdAndUpdate(
        updated.assignedTo,
        { isAvailable: true }
      );
    }

    const io = req.app.get('io');
    if (io) io.emit('requestResolved', updated);

    res.json(updated);

  } catch (err) {
    console.error("Resolve error:", err);
    res.status(400).json({ error: 'Resolve failed' });
  }
};

/* =========================
  REQUEST ANALYTICS (NGO)
========================= */
exports.getRequestStats = async (req, res) => {
  try {
    const stats = await HelpRequest.aggregate([
      {
        $facet: {
          statusStats: [
            {
              $group: {
                _id: "$status",
                count: { $sum: 1 }
              }
            }
          ],
          urgencyStats: [
            {
              $group: {
                _id: "$urgency",
                count: { $sum: 1 }
              }
            }
          ],
          totalRequests: [
            {
              $count: "total"
            }
          ]
        }
      }
    ]);

    const formatted = {
      total: stats[0].totalRequests[0]?.total || 0,
      status: {},
      urgency: {}
    };

    stats[0].statusStats.forEach(item => {
      formatted.status[item._id] = item.count;
    });

    stats[0].urgencyStats.forEach(item => {
      formatted.urgency[item._id] = item.count;
    });

    res.status(200).json({
      success: true,
      data: formatted
    });

  } catch (err) {
    console.error("Analytics error:", err);
    res.status(500).json({ error: "Failed to fetch analytics" });
  }
};

/* =========================
   GET VOLUNTEER LOCATION FOR TRACKING
========================= */
exports.getVolunteerLocation = async (req, res) => {
  try {
    const { requestId } = req.params;

    // Find the request
    const request = await HelpRequest.findById(requestId)
      .populate('assignedTo', 'name location profilePhoto');

    if (!request) {
      return res.status(404).json({ error: 'Request not found' });
    }

    if (!request.assignedTo) {
      return res.status(400).json({ error: 'No volunteer assigned to this request' });
    }

    const volunteer = request.assignedTo;

    // Extract volunteer location
    let latitude = null;
    let longitude = null;

    if (volunteer.location && volunteer.location.coordinates && volunteer.location.coordinates.length === 2) {
      [longitude, latitude] = volunteer.location.coordinates;
    }

    res.status(200).json({
      success: true,
      volunteerName: volunteer.name,
      volunteerPhoto: volunteer.profilePhoto || '',
      latitude,
      longitude,
      requestLocation: {
        // Fixed help location (where assistance is needed)
        latitude: request.location.coordinates[1],
        longitude: request.location.coordinates[0],
        address: request.location.address
      },
      // Optional live position of the requester (user). This lets the
      // volunteer see where the user currently is without changing the
      // actual crisis location or route destination.
      userLiveLocation: (
        request.liveLocation &&
        Array.isArray(request.liveLocation.coordinates) &&
        request.liveLocation.coordinates.length === 2
      ) ? {
        latitude: request.liveLocation.coordinates[1],
        longitude: request.liveLocation.coordinates[0],
        updatedAt: request.liveLocation.updatedAt
      } : null
    });

  } catch (err) {
    console.error('Get volunteer location error:', err);
    res.status(500).json({ error: err.message });
  }
};

/* =========================
   UPDATE REQUEST LIVE LOCATION (USER)
========================= */
exports.updateRequestLiveLocation = async (req, res) => {
  try {
    const { id } = req.params;
    const { latitude, longitude } = req.body;

    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      return res.status(400).json({ error: 'latitude and longitude are required numbers' });
    }

    const request = await HelpRequest.findOne({
      _id: id,
      createdBy: req.user.id,
      status: { $ne: 'resolved' }
    });

    if (!request) {
      return res.status(404).json({ error: 'Active request not found for this user' });
    }

    request.liveLocation = {
      coordinates: [longitude, latitude],
      updatedAt: new Date()
    };

    await request.save();

    const io = req.app.get('io');
    if (io) {
      io.emit('requestLocationUpdated', {
        requestId: request._id,
        coordinates: request.liveLocation.coordinates,
        updatedAt: request.liveLocation.updatedAt
      });
    }

    res.status(200).json({
      success: true,
      requestId: request._id,
      liveLocation: request.liveLocation
    });
  } catch (err) {
    console.error('Update request live location error:', err);
    res.status(500).json({ error: err.message });
  }
};