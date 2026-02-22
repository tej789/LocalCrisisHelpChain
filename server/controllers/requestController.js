const HelpRequest = require('../models/HelpRequest');
const Volunteer = require('../models/Volunteer');
const User = require('../models/User');
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
/* =========================
   GET ALL REQUESTS
========================= */
exports.getRequests = async (req, res) => {
  try {

    let requests;

    // 👤 USER (only their own requests, hide contact)
    if (req.user.role === "user") {
      requests = await HelpRequest.find({
        createdBy: req.user.id
      }).select("-contact");
    }

    // 🙋 VOLUNTEER (filter-based)
    else if (req.user.role === "volunteer") {

      const { filter } = req.query;

      // 🔵 Open requests (can claim)
      if (filter === "open") {
        requests = await HelpRequest.find({
          status: "open"
        });
      }

      // 🟢 Assigned to this volunteer
      else if (filter === "assigned") {
        requests = await HelpRequest.find({
          assignedTo: req.user.id
        });
      }

      // 🟣 Resolved by this volunteer
      else if (filter === "resolved") {
        requests = await HelpRequest.find({
          handledBy: req.user.id,
          status: "resolved"
        });
      }

      // 🔹 Default view = assigned
      else {
        requests = await HelpRequest.find({
          assignedTo: req.user.id
        });
      }
    }

    // 👑 ADMIN (see everything)
    else if (req.user.role === "admin") {
      requests = await HelpRequest.find()
        .populate("assignedTo", "name email");
    }

    res.json(requests);

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