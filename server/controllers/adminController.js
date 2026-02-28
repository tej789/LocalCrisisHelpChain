const NGO = require("../models/NGO");
const Volunteer = require("../models/Volunteer");
const asyncHandler = require("express-async-handler");
const AppError = require("../utils/AppError");

/* =========================
   GET PENDING NGOS
========================= */
exports.getPendingNGOs = asyncHandler(async (req, res) => {
  const ngos = await NGO.find({ verified: false, isDeleted: false }).select("-password");

  res.status(200).json({
    success: true,
    count: ngos.length,
    data: ngos
  });
});

/* =========================
   GET PENDING VOLUNTEERS
========================= */
exports.getPendingVolunteers = asyncHandler(async (req, res) => {
  const volunteers = await Volunteer.find({
    verified: false,
    isDeleted: false
  }).select("-password");

  res.status(200).json({
    success: true,
    count: volunteers.length,
    data: volunteers
  });
});

/* =========================
   APPROVE NGO
========================= */
exports.approveNGO = asyncHandler(async (req, res) => {
const ngo = await NGO.findOne({
  _id: req.params.id,
  isDeleted: false
});
  if (!ngo) throw new AppError("NGO not found", 404);

  ngo.verified = true;
  await ngo.save();

  res.status(200).json({
    success: true,
    message: "NGO approved successfully"
  });
});

/* =========================
   APPROVE VOLUNTEER
========================= */
exports.approveVolunteer = asyncHandler(async (req, res) => {
  const volunteer = await Volunteer.findById(req.params.id);

  if (!volunteer) throw new AppError("Volunteer not found", 404);

  volunteer.verified = true;
  await volunteer.save();

  res.status(200).json({
    success: true,
    message: "Volunteer approved successfully"
  });
});

/* =========================
   REJECT NGO
========================= */
exports.rejectNGO = asyncHandler(async (req, res) => {
  const ngo = await NGO.findByIdAndUpdate(
    req.params.id,
    { isDeleted: true },
    { new: true }
  );

  if (!ngo) throw new AppError("NGO not found", 404);

  res.status(200).json({
    success: true,
    message: "NGO soft deleted successfully"
  });
});

/* =========================
   REJECT VOLUNTEER
========================= */
exports.rejectVolunteer = asyncHandler(async (req, res) => {
  const volunteer = await Volunteer.findByIdAndUpdate(
    req.params.id,
    { isDeleted: true },
    { new: true }
  );

  if (!volunteer) throw new AppError("Volunteer not found", 404);

  res.status(200).json({
    success: true,
    message: "Volunteer soft deleted successfully"
  });
});