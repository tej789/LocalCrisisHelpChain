const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  contact: { type: String },

  role: {
    type: String,
    enum: ['user', 'ngo', 'volunteer', 'admin'],
    default: 'user',
    required: true
  },

  verified: { type: Boolean, default: false },

  // OTP fields
  otp: { type: String },
  otpExpire: { type: Date }

}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);
