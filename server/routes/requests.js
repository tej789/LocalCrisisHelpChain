const express = require('express');
const router = express.Router();
const HelpRequest = require('../models/HelpRequest');
const Volunteer = require('../models/Volunteer');
const { verifyToken, requireRole } = require('../middleware/auth');

// Create a new help request
router.post('/', verifyToken, requireRole('user'), async (req, res) => {
  try {
    const helpRequest = new HelpRequest({ ...req.body, createdBy: req.user.userId });
    await helpRequest.save();
    // Emit Socket.IO event for new request
    const io = req.app.get('io');
    if (io) {
      io.emit('newRequest', helpRequest);
    }
    res.status(201).json(helpRequest);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get all help requests
router.get('/', verifyToken, async (req, res) => {
  try {
    const requests = await HelpRequest.find().populate('assignedTo', 'name');
    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Claim a help request
router.post('/:id/claim', verifyToken, requireRole('ngo'), async (req, res) => {
  try {
    const { name, contact } = req.body;
    let helpRequest = await HelpRequest.findByIdAndUpdate(
      req.params.id,
      { status: 'assigned', claimedBy: { name, contact } },
      { new: true }
    );
    if (!helpRequest) return res.status(404).json({ error: 'Request not found' });
    // Populate assignedTo if present
    helpRequest = await helpRequest.populate('assignedTo', 'name');
    // Emit Socket.IO event
    const io = req.app.get('io');
    if (io) { io.emit('requestClaimed', helpRequest); io.emit('requestAssigned', helpRequest); }
    res.json(helpRequest);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});


// Volunteer self-claim a help request (new)
router.post('/:id/claim/self', verifyToken, requireRole('volunteer'), async (req, res) => {
  try {
    let helpRequest = await HelpRequest.findByIdAndUpdate(
      req.params.id,
      { status: 'assigned', assignedTo: req.user.userId },
      { new: true }
    );
    if (!helpRequest) return res.status(404).json({ error: 'Request not found' });
    helpRequest = await helpRequest.populate('assignedTo', 'name');
    const io = req.app.get('io');
    if (io) io.emit('requestAssigned', helpRequest);
    res.json(helpRequest);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// NGO assigns a volunteer explicitly (new)
router.post('/:id/assign', verifyToken, requireRole('ngo'), async (req, res) => {
  try {
    const { volunteerId } = req.body;
    if (!volunteerId) return res.status(400).json({ error: 'volunteerId is required' });
    let helpRequest = await HelpRequest.findByIdAndUpdate(
      req.params.id,
      { status: 'assigned', assignedTo: volunteerId },
      { new: true }
    );
    if (!helpRequest) return res.status(404).json({ error: 'Request not found' });
    helpRequest = await helpRequest.populate('assignedTo', 'name');
    const io = req.app.get('io');
    if (io) io.emit('requestAssigned', helpRequest);
    res.json(helpRequest);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PUT /api/requests/:id/assign
// Assign an open request to a VERIFIED volunteer. Access: NGO only.
// Validations:
//  - volunteerId required
//  - request must exist and not already assigned/resolved
//  - volunteer must exist and be verified (isVerified === true OR (isVerified missing AND verified === true))
// Business logic:
//  - set assignedTo, status='assigned', assignedAt=now
router.put('/:id/assign', verifyToken, requireRole('ngo'), async (req, res) => {
  try {
    const { volunteerId } = req.body || {};
    if (!volunteerId) return res.status(400).json({ error: 'volunteerId is required' });

    // Load request and validate current status
    const reqDoc = await HelpRequest.findById(req.params.id);
    if (!reqDoc) return res.status(404).json({ error: 'Request not found' });
    if (reqDoc.status === 'assigned' || reqDoc.status === 'resolved') {
      return res.status(400).json({ error: 'Request is not assignable in current state' });
    }

    // Load volunteer and validate verification (backward compatible)
const vol = await Volunteer.findById(volunteerId);
    if (!vol) return res.status(404).json({ error: 'Volunteer not found' });
    const isVerified = vol.isVerified === true || (vol.isVerified === undefined && vol.verified === true);
    if (!isVerified) return res.status(400).json({ error: 'Volunteer not verified' });

    // Apply assignment
    let updated = await HelpRequest.findByIdAndUpdate(
      req.params.id,
      { $set: { assignedTo: volunteerId, status: 'assigned', assignedAt: new Date() } },
      { new: true }
    ).populate('assignedTo', 'name email');

    // Should not happen but guard
    if (!updated) return res.status(404).json({ error: 'Request not found' });

    // Emit Socket.IO events (additive, optional)
    const io = req.app.get('io');
    if (io) {
      const payload = {
        requestId: updated._id.toString(),
        status: updated.status,
        assignedTo: updated.assignedTo ? {
          _id: (updated.assignedTo._id || updated.assignedTo).toString(),
          name: updated.assignedTo.name,
          email: updated.assignedTo.email,
        } : undefined,
      };
      // Broadcast to all NGOs
      io.to('role:ngo').emit('request:assigned', payload);
      // Notify specific volunteer by user room
      const volunteerId = payload.assignedTo?._id;
      if (volunteerId) io.to(`user:${volunteerId}`).emit('request:assigned', payload);
      // Preserve legacy event name for existing listeners
      io.emit('requestAssigned', updated);
    }

    return res.status(200).json(updated);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to assign request' });
  }
});
// Resolve a help request
router.post('/:id/resolve', verifyToken, requireRole('volunteer'), async (req, res) => {
  try {
    const helpRequest = await HelpRequest.findByIdAndUpdate(
      req.params.id,
      { status: 'resolved', handledBy: req.user.userId },
      { new: true }
    );
    if (!helpRequest) return res.status(404).json({ error: 'Request not found' });
    // Emit Socket.IO event
    const io = req.app.get('io');
    if (io) io.emit('requestResolved', helpRequest);
    res.json(helpRequest);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
