const crypto = require('crypto');
const qrcode = require('qrcode');
const Visit = require('../models/Visit');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { logAudit } = require('../utils/auditLogger');
const { checkOverstays } = require('../services/overstayService');

// Helper to generate reference numbers like VST-20261013-ABCD
function generateReferenceNumber() {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomStr = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `VST-${dateStr}-${randomStr}`;
}

// Helper to generate a secure, unguessable QR token
function generateSecureToken() {
  return 'QR_' + crypto.randomBytes(24).toString('hex');
}

// @desc    Register a visit request (Public or Walk-in by Receptionist)
// @route   POST /api/visits/register
// @access  Public (or Receptionist)
exports.registerVisit = async (req, res) => {
  try {
    const {
      visitorName,
      visitorEmail,
      visitorPhone,
      organization,
      purpose,
      idProofType,
      idProofNumber,
      hostId,
      visitDate,
      expectedArrival,
      expectedDeparture,
      isWalkin,
    } = req.body;

    if (!visitorName || !visitorPhone || !organization || !purpose || !hostId || !visitDate || !expectedArrival || !expectedDeparture) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields including Host, Visit Date, Arrival and Departure times.',
      });
    }

    // Validate times (expectedDeparture must be after expectedArrival)
    if (expectedDeparture <= expectedArrival) {
      return res.status(400).json({
        success: false,
        message: 'Expected departure time must be later than expected arrival time.',
      });
    }

    // Verify host exists
    const hostUser = await User.findById(hostId);
    if (!hostUser || !hostUser.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Selected host employee was not found or is currently inactive.',
      });
    }

    const referenceNumber = generateReferenceNumber();

    // Check if created by logged in receptionist as walkin
    let initialStatus = 'Pending';
    let qrToken = undefined;
    let qrExpiresAt = undefined;
    let approvedAt = undefined;

    // If walk-in registered directly at front desk by receptionist or admin, auto-approve and generate QR
    if (req.user && (req.user.role === 'receptionist' || req.user.role === 'admin') && isWalkin) {
      initialStatus = 'Approved';
      qrToken = generateSecureToken();
      qrExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      approvedAt = new Date();
    }

    const visit = await Visit.create({
      referenceNumber,
      visitorName: visitorName.trim(),
      visitorEmail: visitorEmail ? visitorEmail.trim() : '',
      visitorPhone: visitorPhone.trim(),
      organization: organization.trim(),
      purpose: purpose.trim(),
      idProofType: idProofType || 'Company ID',
      idProofNumber: idProofNumber || '',
      host: hostUser._id,
      visitDate,
      expectedArrival,
      expectedDeparture,
      status: initialStatus,
      qrToken,
      qrExpiresAt,
      approvedAt,
    });

    // Notify Host about the new visit request or arrival
    await Notification.create({
      recipient: hostUser._id,
      title: initialStatus === 'Approved' ? `New Walk-In Visitor: ${visitorName}` : `New Visit Request: ${visitorName}`,
      message: `${visitorName} from ${organization} scheduled a visit for ${visitDate} (${expectedArrival} - ${expectedDeparture}). Purpose: ${purpose}`,
      type: 'visit_request',
      visit: visit._id,
    });

    await logAudit(
      'VISIT_REGISTERED',
      req,
      `Visit registered for ${visitorName} (Ref: ${referenceNumber}, Status: ${initialStatus})`,
      { referenceNumber, host: hostUser.email }
    );

    res.status(201).json({
      success: true,
      message: initialStatus === 'Approved' ? 'Walk-in visitor registered and approved!' : 'Visit request registered successfully. Awaiting host approval.',
      visit: {
        _id: visit._id,
        referenceNumber: visit.referenceNumber,
        visitorName: visit.visitorName,
        status: visit.status,
        qrToken: visit.qrToken,
      },
    });
  } catch (error) {
    console.error('Visit registration error:', error);
    res.status(500).json({ success: false, message: 'Server error registering visit.' });
  }
};

