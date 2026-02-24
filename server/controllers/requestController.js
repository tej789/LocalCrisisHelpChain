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
   GET ALL REQUESTS
========================= */
exports.getRequests = async (req, res) => {
  console.log("ROLE:", req.user.role);
  try {

    let requests = [];

    // 👤 USER
if (req.user.role?.toLowerCase() === "user"){

  // 🔹 My Requests (full data, including contact if needed)
  const myRequests = await HelpRequest.find({
    createdBy: req.user.id
  })
  .populate("assignedTo", "name");

  // 🔹 Community Requests (hide contact + exclude own requests)
  const communityRequests = await HelpRequest.find({
    createdBy: { $ne: req.user.id }
  })
  .select("-contact")
  .populate("assignedTo", "name");

  return res.status(200).json({
    myRequests,
    communityRequests
  });
}

    // 🙋 VOLUNTEER
else if (req.user.role?.toLowerCase() === "volunteer") {

      const { filter } = req.query;

      if (filter === "open") {
        requests = await HelpRequest.find({ status: "open" });
      }

      else if (filter === "assigned") {
        requests = await HelpRequest.find({
          assignedTo: req.user.id
        });
      }

      else if (filter === "resolved") {
        requests = await HelpRequest.find({
          handledBy: req.user.id,
          status: "resolved"
        });
      }

      else {
        requests = await HelpRequest.find({
          assignedTo: req.user.id
        });
      }
    }

    // 👑 ADMIN
    else if (req.user.role === "admin") {
      requests = await HelpRequest.find()
        .populate("assignedTo", "name email");
    }

    // 🏢 NGO (ADD THIS BLOCK)
   else if (req.user.role?.toLowerCase() === "ngo") {
      requests = await HelpRequest.find()
        .populate("assignedTo", "name email");
    }

    res.status(200).json(requests);

  } catch (err) {
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