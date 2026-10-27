const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const {
  registerVisit,
  getVisitStatusByReference,
  approveVisit,
  rejectVisit,
  verifyScan,
  checkIn,
  checkOut,
  requestCheckout,
  getCheckoutRequests,
  approveCheckout,
  rejectCheckout,
  getVisits,
  getVisitorHistory,
  getOverstays,
  getVisitById,
} = require('../controllers/visitController');
const { protect, authorize } = require('../middleware/auth');

// Optional protect middleware for registration (allows public visitors as well as logged in staff/receptionists)
const optionalAuth = (req, res, next) => {
  const jwt = require('jsonwebtoken');
  const User = require('../models/User');
  let token = (req.cookies && req.cookies.vistara_token) || (req.headers.authorization && req.headers.authorization.split(' ')[1]);
  if (!token) return next();
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'vistara_secret_key');
    User.findById(decoded.id).select('-password').then((user) => {
      if (user) req.user = user;
      next();
    }).catch(() => next());
  } catch (e) {
    next();
  }
};

const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  message: { success: false, message: 'Too many registration requests. Please try again later.' },
});

// Public endpoints
router.post('/register', registerLimiter, optionalAuth, registerVisit);
router.get('/status/:ref', getVisitStatusByReference);

// Public or logged-in checkout request for visitor pass portal
router.post('/:id/request-checkout-public', optionalAuth, requestCheckout);

// Protected endpoints
router.use(protect);

// Admin-Only Visitor History (Strictly forbidden for security, reception, staff, hr)
router.get('/history', authorize('admin'), getVisitorHistory);

router.get('/', getVisits);
router.get('/overstays', getOverstays);
router.get('/checkout-requests', authorize('security', 'admin'), getCheckoutRequests);
router.get('/:id', getVisitById);
router.put('/:id/approve', authorize('admin', 'host', 'staff', 'hr'), approveVisit);
router.put('/:id/reject', authorize('admin', 'host', 'staff', 'hr'), rejectVisit);
router.post('/verify-scan', authorize('admin', 'receptionist', 'security'), verifyScan);
router.post('/:id/check-in', authorize('admin', 'receptionist', 'security'), checkIn);

// Checkout Request Workflow
router.post('/:id/request-checkout', requestCheckout); // Requester: Host, Staff, Receptionist, HR, Admin
router.post('/:id/approve-checkout', authorize('security'), approveCheckout); // Security ONLY!
router.post('/:id/reject-checkout', authorize('security'), rejectCheckout); // Security ONLY!
router.post('/:id/check-out', authorize('security'), checkOut); // Security ONLY!

// Admin End-of-Day Cleanup trigger endpoint
router.post('/trigger-eod-cleanup', authorize('admin'), async (req, res) => {
  const { performEodCleanup } = require('../services/eodCleanupService');
  const result = await performEodCleanup(true); // force cleanup
  res.status(200).json({ success: true, message: 'End-of-day active list cleanup executed successfully.', result });
});

module.exports = router;
