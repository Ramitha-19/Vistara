const mongoose = require('mongoose');

const visitSchema = new mongoose.Schema(
  {
    referenceNumber: {
      type: String,
      unique: true,
      required: true,
      index: true,
    },
    // Visitor Details
    visitorName: {
      type: String,
      required: [true, 'Visitor name is required'],
      trim: true,
    },
    visitorEmail: {
      type: String,
      trim: true,
      lowercase: true,
      default: '',
    },
    visitorPhone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
    },
    organization: {
      type: String,
      required: [true, 'Organization is required'],
      trim: true,
    },
    purpose: {
      type: String,
      required: [true, 'Purpose of visit is required'],
      trim: true,
    },
    idProofType: {
      type: String,
      enum: ['National ID', 'Passport', 'Driving License', 'Company ID', 'Other'],
      default: 'Company ID',
    },
    idProofNumber: {
      type: String,
      default: '',
    },

    // Host Details
    host: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Host employee is required'],
    },

    // Scheduled Visit Times
    visitDate: {
      type: String, // YYYY-MM-DD
      required: [true, 'Visit date is required'],
    },
    expectedArrival: {
      type: String, // HH:mm
      required: [true, 'Expected arrival time is required'],
    },
    expectedDeparture: {
      type: String, // HH:mm
      required: [true, 'Expected departure time is required'],
    },

    // Workflow Status
    status: {
      type: String,
      enum: ['Pending', 'Approved', 'Rejected', 'CheckedIn', 'CheckedOut', 'Cancelled'],
      default: 'Pending',
      index: true,
    },
    rejectionReason: {
      type: String,
      default: '',
    },
    approvedAt: {
      type: Date,
    },
    rejectedAt: {
      type: Date,
    },

    // QR Token Metadata
    qrToken: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
    qrExpiresAt: {
      type: Date,
    },
    isQrRevoked: {
      type: Boolean,
      default: false,
    },

    // Real Entry / Exit Execution
    actualCheckInTime: {
      type: Date,
    },
    actualCheckOutTime: {
      type: Date,
    },
    checkedInBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    checkedOutBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    // Security-Controlled Checkout Request Workflow
    checkoutRequest: {
      status: {
        type: String,
        enum: ['None', 'Pending', 'Approved', 'Rejected'],
        default: 'None',
        index: true,
      },
      requestedAt: {
        type: Date,
      },
      requestedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      requesterName: {
        type: String,
        default: '',
      },
      rejectionReason: {
        type: String,
        default: '',
      },
      rejectedAt: {
        type: Date,
      },
    },

    // Overstay Flags
    isOverdue: {
      type: Boolean,
      default: false,
    },
    overdueMinutes: {
      type: Number,
      default: 0,
    },
    notes: {
      type: String,
      default: '',
    },
    // End-of-Day Cleanup: Soft cleanup from active list while strictly preserving complete record for reports
    isArchivedFromActiveList: {
      type: Boolean,
      default: false,
      index: true,
    },
    archivedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Visit', visitSchema);
