const User = require('../models/User');
const SystemConfig = require('../models/SystemConfig');
const { logAudit } = require('../utils/auditLogger');

// @desc    Get all employees / hosts (For public visitor registration dropdown)
// @route   GET /api/users/hosts
// @access  Public
exports.getAvailableHosts = async (req, res) => {
  try {
    const hosts = await User.find({
      role: { $in: ['staff', 'hr', 'host', 'admin'] },
      isActive: true,
    })
      .select('name department email phone role')
      .sort({ name: 1 });

    res.status(200).json({
      success: true,
      hosts,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error retrieving host employees.' });
  }
};

// @desc    Get all users (Admin only)
// @route   GET /api/users
// @access  Private (Admin)
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      users,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error retrieving users.' });
  }
};

// @desc    Create a new user (Admin only)
// @route   POST /api/users
// @access  Private (Admin)
exports.createUser = async (req, res) => {
  try {
    const { name, email, password, role, department, phone } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ success: false, message: 'Please provide name, email, password, and role.' });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'A user with this email already exists.' });
    }

    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      role,
      department: department ? department.trim() : 'General',
      phone: phone ? phone.trim() : '',
    });

    await logAudit('USER_CREATED', req, `Created account for ${user.email} (${user.role})`);

    res.status(201).json({
      success: true,
      message: `User account created successfully for ${user.name}.`,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
      },
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ success: false, message: 'Server error creating user.' });
  }
};

// @desc    Update user status / role (Admin only)
// @route   PUT /api/users/:id
// @access  Private (Admin)
exports.updateUser = async (req, res) => {
  try {
    const { name, role, department, phone, isActive, password } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    if (name) user.name = name.trim();
    if (role) user.role = role;
    if (department !== undefined) user.department = department.trim();
    if (phone !== undefined) user.phone = phone.trim();
    if (isActive !== undefined) user.isActive = isActive;
    if (password) user.password = password; // Will be hashed by pre-save hook

    await user.save();
    await logAudit('USER_UPDATED', req, `Updated account: ${user.email}`);

    res.status(200).json({
      success: true,
      message: 'User account updated successfully.',
      user,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error updating user.' });
  }
};

// @desc    Get system settings (Grace period, etc.)
// @route   GET /api/users/config
// @access  Private (Admin, Receptionist)
exports.getSystemConfig = async (req, res) => {
  try {
    let config = await SystemConfig.findOne({ key: 'main_config' });
    if (!config) {
      config = await SystemConfig.create({
        key: 'main_config',
        overstayGracePeriodMinutes: 15,
      });
    }
    res.status(200).json({ success: true, config });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error getting configuration.' });
  }
};

// @desc    Update system settings (Admin only)
// @route   PUT /api/users/config
// @access  Private (Admin)
exports.updateSystemConfig = async (req, res) => {
  try {
    const { overstayGracePeriodMinutes, companyName, requireApprovalForWalkins } = req.body;
    let config = await SystemConfig.findOne({ key: 'main_config' });
    if (!config) {
      config = new SystemConfig({ key: 'main_config' });
    }

    if (overstayGracePeriodMinutes !== undefined) {
      config.overstayGracePeriodMinutes = Number(overstayGracePeriodMinutes);
    }
    if (companyName) config.companyName = companyName;
    if (requireApprovalForWalkins !== undefined) config.requireApprovalForWalkins = requireApprovalForWalkins;

    await config.save();
    await logAudit('CONFIG_UPDATED', req, `Updated overstay grace period to ${config.overstayGracePeriodMinutes} minutes.`);

    res.status(200).json({
      success: true,
      message: 'System configuration updated successfully.',
      config,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error updating configuration.' });
  }
};