// @desc    Get visit status and QR pass by reference number (Public Visitor)
// @route   GET /api/visits/status/:ref
// @access  Public
exports.getVisitStatusByReference = async (req, res) => {
  try {
    const { ref } = req.params;
    const visit = await Visit.findOne({ referenceNumber: ref.toUpperCase().trim() })
      .populate('host', 'name department email phone')
      .populate('checkedInBy', 'name')
      .populate('checkedOutBy', 'name');

    if (!visit) {
      return res.status(404).json({
        success: false,
        message: 'No visit found with the provided reference number.',
      });
    }

    // If approved and qrToken exists, generate dataURL for frontend display
    let qrCodeDataUrl = null;
    if (visit.status === 'Approved' || visit.status === 'CheckedIn') {
      if (visit.qrToken && !visit.isQrRevoked) {
        qrCodeDataUrl = await qrcode.toDataURL(visit.qrToken, {
          width: 280,
          margin: 2,
          color: {
            dark: '#1e3a8a', // Corporate Navy
            light: '#ffffff',
          },
        });
      }
    }

    res.status(200).json({
      success: true,
      visit: {
        _id: visit._id,
        referenceNumber: visit.referenceNumber,
        visitorName: visit.visitorName,
        visitorEmail: visit.visitorEmail,
        visitorPhone: visit.visitorPhone,
        organization: visit.organization,
        purpose: visit.purpose,
        visitDate: visit.visitDate,
        expectedArrival: visit.expectedArrival,
        expectedDeparture: visit.expectedDeparture,
        status: visit.status,
        rejectionReason: visit.rejectionReason,
        host: visit.host,
        actualCheckInTime: visit.actualCheckInTime,
        actualCheckOutTime: visit.actualCheckOutTime,
        checkoutRequest: visit.checkoutRequest,
        computedStatus:
          visit.status === 'Approved' || visit.status === 'Pending'
            ? 'Expected'
            : visit.status === 'CheckedIn'
            ? visit.checkoutRequest?.status === 'Pending'
              ? 'CheckoutRequested'
              : visit.isOverdue
              ? 'Overdue'
              : 'CheckedIn'
            : visit.status,
        qrCodeDataUrl,
        isQrRevoked: visit.isQrRevoked,
      },
    });
  } catch (error) {
    console.error('Fetch visit status error:', error);
    res.status(500).json({ success: false, message: 'Server error retrieving visit status.' });
  }
};

// @desc    Approve a visit request (Host or Admin)
// @route   PUT /api/visits/:id/approve
// @access  Private (Host, Admin)
exports.approveVisit = async (req, res) => {
  try {
    const visit = await Visit.findById(req.params.id).populate('host', 'name email');

    if (!visit) {
      return res.status(404).json({ success: false, message: 'Visit record not found.' });
    }

    // Only host assigned or admin can approve
    if (req.user.role === 'host' && visit.host._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'You are only authorized to approve your own visitor requests.' });
    }

    if (visit.status !== 'Pending' && visit.status !== 'Rejected') {
      return res.status(400).json({
        success: false,
        message: `Cannot approve visit in current status: ${visit.status}`,
      });
    }

    // Generate secure QR token
    const qrToken = generateSecureToken();
    visit.status = 'Approved';
    visit.qrToken = qrToken;
    visit.qrExpiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48h validity
    visit.isQrRevoked = false;
    visit.approvedAt = new Date();
    visit.rejectionReason = '';

    await visit.save();

    await logAudit('VISIT_APPROVED', req, `Visit ${visit.referenceNumber} for ${visit.visitorName} approved by ${req.user.name}`);

    // Notify Receptionists that a visitor was approved
    const receptionists = await User.find({ role: 'receptionist', isActive: true }).select('_id');
    const notifs = receptionists.map((rec) => ({
      recipient: rec._id,
      title: `Visit Approved: ${visit.visitorName}`,
      message: `${visit.visitorName} (${visit.organization}) approved by ${req.user.name} for ${visit.visitDate}.`,
      type: 'visit_approved',
      visit: visit._id,
    }));
    if (notifs.length > 0) await Notification.insertMany(notifs);

    res.status(200).json({
      success: true,
      message: 'Visit approved successfully. QR Pass has been generated.',
      visit,
    });
  } catch (error) {
    console.error('Approve visit error:', error);
    res.status(500).json({ success: false, message: 'Server error approving visit.' });
  }
};

