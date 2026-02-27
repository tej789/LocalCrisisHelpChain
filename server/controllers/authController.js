const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const User = require('../models/User');
const NGO = require('../models/NGO');
const Volunteer = require('../models/Volunteer');

const { generateOTP, sendOtpEmail } = require('../utils/otpService');
const asyncHandler = require("express-async-handler");
const AppError = require("../utils/AppError");
/* =========================
   REGISTER
========================= */
exports.register = asyncHandler(async (req, res) => {

  const { name, email, password, contact, role } = req.body;

  const normalizedRole = role || "user";

if (!["user", "ngo", "volunteer", "admin"].includes(normalizedRole))    throw new AppError("Invalid role", 400);

  const [u, n, v] = await Promise.all([
    User.findOne({ email }),
    NGO.findOne({ email }),
    Volunteer.findOne({ email })
  ]);

  if (u || n || v)
    throw new AppError("Email already in use", 400);

  const hashed = await bcrypt.hash(password, 10);

  /* USER */
  if (normalizedRole === "user") {
    const otp = generateOTP();

    const user = new User({
      name,
      email,
      password: hashed,
      contact,
      role: "user",
      verified: false,
      otp,
      otpExpire: Date.now() + 5 * 60 * 1000
    });

    await user.save();
    await sendOtpEmail(email, otp);

    return res.status(201).json({
      success: true,
      message: "User registered. OTP sent."
    });
  }
/* ADMIN */
if (normalizedRole === "admin") {
  const admin = new User({
    name,
    email,
    password: hashed,
    contact,
    role: "admin",
    verified: true
  });

  await admin.save();

  return res.status(201).json({
    success: true,
    message: "Admin created successfully"
  });
}
  /* NGO */
  if (normalizedRole === "ngo") {
    const ngo = new NGO({
      name,
      email,
      password: hashed,
      contact,
      role: "ngo",
      verified: false
    });

    await ngo.save();

    return res.status(201).json({
      success: true,
      message: "NGO pending verification"
    });
  }

  /* VOLUNTEER */
  const vol = new Volunteer({
    name,
    email,
    password: hashed,
    contact,
    role: "volunteer",
    verified: false
  });

  await vol.save();

  return res.status(201).json({
    success: true,
    message: "Volunteer pending verification"
  });

});


/* =========================
   LOGIN
========================= */
exports.login = asyncHandler(async (req, res) => {

  const { email, password } = req.body;
  let account =
    await User.findOne({ email }) ||
    await NGO.findOne({ email }) ||
    await Volunteer.findOne({ email });

  if (!account)
    throw new AppError("Invalid credentials", 400);

  const match = await bcrypt.compare(password, account.password);

  if (!match)
    throw new AppError("Invalid credentials", 400);

  const role = account.role;

  if ((role === "ngo" || role === "volunteer") && !account.verified)
    throw new AppError("Account pending verification", 403);

  if (role === "user" && !account.verified)
    throw new AppError("Verify email first", 403);

  const token = jwt.sign(
  { userId: account._id, role },
  process.env.JWT_SECRET || "secretkey",
  { expiresIn: "7d" }
);

  res.status(200).json({
    success: true,
    token,
    user: {
      id: account._id,
      name: account.name,
      email: account.email,
      role,
      contact: account.contact,
      verified: account.verified,
      isVerified: account.isVerified,
      isAvailable: account.isAvailable
    }
  });

});
/////////////
exports.verifyOtp = asyncHandler(async (req, res) => {

  const { email, otp } = req.body;

  const user = await User.findOne({ email });

  if (!user)
    throw new AppError("User not found", 400);
if (user.otp !== otp)
  throw new AppError("Invalid OTP", 400);

if (user.otpExpire < Date.now())
  throw new AppError("OTP expired", 400);

  user.verified = true;
  user.otp = null;
  user.otpExpire = null;

  await user.save();

  res.status(200).json({
    success: true,
    message: "OTP verified successfully"
  });

});
/////////
exports.resendOtp = asyncHandler(async (req, res) => {

  const { email } = req.body;

  const user = await User.findOne({ email });

  if (!user)
    throw new AppError("User not found", 400);

  const otp = generateOTP();

  user.otp = otp;
  user.otpExpire = Date.now() + 5 * 60 * 1000;

  await user.save();
  await sendOtpEmail(email, otp);

  res.status(200).json({
    success: true,
    message: "OTP resent successfully"
  });

});
exports.forgotPassword = asyncHandler(async (req, res) => {

  const { email } = req.body;

  let account =
    await User.findOne({ email }) ||
    await NGO.findOne({ email }) ||
    await Volunteer.findOne({ email });

  if (!account)
    throw new AppError("Email not found", 400);

  const otp = generateOTP();

  account.otp = otp;
  account.otpExpire = Date.now() + 5 * 60 * 1000;

  await account.save();
  await sendOtpEmail(email, otp, true);

  res.status(200).json({
    success: true,
    message: "Password reset OTP sent"
  });

});
exports.resetPassword = asyncHandler(async (req, res) => {

  const { email, otp, newPassword } = req.body;

  let account =
    await User.findOne({ email }) ||
    await NGO.findOne({ email }) ||
    await Volunteer.findOne({ email });

  if (!account || account.otp !== otp)
    throw new AppError("Invalid OTP", 400);

  if (account.otpExpire < Date.now())
    throw new AppError("OTP expired", 400);

  const hashed = await bcrypt.hash(newPassword, 10);

  account.password = hashed;
  account.otp = null;
  account.otpExpire = null;

  await account.save();

  res.status(200).json({
    success: true,
    message: "Password reset successful"
  });

});
module.exports = exports;

