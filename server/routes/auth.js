const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const NGO = require('../models/NGO');
const Volunteer = require('../models/Volunteer');
const { generateOTP, sendOtpEmail } = require('../utils/otpService');


// POST /auth/register
router.post('/register', async (req, res) => {
  try {
    console.log("REGISTER API HIT");

    const { name, email, password, contact, role } = req.body;
    const normalizedRole = role || 'user';
    if (!['user', 'ngo', 'volunteer'].includes(normalizedRole)) {
      return res.status(400).json({ error: 'Invalid role' });
    }
    if (normalizedRole === 'admin') return res.status(403).json({ error: 'Cannot register as admin' });

    // Check duplicates across all relevant collections
    const [existingUser, existingNgo, existingVolunteer] = await Promise.all([
      User.findOne({ email }),
      NGO.findOne({ email }),
      Volunteer.findOne({ email })
    ]);
    if (existingUser || existingNgo || existingVolunteer) {
      return res.status(400).json({ error: 'Email already in use' });
    }

    const hashed = await bcrypt.hash(password, 10);
    if (normalizedRole === 'user') {

      const otp = generateOTP();
    
      const user = new User({
        name,
        email,
        password: hashed,
        contact,
        role: 'user',
        verified: false,
        otp: otp,
        otpExpire: Date.now() + 5 * 60 * 1000
      });
    
      await user.save();
    
      await sendOtpEmail(email, otp);
    
      return res.status(201).json({
        message: 'User registered. OTP sent to email.'
      });
    }
    
    if (normalizedRole === 'ngo') {
      const ngoDoc = new NGO({ name, email, password: hashed, contact, role: 'ngo', verified: false });
      await ngoDoc.save();
      return res.status(201).json({ message: 'NGO account created - pending verification' });
    }
    if (normalizedRole === 'volunteer') {
      const volDoc = new Volunteer({ name, email, password: hashed, contact, role: 'volunteer', verified: false });
      await volDoc.save();
      return res.status(201).json({ message: 'Volunteer account created - pending verification' });
    }
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    // Try to find in all collections
    let account = await User.findOne({ email });
    let source = 'user';
    if (!account) { account = await NGO.findOne({ email }); source = account ? 'ngo' : source; }
    if (!account) { account = await Volunteer.findOne({ email }); source = account ? 'volunteer' : source; }
    if (!account) return res.status(400).json({ error: 'Invalid credentials' });

    // Enforce verification for NGO/Volunteer
    if ((source === 'ngo' || source === 'volunteer') && !account.verified) {
      return res.status(403).json({ error: 'Account pending admin verification' });
    }

    const match = await bcrypt.compare(password, account.password);
    if (!match) return res.status(400).json({ error: 'Invalid credentials' });

    // Require verification for users
if (source === 'user' && !account.verified) {
  return res.status(403).json({ error: 'Please verify email first' });
}


    const payload = { userId: account._id, role: source };
    const token = jwt.sign(payload, process.env.JWT_SECRET || 'secretkey', { expiresIn: '7d' });
    return res.json({
      token,
      user: {
        id: account._id,
        name: account.name,
        email: account.email,
        role: source,
    
     
        verified: account.verified,
        isVerified: account.isVerified,
        isAvailable: account.isAvailable
      }
    });
    
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /auth/verify-otp
router.post('/verify-otp', async (req, res) => {
  console.log("VERIFY ROUTE HIT");
  console.log("VERIFY BODY:", req.body);
  try {

    console.log("VERIFY BODY:", req.body);
    const email = req.body.email;
    const otp = req.body.otp;

    console.log("BODY:", req.body);

    const user = await User.findOne({ email });

    console.log("USER FOUND:", user);

    if (!user) {
      return res.status(400).json({ error: "User not found" });
    }

    console.log("OTP DB:", user.otp);
    console.log("OTP INPUT:", otp);

    if (user.otp != otp) {
      return res.status(400).json({ error: "Invalid OTP" });
    }

    user.verified = true;
    user.otp = null;
    user.otpExpire = null;

    await user.save();

    res.json({ message: "OTP Verified Successfully" });

  } catch (err) {
    console.log(err);
    res.status(500).json({ error: err.message });
  }
});

// POST /auth/resend-otp
router.post('/resend-otp', async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ error: "User not found" });
    }

    if (user.verified) {
      return res.status(400).json({ error: "User already verified" });
    }

    const otp = generateOTP();

    user.otp = otp;
    user.otpExpire = Date.now() + 5 * 60 * 1000;

    await user.save();

    await sendOtpEmail(email, otp);

    res.json({ message: "OTP resent successfully" });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// POST /auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    let account =
      await User.findOne({ email }) ||
      await NGO.findOne({ email }) ||
      await Volunteer.findOne({ email });

    if (!account) {
      return res.status(400).json({ error: "Email not found" });
    }

    const otp = generateOTP();

    account.otp = otp;
    account.otpExpire = Date.now() + 5 * 60 * 1000;

    await account.save();

    await sendOtpEmail(email, otp, true);

    res.json({ message: "Password reset OTP sent" });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


router.post('/reset-password', async (req, res) => {
  try {
    console.log("RESET BODY:", req.body);

    const { email, otp, newPassword } = req.body;

    let account =
      await User.findOne({ email }) ||
      await NGO.findOne({ email }) ||
      await Volunteer.findOne({ email });

    console.log("ACCOUNT FOUND:", account);
    console.log("DB OTP:", account?.otp);
    console.log("INPUT OTP:", otp);

    if (!account || account.otp != otp) {
      return res.status(400).json({ error: "Invalid OTP" });
    }

    if (account.otpExpire < Date.now()) {
      return res.status(400).json({ error: "OTP expired" });
    }

    const hashed = await bcrypt.hash(newPassword, 10);

    account.password = hashed;
    account.otp = null;
    account.otpExpire = null;

    await account.save();

    res.json({ message: "Password reset successful" });

  } catch (err) {
    console.log("RESET ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});


module.exports = router;