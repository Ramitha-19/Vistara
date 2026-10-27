const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: [
        'visit_request',
        'visit_approved',
        'visit_rejected',
        'visitor_arrived',
        'overstay_alert',
        'checkout_requested',
        'checkout_approved',
        'checkout_rejected',
        'system',
      ],
      default: 'system',
    },
    visit: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Visit',
    },
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Notification', notificationSchema);
