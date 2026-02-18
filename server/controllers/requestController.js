const HelpRequest = require('../models/HelpRequest');
const Volunteer = require('../models/Volunteer');

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
  try {
    const requests = await HelpRequest
      .find()
      .populate('assignedTo', 'name');

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

    const io = req.app.get('io');
    if (io) io.emit('requestResolved', updated);

    res.json(updated);
  } catch (err) {
    console.error("Resolve error:", err);
    res.status(400).json({ error: 'Resolve failed' });
  }
};
