const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { verifyToken, requireRole } = require('../middleware/auth');
const NGO = require('../models/NGO');
const Volunteer = require('../models/Volunteer');
// GET /api/admin/pending
router.get('/pending', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const ngos = await NGO.find({ verified: false, isDeleted: false }).select('-password');
const volunteers = await Volunteer.find({ 
  verified: false, 
  isDeleted: false 
}).select('-password');
    res.json({
      ngos,
      volunteers
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


router.put('/approve-ngo/:id', verifyToken, requireRole('admin'), async (req, res) => {
  try {
   const ngo = await NGO.findByIdAndUpdate(
  req.params.id,
  { verified: true },
  { new: true }
).select('-password');

    if (!ngo) return res.status(404).json({ error: "NGO not found" });

    res.json({ message: "NGO approved successfully", ngo });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router.put('/approve-volunteer/:id', verifyToken, requireRole('admin'), async (req, res) => {
  try {
   const volunteer = await Volunteer.findByIdAndUpdate(
  req.params.id,
  { verified: true, isVerified: true },
  { new: true }
).select('-password');

    if (!volunteer) return res.status(404).json({ error: "Volunteer not found" });

    res.json({ message: "Volunteer approved successfully", volunteer });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router.delete('/reject-ngo/:id', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const ngo = await NGO.findByIdAndUpdate(
  req.params.id,
  { isDeleted: true },
  { new: true }
);
    if (!ngo) return res.status(404).json({ error: "NGO not found" });

    res.json({ message: "NGO rejected and removed" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router.delete('/reject-volunteer/:id', verifyToken, requireRole('admin'), async (req, res) => {
  try {
 const volunteer = await Volunteer.findByIdAndUpdate(
  req.params.id,
  { isDeleted: true },
  { new: true }
);
    if (!volunteer) return res.status(404).json({ error: "Volunteer not found" });

    res.json({ message: "Volunteer rejected and removed" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// GET ALL NGOs & Volunteers
router.get('/all-users', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const ngos = await NGO.find({ isDeleted: false }).select('-password');
const volunteers = await Volunteer.find({ 
  isDeleted: false 
}).select('-password');
    res.json({
      ngos,
      volunteers
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router.put('/restore-ngo/:id', verifyToken, requireRole('admin'), async (req, res) => {
  await NGO.findByIdAndUpdate(req.params.id, { isDeleted: false });
  res.json({ message: "NGO restored successfully" });
});
router.put('/restore-volunteer/:id', verifyToken, requireRole('admin'), async (req, res) => {
  await Volunteer.findByIdAndUpdate(req.params.id, { isDeleted: false });
  res.json({ message: "Volunteer restored successfully" });
});
module.exports = router;