// @desc    Reject a visit request (Host or Admin)
// @route   PUT /api/visits/:id/reject
// @access  Private (Host, Admin)
exports.rejectVisit = async (req, res) => {
  try {
    const { reason } = req.body;
    const visit = await Visit.findById(req.params.id);

    if (!visit) {
      return res.status(404).json({ success: false, message: 'Visit record not found.' });
    }

    if (req.user.role === 'host' && visit.host.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'You are only authorized to reject your own visitor requests.' });
    }

    if (visit.status === 'CheckedIn' || visit.status === 'CheckedOut') {
      return res.status(400).json({ success: false, message: 'Cannot reject an active or completed visit.' });
    }

    visit.status = 'Rejected';
    visit.rejectionReason = reason || 'Declined by host';
    visit.rejectedAt = new Date();
    visit.isQrRevoked = true;

    await visit.save();

    await logAudit('VISIT_REJECTED', req, `Visit ${visit.referenceNumber} rejected: ${visit.rejectionReason}`);

    res.status(200).json({
      success: true,
      message: 'Visit request has been rejected.',
      visit,
    });
  } catch (error) {
    console.error('Reject visit error:', error);
    res.status(500).json({ success: false, message: 'Server error rejecting visit.' });
  }
};

// @desc    Verify QR token or Reference code (for Reception Scanner)
// @route   POST /api/visits/verify-scan
// @access  Private (Receptionist, Admin)
exports.verifyScan = async (req, res) => {
  try {
    const { tokenOrRef } = req.body;

    if (!tokenOrRef) {
      return res.status(400).json({ success: false, message: 'Scan token or reference number is required.' });
    }

    const trimmed = tokenOrRef.trim();

    // Query by qrToken OR referenceNumber
    const visit = await Visit.findOne({
      $or: [{ qrToken: trimmed }, { referenceNumber: trimmed.toUpperCase() }],
    }).populate('host', 'name department email phone');

    if (!visit) {
      return res.status(404).json({
        success: false,
        verificationStatus: 'Invalid',
        message: 'No visit record matches this QR code or Reference.',
      });
    }

    // Evaluate Pass States
    if (visit.isQrRevoked) {
      return res.status(200).json({
        success: false,
        verificationStatus: 'Revoked',
        message: 'This pass has been revoked and is no longer valid.',
        visit,
      });
    }

    if (visit.status === 'Rejected') {
      return res.status(200).json({
        success: false,
        verificationStatus: 'Rejected',
        message: `This visit was rejected by host: "${visit.rejectionReason}"`,
        visit,
      });
    }

    if (visit.status === 'Pending') {
      return res.status(200).json({
        success: false,
        verificationStatus: 'Pending',
        message: 'This visit request has not been approved by the host employee yet.',
        visit,
      });
    }

    if (visit.status === 'CheckedOut') {
      return res.status(200).json({
        success: false,
        verificationStatus: 'Already Checked Out',
        message: `Visitor has already checked out on ${new Date(visit.actualCheckOutTime).toLocaleTimeString()}. Pass cannot be reused.`,
        visit,
      });
    }

    if (visit.status === 'CheckedIn') {
      return res.status(200).json({
        success: true,
        verificationStatus: 'Already Checked In',
        canCheckOut: true,
        canCheckIn: false,
        message: `Visitor is currently Checked In (since ${new Date(visit.actualCheckInTime).toLocaleTimeString()}). Ready for Check-Out.`,
        visit,
      });
    }

    // Check expiry
    if (visit.qrExpiresAt && new Date() > new Date(visit.qrExpiresAt)) {
      return res.status(200).json({
        success: false,
        verificationStatus: 'Expired',
        message: 'This pass has expired. Please contact reception or host for a new pass.',
        visit,
      });
    }

    // Approved and ready for check-in
    return res.status(200).json({
      success: true,
      verificationStatus: 'Valid',
      canCheckIn: true,
      canCheckOut: false,
      message: 'Pass verified! Visitor is authorized for Check-In.',
      visit,
    });
  } catch (error) {
    console.error('Verify scan error:', error);
    res.status(500).json({ success: false, message: 'Server error verifying QR pass.' });
  }
};

