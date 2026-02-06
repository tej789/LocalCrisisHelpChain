const mongoose = require('mongoose');
const NGOSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  contact: String,
  role: { type: String, default: 'ngo' },
  verified: { type: Boolean, default: false },
  otp: String,
  otpExpire: Date
}, { timestamps: true });
module.exports = mongoose.model('NGO', NGOSchema);





