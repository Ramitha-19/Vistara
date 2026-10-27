const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { logAudit } = require('../utils/auditLogger');

// Helper to generate JWT and send cookie
const sendTokenResponse = (user, statusCode, res, message = 'Success') => {
  const token = jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET || 'vistara_secret_key',
    { expiresIn: '8h' }
  );

  const isProduction = process.env.NODE_ENV === 'production';
  const cookieOptions = {
    expires: new Date(Date.now() + 8 * 60 * 60 * 1000), // 8 hours
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax',
  };

  res
    .status(statusCode)
    .cookie('vistara_token', token, cookieOptions)
    .json({
      success: true,
      message,
      token, // Also provided for clients storing in Authorization header
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        phone: user.phone,
      },
    });
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res) => {
  try {
    const { name, email, password, role, department, phone } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name, email, and password.',
      });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'A user with this email already exists.',
      });
    }

    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      role: role || 'staff',
      department: department ? department.trim() : 'General',
      phone: phone ? phone.trim() : '',
    });

    await logAudit('USER_REGISTERED', req, `User registered: ${user.email} (${user.role})`);
    sendTokenResponse(user, 201, res, 'User registered successfully.');
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ success: false, message: 'Server error during registration.' });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both work email and password.',
      });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password');

    if (!user) {
      await logAudit('USER_LOGIN_FAILED', req, `Failed login attempt for unknown email: ${email}`);
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'This account has been deactivated. Please contact an administrator.',
      });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      await logAudit('USER_LOGIN_FAILED', req, `Failed password attempt for user: ${email}`);
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    req.user = user;
    await logAudit('USER_LOGIN_SUCCESS', req, `User ${user.email} (${user.role}) logged in.`);

    sendTokenResponse(user, 200, res, 'Logged in successfully.');
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Server error during login.' });
  }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error fetching user profile.' });
  }
};

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
exports.logout = async (req, res) => {
  try {
    if (req.user) {
      await logAudit('USER_LOGOUT', req, `User ${req.user.email} logged out.`);
    }

    res.cookie('vistara_token', 'none', {
      expires: new Date(Date.now() + 5 * 1000),
      httpOnly: true,
    });

    res.status(200).json({
      success: true,
      message: 'Logged out successfully.',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error during logout.' });
  }
};

// @desc    Password reset request info
// @route   POST /api/auth/forgot-password
// @access  Public
exports.forgotPassword = async (req, res) => {
  // Clear, honest, enterprise implementation notice
  res.status(200).json({
    success: true,
    message: 'To reset your workplace account password, please contact your Vistara Systems Administrator or internal IT Helpdesk (smtp/email integration required).',
  });
};