// @desc    Perform Check-In
// @route   POST /api/visits/:id/check-in
// @access  Private (Receptionist, Admin)
exports.checkIn = async (req, res) => {
  try {
    const visit = await Visit.findById(req.params.id).populate('host', 'name email');

    if (!visit) {
      return res.status(404).json({ success: false, message: 'Visit record not found.' });
    }

    if (visit.status === 'CheckedIn') {
      return res.status(400).json({
        success: false,
        message: 'Visitor is already marked as checked in.',
      });
    }

    if (visit.status === 'CheckedOut') {
      return res.status(400).json({
        success: false,
        message: 'Visitor has already checked out. Create a new visit if they are re-entering.',
      });
    }

    if (visit.status !== 'Approved') {
      return res.status(400).json({
        success: false,
        message: `Cannot check in. Visit status is currently ${visit.status}.`,
      });
    }

    visit.status = 'CheckedIn';
    visit.actualCheckInTime = new Date();
    visit.checkedInBy = req.user._id;
    visit.isOverdue = false;
    visit.overdueMinutes = 0;

    await visit.save();

    await logAudit(
      'VISITOR_CHECKED_IN',
      req,
      `Visitor ${visit.visitorName} checked in by receptionist ${req.user.name}`,
      { visitId: visit._id, reference: visit.referenceNumber }
    );

    // Notify Host about visitor arrival
    if (visit.host && visit.host._id) {
      await Notification.create({
        recipient: visit.host._id,
        title: `Visitor Arrived: ${visit.visitorName}`,
        message: `Your visitor ${visit.visitorName} (${visit.organization}) has checked in at reception and is heading your way.`,
        type: 'visitor_arrived',
        visit: visit._id,
      });
    }

    res.status(200).json({
      success: true,
      message: `${visit.visitorName} successfully checked in at ${visit.actualCheckInTime.toLocaleTimeString()}.`,
      visit,
    });
  } catch (error) {
    console.error('Check-in error:', error);
    res.status(500).json({ success: false, message: 'Server error processing check-in.' });
  }
};

