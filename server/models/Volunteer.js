const mongoose = require('mongoose');
const VolunteerSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  contact: String,
  role: { type: String, default: 'volunteer' },
  verified: { type: Boolean, default: false },
  // Preferred verification flag (legacy 'verified' retained)
  isVerified: { type: Boolean, default: false },
  // Availability flag: volunteers are offline by default until they opt-in
  isAvailable: { type: Boolean, default: false },
  otp: String,
otpExpire: Date
}, { timestamps: true });

// Keep isVerified in sync with legacy verified when not explicitly set
VolunteerSchema.pre('save', function(next) {
  if (this.isVerified === undefined) {
    if (typeof this.verified === 'boolean') {
      this.isVerified = this.verified;
    }
  }
  next();
});

module.exports = mongoose.model('Volunteer', VolunteerSchema);
