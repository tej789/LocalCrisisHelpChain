const mongoose = require('mongoose');

const RatingSchema = new mongoose.Schema({
  // The request being rated
  requestId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'HelpRequest',
    required: true
  },

  // The volunteer being rated
  volunteerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Volunteer',
    required: true
  },

  // The requester/user giving the rating
  ratedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // Rating score (1-5)
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },

  // Review comment
  comment: {
    type: String,
    trim: true,
    maxlength: 500
  },

  // Rating categories
  categories: {
    responsiveness: {
      type: Number,
      min: 1,
      max: 5
    },
    professionalism: {
      type: Number,
      min: 1,
      max: 5
    },
    helpfulness: {
      type: Number,
      min: 1,
      max: 5
    }
  },

  // Badge for exceptional service
  badges: [{
    type: String,
    enum: ['Excellent Response', 'Very Professional', 'Highly Helpful', 'Trustworthy']
  }],

  // Request details snapshot
  requestDetails: {
    title: { type: String },
    requestType: { type: String },
    urgency: { type: String },
    completionTime: { type: Number } // in minutes
  },

  // Helpful votes (other users can like the review)
  helpfulCount: {
    type: Number,
    default: 0
  },

  // Status
  isPublic: {
    type: Boolean,
    default: true
  },

  createdAt: {
    type: Date,
    default: Date.now
  },

  updatedAt: {
    type: Date,
    default: Date.now
  }

}, { timestamps: true });

// Index for quick lookups
RatingSchema.index({ volunteerId: 1, createdAt: -1 });
RatingSchema.index({ requestId: 1 });
RatingSchema.index({ ratedBy: 1 });

module.exports = mongoose.model('Rating', RatingSchema);