// @desc    Request Visitor Checkout (Initiated by Requester: Staff/Host/Receptionist/Visitor/Admin)
// @route   POST /api/visits/:id/request-checkout
// @access  Private or Authorized Public Visitor
exports.requestCheckout = async (req, res) => {
  try {
    const visit = await Visit.findById(req.params.id).populate('host', 'name email');

    if (!visit) {
      return res.status(404).json({ success: false, message: 'Visit record not found.' });
    }

    if (visit.status !== 'CheckedIn') {
      return res.status(400).json({
        success: false,
        message: `Cannot request checkout. Visitor is not currently checked in (Status: ${visit.status}).`,
      });
    }

    // Check if a checkout request is already pending to avoid duplicates
    if (visit.checkoutRequest && visit.checkoutRequest.status === 'Pending') {
      return res.status(400).json({
        success: false,
        message: 'A checkout request is already pending approval from Security.',
        visit,
      });
    }

    const requesterName = req.user ? req.user.name : (req.body.requesterName || visit.visitorName);
    const requesterId = req.user ? req.user._id : null;

    visit.checkoutRequest = {
      status: 'Pending',
      requestedAt: new Date(),
      requestedBy: requesterId,
      requesterName: requesterName,
      rejectionReason: '',
      rejectedAt: null,
    };

    await visit.save();

    await logAudit(
      'CHECKOUT_REQUESTED',
      req,
      `Checkout requested for visitor ${visit.visitorName} (Ref: ${visit.referenceNumber}) by ${requesterName}`
    );

    // Notify Security staff about this pending checkout request
    const securityUsers = await User.find({ role: 'security', isActive: true }).select('_id');
    const notificationsToInsert = securityUsers.map((sec) => ({
      recipient: sec._id,
      title: `Checkout Request: ${visit.visitorName}`,
      message: `Visitor ${visit.visitorName} (Host: ${visit.host ? visit.host.name : 'Staff'}) has requested checkout. Security approval required.`,
      type: 'checkout_requested',
      visit: visit._id,
    }));

    if (notificationsToInsert.length > 0) {
      await Notification.insertMany(notificationsToInsert);
    }

    res.status(200).json({
      success: true,
      message: 'Checkout request sent to Security. Please wait for approval.',
      visit,
    });
  } catch (error) {
    console.error('Request checkout error:', error);
    res.status(500).json({ success: false, message: 'Server error requesting checkout.' });
  }
};

// @desc    Get pending checkout requests (For Security Dashboard)
// @route   GET /api/visits/checkout-requests
// @access  Private (Security, Admin)
exports.getCheckoutRequests = async (req, res) => {
  try {
    const requests = await Visit.find({
      status: 'CheckedIn',
      'checkoutRequest.status': 'Pending',
    })
      .populate('host', 'name email department phone')
      .populate('checkoutRequest.requestedBy', 'name role')
      .sort({ 'checkoutRequest.requestedAt': -1 });

    res.status(200).json({
      success: true,
      count: requests.length,
      requests,
    });
  } catch (error) {
    console.error('Get checkout requests error:', error);
    res.status(500).json({ success: false, message: 'Server error retrieving checkout requests.' });
  }
};

// @desc    Approve and Complete Checkout (Security Only)
// @route   POST /api/visits/:id/approve-checkout
// @access  Private (Security Only)
exports.approveCheckout = async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'security') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Only Security personnel have the authority to approve visitor checkouts.',
      });
    }

    const visit = await Visit.findById(req.params.id).populate('host', 'name email');

    if (!visit) {
      return res.status(404).json({ success: false, message: 'Visit record not found.' });
    }

    if (visit.status !== 'CheckedIn') {
      return res.status(400).json({
        success: false,
        message: `Visitor is not currently checked in (Status: ${visit.status}).`,
      });
    }

    // Prevent duplicate approvals
    if (visit.checkoutRequest && visit.checkoutRequest.status === 'Approved') {
      return res.status(400).json({
        success: false,
        message: 'This checkout request has already been approved.',
      });
    }

    const checkoutTime = new Date();
    visit.status = 'CheckedOut';
    visit.actualCheckOutTime = checkoutTime;
    visit.checkedOutBy = req.user._id;
    visit.isOverdue = false; // Overstay alert resolves immediately upon exit!
    visit.isQrRevoked = true; // Revoke pass to prevent reuse

    if (!visit.checkoutRequest) {
      visit.checkoutRequest = {};
    }
    visit.checkoutRequest.status = 'Approved';
    visit.checkoutRequest.rejectionReason = '';

    await visit.save();

    await logAudit(
      'VISITOR_CHECKED_OUT',
      req,
      `Checkout approved for visitor ${visit.visitorName} by Security officer ${req.user.name}`,
      { visitId: visit._id, reference: visit.referenceNumber, securityId: req.user._id }
    );

    // Notify the requester / host that checkout was approved
    if (visit.checkoutRequest.requestedBy) {
      await Notification.create({
        recipient: visit.checkoutRequest.requestedBy,
        title: `Checkout Approved: ${visit.visitorName}`,
        message: `Security officer ${req.user.name} approved the checkout for ${visit.visitorName}. Visit completed.`,
        type: 'checkout_approved',
        visit: visit._id,
      });
    } else if (visit.host && visit.host._id) {
      await Notification.create({
        recipient: visit.host._id,
        title: `Visitor Checked Out: ${visit.visitorName}`,
        message: `Security officer ${req.user.name} checked out ${visit.visitorName}. Visit completed.`,
        type: 'checkout_approved',
        visit: visit._id,
      });
    }

    res.status(200).json({
      success: true,
      message: `Checkout approved! ${visit.visitorName} has officially checked out.`,
      visit,
    });
  } catch (error) {
    console.error('Approve checkout error:', error);
    res.status(500).json({ success: false, message: 'Server error approving checkout.' });
  }
};

