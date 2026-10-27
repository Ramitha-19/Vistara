const AuditLog = require('../models/AuditLog');

const logAudit = async (action, req, details, metadata = {}) => {
  try {
    const performedBy = req && req.user ? req.user._id : null;
    const userRole = req && req.user ? req.user.role : 'public';
    const ipAddress = req ? req.ip || req.headers['x-forwarded-for'] || '' : '';

    await AuditLog.create({
      action,
      performedBy,
      userRole,
      details,
      ipAddress,
      metadata,
    });
  } catch (err) {
    console.error('Failed to write audit log:', err.message);
  }
};

module.exports = { logAudit };
