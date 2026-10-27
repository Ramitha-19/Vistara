const Notification = require('../models/Notification');
const AuditLog = require('../models/AuditLog');

// @desc    Get user notifications
// @route   GET /api/system/notifications
// @access  Private
exports.getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ recipient: req.user._id })
      .sort({ createdAt: -1 })
      .limit(30);

    const unreadCount = await Notification.countDocuments({ recipient: req.user._id, isRead: false });

    res.status(200).json({
      success: true,
      unreadCount,
      notifications,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error retrieving notifications.' });
  }
};

// @desc    Mark notifications as read
// @route   PUT /api/system/notifications/mark-read
// @access  Private
exports.markNotificationsAsRead = async (req, res) => {
  try {
    await Notification.updateMany({ recipient: req.user._id, isRead: false }, { isRead: true });
    res.status(200).json({ success: true, message: 'All notifications marked as read.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error updating notifications.' });
  }
};

// @desc    Get Audit Logs (Admin only)
// @route   GET /api/system/audit-logs
// @access  Private (Admin)
exports.getAuditLogs = async (req, res) => {
  try {
    const logs = await AuditLog.find()
      .populate('performedBy', 'name email role')
      .sort({ createdAt: -1 })
      .limit(100);

    res.status(200).json({
      success: true,
      count: logs.length,
      logs,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error retrieving audit logs.' });
  }
};