// @desc    Reject Checkout Request (Security Only)
// @route   POST /api/visits/:id/reject-checkout
// @access  Private (Security Only)
exports.rejectCheckout = async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'security') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Only Security personnel have the authority to review checkout requests.',
      });
    }

    const { reason } = req.body;
    const visit = await Visit.findById(req.params.id).populate('host', 'name email');

    if (!visit) {
      return res.status(404).json({ success: false, message: 'Visit record not found.' });
    }

    if (visit.status !== 'CheckedIn') {
      return res.status(400).json({
        success: false,
        message: 'Visitor is not currently checked in.',
      });
    }

    const rejectionReason = reason || 'Checkout request declined by Security';
    visit.checkoutRequest = {
      ...visit.checkoutRequest,
      status: 'Rejected',
      rejectionReason: rejectionReason,
      rejectedAt: new Date(),
    };

    // Keep visitor checked in!
    await visit.save();

    await logAudit(
      'CHECKOUT_REJECTED',
      req,
      `Checkout request rejected for visitor ${visit.visitorName} by Security officer ${req.user.name}: ${rejectionReason}`
    );

    // Notify requester
    if (visit.checkoutRequest.requestedBy) {
      await Notification.create({
        recipient: visit.checkoutRequest.requestedBy,
        title: `Checkout Request Rejected: ${visit.visitorName}`,
        message: `Security officer ${req.user.name} declined the checkout request: "${rejectionReason}". Visitor remains Checked In.`,
        type: 'checkout_rejected',
        visit: visit._id,
      });
    }

    res.status(200).json({
      success: true,
      message: `Checkout request rejected. Visitor remains Checked In.`,
      visit,
    });
  } catch (error) {
    console.error('Reject checkout error:', error);
    res.status(500).json({ success: false, message: 'Server error rejecting checkout.' });
  }
};

// @desc    Perform Direct Check-Out (Enforced for Security Only)
// @route   POST /api/visits/:id/check-out
// @access  Private (Security Only)
exports.checkOut = async (req, res) => {
  try {
    // STRICT BACKEND SECURITY AUTHORITY CHECK: Only Security role is authorized!
    if (!req.user || req.user.role !== 'security') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Only Security personnel have the authority to complete visitor checkouts.',
      });
    }

    const visit = await Visit.findById(req.params.id).populate('host', 'name email');

    if (!visit) {
      return res.status(404).json({ success: false, message: 'Visit record not found.' });
    }

    if (visit.status !== 'CheckedIn') {
      return res.status(400).json({
        success: false,
        message: `Cannot check out. Visitor is not currently checked in (Status: ${visit.status}).`,
      });
    }

    const checkoutTime = new Date();
    visit.status = 'CheckedOut';
    visit.actualCheckOutTime = checkoutTime;
    visit.checkedOutBy = req.user._id;
    visit.isOverdue = false; // Overstay automatically resolves upon exit!
    visit.isQrRevoked = true; // Revoke pass after exit to prevent re-use

    if (!visit.checkoutRequest) {
      visit.checkoutRequest = {};
    }
    visit.checkoutRequest.status = 'Approved';

    await visit.save();

    await logAudit(
      'VISITOR_CHECKED_OUT',
      req,
      `Visitor ${visit.visitorName} checked out by Security officer ${req.user.name}`,
      { visitId: visit._id, reference: visit.referenceNumber, securityId: req.user._id }
    );

    res.status(200).json({
      success: true,
      message: `${visit.visitorName} successfully checked out at ${visit.actualCheckOutTime.toLocaleTimeString()}.`,
      visit,
    });
  } catch (error) {
    console.error('Check-out error:', error);
    res.status(500).json({ success: false, message: 'Server error processing check-out.' });
  }
};

