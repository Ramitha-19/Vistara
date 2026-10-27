const express = require('express');
const router = express.Router();
const {
  getAvailableHosts,
  getAllUsers,
  createUser,
  updateUser,
  getSystemConfig,
  updateSystemConfig,
} = require('../controllers/userController');
const { protect, authorize } = require('../middleware/auth');

// Public route to view hosts for registration
router.get('/hosts', getAvailableHosts);

// Protected routes
router.use(protect);

router.get('/config', getSystemConfig);
router.put('/config', authorize('admin'), updateSystemConfig);

router.get('/', authorize('admin'), getAllUsers);
router.post('/', authorize('admin'), createUser);
router.put('/:id', authorize('admin'), updateUser);

module.exports = router;
