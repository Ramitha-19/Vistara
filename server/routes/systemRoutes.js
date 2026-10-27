const express = require('express');
const router = express.Router();
const {
  getNotifications,
  markNotificationsAsRead,
  getAuditLogs,
} = require('../controllers/systemController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.get('/notifications', getNotifications);
router.put('/notifications/mark-read', markNotificationsAsRead);
router.get('/audit-logs', authorize('admin'), getAuditLogs);

module.exports = router;
