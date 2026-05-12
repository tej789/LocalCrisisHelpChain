const HelpRequest = require('../models/HelpRequest');
const Volunteer = require('../models/Volunteer');
const User = require('../models/User');
const Notification = require('../models/Notification');
const SosCooldown = require('../models/SosCooldown');
const { 
  sendAssignmentEmail,
  sendVolunteerAssignmentEmail
} = require("../utils/otpService");
const SOS_COOLDOWN_MS = parseInt(process.env.SOS_COOLDOWN_MS || '120000', 10); // default 2 minutes
const REQUEST_LIVE_LOCATION_MAX_AGE_MS = parseInt(process.env.REQUEST_LIVE_LOCATION_MAX_AGE_MS || '120000', 10); // default 2 minutes
const haversine = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) * Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c * 1000; // meters
};

/* =========================
   SOS ALERT - one-tap emergency
   Creates a lightweight HelpRequest and notifies nearby volunteers
========================= */
exports.sosAlert = async (req, res) => {
  console.log('SOS endpoint called by user:', req.user?.id || 'unknown');
  console.log('Request body:', req.body);
  
  // Database-backed cooldown enforcement
  try {
    const now = Date.now();
    const cooldownRecord = await SosCooldown.findOne({ userId: req.user.id });
    
    if (cooldownRecord) {
      const lastSosMs = cooldownRecord.lastSosTimestamp.getTime();
      const timeSinceLastSos = now - lastSosMs;
      
      if (timeSinceLastSos < SOS_COOLDOWN_MS) {
        const wait = Math.ceil((SOS_COOLDOWN_MS - timeSinceLastSos) / 1000);
        console.log(`[SOS] Cooldown enforced for user ${req.user.id}. Wait ${wait}s`);
        return res.status(429).json({ success: false, error: `Please wait ${wait}s before sending another SOS.` });
      }
    }
    
    // Update/create cooldown record
    await SosCooldown.findOneAndUpdate(
      { userId: req.user.id },
      { lastSosTimestamp: new Date() },
      { upsert: true, new: true }
    );
    console.log(`[SOS] Cooldown updated for user ${req.user.id}`);
  } catch (e) {
    console.error('[SOS] Cooldown check error:', e);
    // Don't block SOS on cooldown errors, but log it
  }

  try {
    const { latitude, longitude, address, message } = req.body;
    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      return res.status(400).json({ error: 'latitude and longitude required (numbers)' });
    }

    const user = await User.findById(req.user.id).select('name contact');

    // Create a short-lived HelpRequest to attach to notifications
    const helpRequest = new HelpRequest({
      title: message ? message.slice(0, 80) : 'SOS Alert',
      name: user?.name || 'Anonymous',
      contact: user?.contact || '',
      location: { type: 'Point', coordinates: [longitude, latitude], address: address || 'Live SOS' },
      type: 'rescue',
      isSos: true,
      urgency: 'high',
      description: message || 'User triggered SOS',
      status: 'open',
      createdBy: req.user.id
    });

    await helpRequest.save();

    // Find all available, verified volunteers
    const allVolunteers = await Volunteer.find({
      isAvailable: true,
      isVerified: true,
      location: {
        $exists: true,
        $ne: null
      }
    });

    console.log(`[SOS] Found ${allVolunteers.length} available verified volunteers`);

    if (allVolunteers.length === 0) {
      console.log(`[SOS] No available verified volunteers found`);
      return res.json({ success: true, alerted: 0, requestId: helpRequest._id });
    }

    // Calculate distance for each volunteer
    const volunteersWithDist = allVolunteers.map(v => {
      const vDist = (v.location && Array.isArray(v.location.coordinates) && v.location.coordinates.length === 2)
        ? haversine(latitude, longitude, v.location.coordinates[1], v.location.coordinates[0])
        : Infinity;
      return { volunteer: v, distance: vDist };
    }).sort((a, b) => a.distance - b.distance);

    // Get the minimum distance
    const minDistance = volunteersWithDist[0].distance;
    console.log(`[SOS] Minimum distance: ${Math.round(minDistance)}m`);

    // Get all volunteers at the minimum distance (in case multiple are at same location)
    const closestVolunteers = volunteersWithDist.filter(v => v.distance === minDistance);
    console.log(`[SOS] Found ${closestVolunteers.length} volunteer(s) at closest distance`);

    // Select ONE closest volunteer (pick first one, or randomly if preferred)
    const selectedVolunteer = closestVolunteers[0].volunteer;
    const selectedDistance = closestVolunteers[0].distance;

    let alertedCount = 0;

    // Notify ONLY the closest selected volunteer
    if (selectedVolunteer) {
      try {
        // Save the target volunteer in the request
        helpRequest.sosTargetVolunteer = selectedVolunteer._id;
        await helpRequest.save();

        // Create notification in database
        await Notification.create({
          volunteerId: selectedVolunteer._id,
          requestId: helpRequest._id,
          type: 'sos',
          title: 'Emergency Nearby',
          message: `SOS from ${user?.name || 'a user'} — approx ${Math.round(selectedDistance)}m away`
        });

        console.log(`[SOS] Notification created for volunteer ${selectedVolunteer._id} at ${Math.round(selectedDistance)}m`);
        alertedCount = 1;
      } catch (e) {
        console.error(`[SOS] Failed to create notification:`, e);
      }
    }

    // Notify via socket.io - ONLY the selected volunteer
    const io = req.app.get('io');
    if (io && selectedVolunteer) {
        try {
          const room = `vol_${selectedVolunteer._id.toString()}`;
          console.log(`[SOS] Emitting sosAlert to room: ${room} (distance: ${Math.round(selectedDistance)}m)`);
          
          io.to(room).emit('sosAlert', {
            volunteerId: selectedVolunteer._id.toString(),
            request: helpRequest,
            distance: Math.round(selectedDistance)
          });
          
          console.log(`[SOS] sosAlert emitted successfully to ${room}`);
        } catch (e) {
          console.error(`[SOS] Error emitting sosAlert:`, e);
          // Fallback: broadcast to all
          try {
            console.log(`[SOS] Broadcasting sosAlert to all clients as fallback`);
            io.emit('sosAlert', { 
              volunteerId: selectedVolunteer._id.toString(), 
              request: helpRequest,
              distance: Math.round(selectedDistance)
            });
          } catch (e) {
            console.error(`[SOS] Fallback broadcast also failed:`, e);
          }
        }
    }

    return res.json({ success: true, alerted: alertedCount, requestId: helpRequest._id });
  } catch (err) {
    console.error('SOS alert error:', err);
    return res.status(500).json({ error: 'Failed to send SOS' });
  }
};
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
      isSos,
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

    if (typeof isSos !== 'undefined') {
      const wantsSos = String(isSos).toLowerCase() === 'true';
      if (wantsSos) {
        query.$or = [
          { isSos: true },
          { type: 'rescue', sosTargetVolunteer: { $exists: true, $ne: null } }
        ];
      } else {
        query.isSos = false;
      }
    }

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
        // Include both already-assigned requests and open SOS alerts targeted to this volunteer.
        // This keeps the Handle SOS panel populated even after the dashboard refreshes.
        query.$or = [
          { assignedTo: req.user.id },
          { isSos: true, status: 'open', sosTargetVolunteer: req.user.id },
          { type: 'rescue', status: 'open', sosTargetVolunteer: req.user.id }
        ];
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

    if (!updated) {
      return res.status(404).json({ error: 'Request not found after update' });
    }

    const isSosRequest =
      reqDoc.isSos === true ||
      (reqDoc.type === 'rescue' && reqDoc.sosTargetVolunteer);
    const userMailSubject = isSosRequest
      ? 'Your SOS has been assigned to a volunteer'
      : 'Volunteer Assigned to Your Crisis Request';
    const volunteerMailSubject = isSosRequest
      ? 'You have been assigned an SOS request'
      : 'New Crisis Request Assigned to You';

    // volunteer becomes unavailable without triggering validation on legacy records
    await Volunteer.findByIdAndUpdate(
      volunteerId,
      { $set: { isAvailable: false } },
      { new: true }
    );

    // Best-effort notifications: assignment should still succeed even if these fail.
    const user = await User.findById(updated.createdBy);

    try {
      if (user) {
        await sendAssignmentEmail(user, vol, userMailSubject);
      }
      await sendVolunteerAssignmentEmail(vol, updated, user, volunteerMailSubject);
    } catch (emailErr) {
      console.error('Assignment email error:', emailErr);
    }

    try {
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
    } catch (notificationErr) {
      console.error('Assignment notification error:', notificationErr);
    }

    const io = req.app.get('io');
    if (io) io.emit('requestAssigned', updated);

    res.json(updated);
  } catch (err) {
    console.error("Assign error:", err);
    res.status(500).json({
      error: process.env.NODE_ENV === 'production'
        ? 'Assignment failed'
        : `Assignment failed: ${err.message}`
    });
  }
};

