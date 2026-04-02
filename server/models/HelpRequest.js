const mongoose = require('mongoose');

const HelpRequestSchema = new mongoose.Schema({
  title: { type: String },
  name: { type: String, required: true },
  contact: { type: String, required: true },
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], required: true }, // [longitude, latitude]
    address: { type: String }
  },
  // Optional live location for the requester (user) so that
  // volunteers can see the request move in real time without
  // losing the original static location/address.
  liveLocation: {
    coordinates: { type: [Number] }, // [longitude, latitude]
    updatedAt: { type: Date }
  },
  type: { type: String, required: true }, // e.g., food, medicine, shelter, rescue
  urgency: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  description: { type: String },
  status: { type: String, enum: ['open', 'assigned', 'resolved'], default: 'open' },
  assignedAt: { type: Date },
  claimedBy: {
    name: { type: String },
    contact: { type: String }
  },
  createdAt: { type: Date, default: Date.now },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Volunteer' },
  handledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Volunteer' }
}, { timestamps: { createdAt: false, updatedAt: 'updatedAt' } });

HelpRequestSchema.index({ location: '2dsphere' }); // already exists
HelpRequestSchema.index({ status: 1 });
HelpRequestSchema.index({ urgency: 1 });
HelpRequestSchema.index({ type: 1 });
HelpRequestSchema.index({ createdAt: -1 });
module.exports = mongoose.model('HelpRequest', HelpRequestSchema); 