// @desc    Get all visits with filters & role scoping
// @route   GET /api/visits
// @access  Private
exports.getVisits = async (req, res) => {
  try {
    const { status, date, search, filter } = req.query;
    let query = {};

    // Role-based visibility scoping
    if (req.user.role === 'host' || req.user.role === 'staff') {
      query.host = req.user._id;
    }
    // HR can view visits directed to their department or all candidate/interview visits
    if (req.user.role === 'hr') {
      if (req.query.scope === 'mine') {
        query.host = req.user._id;
      }
    }

    // Status filter
    if (status && status !== 'all') {
      query.status = status;
    }

    // Specific date filter
    if (date) {
      query.visitDate = date;
    }

    // Overdue filter
    if (filter === 'overdue') {
      query.status = 'CheckedIn';
      query.isOverdue = true;
    } else if (filter === 'active') {
      query.status = 'CheckedIn';
    }

    // Filter for Active & Expected Visitors (Active Roster)
    if (filter === 'activeRoster') {
      // Active roster contains currently active or expected visitors (Pending, Approved, CheckedIn).
      // CheckedOut visitors are automatically removed from the active list immediately upon Security checkout.
      query.status = { $in: ['Pending', 'Approved', 'CheckedIn'] };
    }

    // Filter for archived / completed visits specifically
    if (filter === 'completedArchived') {
      query.status = 'CheckedOut';
      query.isArchivedFromActiveList = true;
    }

    // Search keyword
    if (search) {
      const searchRegex = { $regex: search, $options: 'i' };
      const searchCriteria = [
        { visitorName: searchRegex },
        { referenceNumber: searchRegex },
        { organization: searchRegex },
        { visitorPhone: searchRegex },
        { purpose: searchRegex },
      ];
      if (query.$or) {
        query.$and = [{ $or: query.$or }, { $or: searchCriteria }];
        delete query.$or;
      } else {
        query.$or = searchCriteria;
      }
    }

    // Trigger on-the-fly overstay refresh so metrics are always up-to-the-second
    await checkOverstays();

    const rawVisits = await Visit.find(query)
      .populate('host', 'name email department phone')
      .populate('checkedInBy', 'name')
      .populate('checkedOutBy', 'name')
      .sort({ createdAt: -1 });

    // Compute consistent canonical visitor status:
    // - Expected: Approved / Pending but not yet checked in
    // - CheckoutRequested: CheckedIn with checkoutRequest.status === 'Pending'
    // - Overdue: CheckedIn and isOverdue === true
    // - CheckedIn: Checked in at reception/security gate
    // - CheckedOut: Checked out
    const visits = rawVisits.map((v) => {
      const vObj = v.toObject();
      let computedStatus = vObj.status;
      if (vObj.status === 'Approved' || vObj.status === 'Pending') {
        computedStatus = 'Expected';
      } else if (vObj.status === 'CheckedIn') {
        if (vObj.checkoutRequest && vObj.checkoutRequest.status === 'Pending') {
          computedStatus = 'CheckoutRequested';
        } else if (vObj.isOverdue) {
          computedStatus = 'Overdue';
        } else {
          computedStatus = 'CheckedIn';
        }
      } else if (vObj.status === 'CheckedOut') {
        computedStatus = 'CheckedOut';
      }
      vObj.computedStatus = computedStatus;
      return vObj;
    });

    res.status(200).json({
      success: true,
      count: visits.length,
      visits,
    });
  } catch (error) {
    console.error('Fetch visits error:', error);
    res.status(500).json({ success: false, message: 'Server error retrieving visits.' });
  }
};