/* =========================
   CLAIM SOS / REQUEST BY VOLUNTEER
========================= */
exports.claimRequest = async (req, res) => {
  try {
    const reqDoc = await HelpRequest.findById(req.params.id);
    if (!reqDoc) {
      return res.status(404).json({ error: 'Request not found' });
    }

    const volunteerId = req.user.id;
    const alreadyAssignedToMe = reqDoc.assignedTo && reqDoc.assignedTo.toString() === volunteerId.toString();

    if (reqDoc.status !== 'open') {
      if (alreadyAssignedToMe) {
        return res.status(200).json({
          success: true,
          alreadyAssigned: true,
          message: 'This SOS is already assigned to you.',
          data: reqDoc
        });
      }

      return res.status(400).json({ error: 'Request already assigned' });
    }

    if ((reqDoc.isSos || (reqDoc.type === 'rescue' && reqDoc.sosTargetVolunteer)) && reqDoc.sosTargetVolunteer && reqDoc.sosTargetVolunteer.toString() !== volunteerId.toString()) {
      return res.status(403).json({ error: 'This SOS can only be handled by the notified nearest volunteer' });
    }

    const vol = await Volunteer.findById(volunteerId).select('name contact email isAvailable');
    if (!vol) {
      return res.status(404).json({ error: 'Volunteer not found' });
    }

    const updated = await HelpRequest.findByIdAndUpdate(
      req.params.id,
      {
        assignedTo: volunteerId,
        status: 'assigned',
        assignedAt: new Date(),
        claimedBy: {
          name: vol.name || 'Volunteer',
          contact: vol.contact || ''
        }
      },
      { new: true }
    ).populate('assignedTo', 'name email');

    await Volunteer.findByIdAndUpdate(volunteerId, { $set: { isAvailable: false } });

    const user = await User.findById(updated.createdBy);
    try {
      if (user) {
        await Notification.create({
          userId: updated.createdBy,
          requestId: updated._id,
          type: 'assigned',
          title: 'Request Claimed',
          message: `Volunteer ${vol.name || 'a volunteer'} has accepted the request.`
        });
        await sendAssignmentEmail(user, vol, 'Your SOS was accepted by a volunteer');
      }
    } catch (notificationErr) {
      console.error('Claim notification error:', notificationErr);
    }

    const io = req.app.get('io');
    if (io) {
      io.emit('requestClaimed', updated);
      io.emit('requestAssigned', updated);
    }

    return res.json(updated);
  } catch (err) {
    console.error('Claim error:', err);
    return res.status(500).json({ error: 'Failed to claim request' });
  }
};


