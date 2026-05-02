const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    volunteerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Volunteer'
    },
    requestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'HelpRequest',
      required: true
    },
    type: {
      type: String,
      enum: ['assigned', 'resolved', 'sos'],
      required: true
    },
    title: {
      type: String,
      required: true
    },
    message: {
      type: String,
      required: true
    },
    isRead: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

NotificationSchema.pre('validate', function (next) {
  const hasUserRecipient = Boolean(this.userId);
  const hasVolunteerRecipient = Boolean(this.volunteerId);

  if (hasUserRecipient === hasVolunteerRecipient) {
    this.invalidate('userId', 'Notification must target exactly one recipient');
  }

  next();
});

module.exports = mongoose.model('Notification', NotificationSchema);