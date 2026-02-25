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
await sendVolunteerAssignmentEmail(vol, updated);

// 🔔 Create notification for the user
console.log("Before notification create");


await Notification.create({
  userId: updated.createdBy,
  requestId: updated._id,
  type: "assigned",
  title: "Request Assigned",
  message: `Volunteer ${vol.name} has been assigned to your request.`,
});
console.log("After notification create");
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