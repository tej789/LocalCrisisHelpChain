const mongoose = require('mongoose');

const VolunteerSchema = new mongoose.Schema({
  name: String,
  contact: {
  type: String,
  required: true,
  trim: true
},
  email: { type: String, unique: true },
  password: String,
  role: { type: String, default: 'volunteer' },
  profilePhoto: {
    type: String,
    default: ''
  },

  verified: { type: Boolean, default: false },

  // Preferred verification flag (legacy 'verified' retained)
  isVerified: { type: Boolean, default: false },

  // Availability flag
  isAvailable: { type: Boolean, default: false },
isDeleted: { type: Boolean, default: false },
  // ✅ Location for distance calculation
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      default: [0, 0]
    }
  },

  otp: String,
  otpExpire: Date

}, { timestamps: true });


/* ✅ Geo index */
VolunteerSchema.index({ location: '2dsphere' });

// Keep isVerified in sync with legacy verified
VolunteerSchema.pre('save', function(next) {
  if (this.isVerified === undefined) {
    if (typeof this.verified === 'boolean') {
      this.isVerified = this.verified;
    }
  }
  next();
});

module.exports = mongoose.model('Volunteer', VolunteerSchema);