// @desc    Get complete visitor history (Admin Only)
// @route   GET /api/visits/history
// @access  Private (Admin Only)
exports.getVisitorHistory = async (req, res) => {
  try {
    // 1. Strict RBAC Enforcement: Only Admin can access
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Only administrators are authorized to access visitor history.',
      });
    }

    const { search, date, startDate, endDate } = req.query;

    let query = { status: 'CheckedOut' };

    // Search by visitor name, Pass ID / referenceNumber, organization, purpose, or host name
    if (search && search.trim()) {
      const searchRegex = { $regex: search.trim(), $options: 'i' };
      const matchingHosts = await User.find({ name: searchRegex }).select('_id');
      const hostIds = matchingHosts.map((h) => h._id);

      const searchConditions = [
        { visitorName: searchRegex },
        { referenceNumber: searchRegex },
        { organization: searchRegex },
        { purpose: searchRegex },
        { visitorPhone: searchRegex },
      ];
      if (hostIds.length > 0) {
        searchConditions.push({ host: { $in: hostIds } });
      }

      query.$or = searchConditions;
    }

    // Date filters: specific date or range
    if (date) {
      query.visitDate = date;
    } else if (startDate || endDate) {
      query.visitDate = {};
      if (startDate) query.visitDate.$gte = startDate;
      if (endDate) query.visitDate.$lte = endDate;
    }

    const rawVisits = await Visit.find(query)
      .populate('host', 'name email department phone')
      .populate('checkedInBy', 'name email role')
      .populate('checkedOutBy', 'name email role')
      .sort({ actualCheckOutTime: -1, createdAt: -1 });

    const visits = rawVisits.map((v) => {
      const vObj = v.toObject();
      vObj.computedStatus = 'CheckedOut';
      return vObj;
    });

    res.status(200).json({
      success: true,
      count: visits.length,
      visits,
    });
  } catch (error) {
    console.error('Fetch visitor history error:', error);
    res.status(500).json({ success: false, message: 'Server error retrieving visitor history.' });
  }
};

// @desc    Get active overstay alerts
// @route   GET /api/visits/overstays
// @access  Private (Admin, Receptionist, Host)
exports.getOverstays = async (req, res) => {
  try {
    await checkOverstays();

    let query = { status: 'CheckedIn', isOverdue: true };
    if (req.user.role === 'host') {
      query.host = req.user._id;
    }

    const overstays = await Visit.find(query)
      .populate('host', 'name email department phone')
      .populate('checkedInBy', 'name')
      .sort({ overdueMinutes: -1 });

    res.status(200).json({
      success: true,
      count: overstays.length,
      overstays,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error fetching overstay alerts.' });
  }
};

// @desc    Get single visit details
// @route   GET /api/visits/:id
// @access  Private
exports.getVisitById = async (req, res) => {
  try {
    const visit = await Visit.findById(req.params.id)
      .populate('host', 'name email department phone')
      .populate('checkedInBy', 'name')
      .populate('checkedOutBy', 'name');

    if (!visit) {
      return res.status(404).json({ success: false, message: 'Visit not found.' });
    }

    if (req.user.role === 'host' && visit.host._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    res.status(200).json({
      success: true,
      visit,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error fetching visit.' });
  }
};
