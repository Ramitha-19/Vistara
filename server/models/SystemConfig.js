const mongoose = require('mongoose');

const systemConfigSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      unique: true,
      required: true,
      default: 'main_config',
    },
    overstayGracePeriodMinutes: {
      type: Number,
      default: 15,
      min: 0,
    },
    companyName: {
      type: String,
      default: 'Vistara Enterprises',
    },
    requireApprovalForWalkins: {
      type: Boolean,
      default: false,
    },
    timezone: {
      type: String,
      default: 'Asia/Kolkata',
    },
    eodCleanupHour: {
      type: Number,
      default: 23, // 11:00 PM local time
      min: 0,
      max: 23,
    },
    autoCleanupCompletedVisits: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('SystemConfig', systemConfigSchema);