/* =========================
   RESOLVE REQUEST
========================= */
exports.resolveRequest = async (req, res) => {
  try {
    const reqDoc = await HelpRequest.findById(req.params.id);
    if (!reqDoc) {
      return res.status(404).json({ error: 'Request not found' });
    }

    if (!reqDoc.assignedTo || reqDoc.assignedTo.toString() !== req.user.id.toString()) {
      return res.status(403).json({ error: 'Only the assigned volunteer can resolve this request' });
    }

    const updated = await HelpRequest.findByIdAndUpdate(
      req.params.id,
      {
        status: 'resolved',
        handledBy: req.user.id
      },
      { new: true }
    ).populate('assignedTo', 'name email');

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

    console.log('📍 Getting volunteer location for request:', requestId);

    // Find the request
    const request = await HelpRequest.findById(requestId)
      .populate('assignedTo', 'name location profilePhoto');

    if (!request) {
      console.warn('⚠️ Request not found:', requestId);
      return res.status(404).json({ error: 'Request not found' });
    }

    if (!request.assignedTo) {
      console.warn('⚠️ No volunteer assigned to request:', requestId);
      return res.status(400).json({ error: 'No volunteer assigned to this request' });
    }

    const volunteer = request.assignedTo;

    const requestLiveLocation = (
      request.liveLocation &&
      Array.isArray(request.liveLocation.coordinates) &&
      request.liveLocation.coordinates.length === 2 &&
      request.liveLocation.updatedAt
    ) ? {
      latitude: request.liveLocation.coordinates[1],
      longitude: request.liveLocation.coordinates[0],
      updatedAt: request.liveLocation.updatedAt
    } : null;

    const requestLiveLocationAgeMs = requestLiveLocation?.updatedAt
      ? Date.now() - new Date(requestLiveLocation.updatedAt).getTime()
      : Infinity;
    const isRequestLiveLocationFresh = requestLiveLocationAgeMs >= 0 && requestLiveLocationAgeMs <= REQUEST_LIVE_LOCATION_MAX_AGE_MS;

    // Extract volunteer location
    let latitude = null;
    let longitude = null;

    if (volunteer.location && volunteer.location.coordinates && volunteer.location.coordinates.length === 2) {
      [longitude, latitude] = volunteer.location.coordinates;
    }

    console.log('✅ Volunteer location retrieved:', {
      volunteerId: volunteer._id,
      volunteerName: volunteer.name,
      coordinates: { latitude, longitude }
    });

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
      userLiveLocation: isRequestLiveLocationFresh ? requestLiveLocation : null
    });

    console.log('👤 Returning user live location in response:', {
      hasLiveLocation: !!requestLiveLocation,
      isFresh: isRequestLiveLocationFresh,
      ageMs: Number.isFinite(requestLiveLocationAgeMs) ? requestLiveLocationAgeMs : null,
      coords: requestLiveLocation ? [requestLiveLocation.coordinates[0], requestLiveLocation.coordinates[1]] : null
    });

  } catch (err) {
    console.error('❌ Get volunteer location error:', err);
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
    console.log('👤 User live location update:', { requestId: id, latitude, longitude });

    const request = await HelpRequest.findOne({
      _id: id,
      createdBy: req.user.id,
      status: { $ne: 'resolved' }
    });

    if (!request) {
        console.warn('❌ Active request not found for user');
      return res.status(404).json({ error: 'Active request not found for this user' });
    }

    request.liveLocation = {
      coordinates: [longitude, latitude],
      updatedAt: new Date()
    };

    await request.save();
  console.log('✅ User location saved:', { coordinates: [longitude, latitude] });

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
      console.error('❌ Update request live location error:', err);
    res.status(500).json({ error: err.message });
  }
};