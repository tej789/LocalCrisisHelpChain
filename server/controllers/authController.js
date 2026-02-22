const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const User = require('../models/User');
const NGO = require('../models/NGO');
const Volunteer = require('../models/Volunteer');

const { generateOTP, sendOtpEmail } = require('../utils/otpService');

/* =========================
   REGISTER
========================= */
exports.register = async (req, res) => {
  try {
    const { name, email, password, contact, role } = req.body;

    const normalizedRole = role || 'user';
    if (!['user', 'ngo', 'volunteer'].includes(normalizedRole))
      return res.status(400).json({ error: 'Invalid role' });

    const [u, n, v] = await Promise.all([
      User.findOne({ email }),
      NGO.findOne({ email }),
      Volunteer.findOne({ email })
    ]);

    if (u || n || v)
      return res.status(400).json({ error: 'Email already in use' });

    const hashed = await bcrypt.hash(password, 10);

    /* USER */
    if (normalizedRole === 'user') {
      const otp = generateOTP();

      const user = new User({
        name,
        email,
        password: hashed,
        contact,
        role: 'user',
        verified: false,
        otp,
        otpExpire: Date.now() + 5 * 60 * 1000
      });

      await user.save();
      await sendOtpEmail(email, otp);

      return res.status(201).json({
        message: 'User registered. OTP sent.'
      });
    }

    /* NGO */
    if (normalizedRole === 'ngo') {
      const ngo = new NGO({
        name,
        email,
        password: hashed,
        contact,
        role: 'ngo',
        verified: false
      });

      await ngo.save();
      return res.status(201).json({
        message: 'NGO pending verification'
      });
    }

    /* VOLUNTEER */
    const vol = new Volunteer({
      name,
      email,
      password: hashed,
      contact,
      role: 'volunteer',
      verified: false
    });

    await vol.save();
    return res.status(201).json({
      message: 'Volunteer pending verification'
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


/* =========================
   LOGIN
========================= */
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    let account =
      await User.findOne({ email }) ||
      await NGO.findOne({ email }) ||
      await Volunteer.findOne({ email });

    if (!account)
      return res.status(400).json({ error: 'Invalid credentials' });

    const match = await bcrypt.compare(password, account.password);
    if (!match)
      return res.status(400).json({ error: 'Invalid credentials' });

    const role = account.role;

    if ((role === 'ngo' || role === 'volunteer') && !account.verified)
      return res.status(403).json({ error: 'Account pending verification' });

    if (role === 'user' && !account.verified)
      return res.status(403).json({ error: 'Verify email first' });

    const token = jwt.sign(
      { userId: account._id, role },
      process.env.JWT_SECRET || 'secretkey',
      { expiresIn: '7d' }
    );

    res.json({
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

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
/////////////
exports.verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    const user = await User.findOne({ email });
    if (!user)
      return res.status(400).json({ error: "User not found" });

    if (user.otp != otp)
      return res.status(400).json({ error: "Invalid OTP" });

    user.verified = true;
    user.otp = null;
    user.otpExpire = null;

    await user.save();

    res.json({ message: "OTP verified successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
/////////
exports.resendOtp = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user)
      return res.status(400).json({ error: "User not found" });

    const otp = generateOTP();

    user.otp = otp;
    user.otpExpire = Date.now() + 5 * 60 * 1000;

    await user.save();
    await sendOtpEmail(email, otp);

    res.json({ message: "OTP resent successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    let account =
      await User.findOne({ email }) ||
      await NGO.findOne({ email }) ||
      await Volunteer.findOne({ email });

    if (!account)
      return res.status(400).json({ error: "Email not found" });

    const otp = generateOTP();

    account.otp = otp;
    account.otpExpire = Date.now() + 5 * 60 * 1000;

    await account.save();
    await sendOtpEmail(email, otp, true);

    res.json({ message: "Password reset OTP sent" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
exports.resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    let account =
      await User.findOne({ email }) ||
      await NGO.findOne({ email }) ||
      await Volunteer.findOne({ email });

    if (!account || account.otp != otp)
      return res.status(400).json({ error: "Invalid OTP" });

    if (account.otpExpire < Date.now())
      return res.status(400).json({ error: "OTP expired" });

    const hashed = await bcrypt.hash(newPassword, 10);

    account.password = hashed;
    account.otp = null;
    account.otpExpire = null;

    await account.save();

    res.json({ message: "Password reset successful" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  register: exports.register,
  login: exports.login,
  verifyOtp: exports.verifyOtp,
  resendOtp: exports.resendOtp,
  forgotPassword: exports.forgotPassword,
  resetPassword: exports.resetPassword
};

