const crypto = require('crypto');
const User = require('../models/User');
const Visit = require('../models/Visit');
const Notification = require('../models/Notification');
const AuditLog = require('../models/AuditLog');
const SystemConfig = require('../models/SystemConfig');

async function seedDatabase() {
  try {
    console.log('🌱 Starting Vistara Enterprise database seed with clean South Indian demo data...');

    // 1. Ensure System Config exists
    await SystemConfig.findOneAndUpdate(
      { key: 'main_config' },
      {
        key: 'main_config',
        overstayGracePeriodMinutes: 15,
        companyName: 'Vistara Enterprises',
      },
      { upsert: true, new: true }
    );

    // 2. Clear existing collections to remove Marcus Sterling and old outdated demo visitors
    await User.deleteMany({});
    await Visit.deleteMany({});
    await Notification.deleteMany({});
    await AuditLog.deleteMany({});

    // 3. Create Demo Users for each required role with South Indian names
    console.log('Creating demo users...');

    // 1. Receptionist: Priya Lakshmi
    const receptionist = await User.create({
      name: 'Priya Lakshmi',
      email: 'reception@example.com',
      password: 'password123',
      role: 'receptionist',
      department: 'Front Desk Operations',
      phone: '+91 98401 23456',
      isActive: true,
    });

    // 2. Staff: Karthik Raj
    const staff = await User.create({
      name: 'Karthik Raj',
      email: 'staff@example.com',
      password: 'password123',
      role: 'staff',
      department: 'Software Engineering',
      phone: '+91 98402 34567',
      isActive: true,
    });

    // 3. HR: Meena Devi
    const hr = await User.create({
      name: 'Meena Devi',
      email: 'hr@example.com',
      password: 'password123',
      role: 'hr',
      department: 'Human Resources & Talent Acquisition',
      phone: '+91 98403 45678',
      isActive: true,
    });

    // 4. Security: Vignesh Kumar
    const security = await User.create({
      name: 'Vignesh Kumar',
      email: 'security@example.com',
      password: 'password123',
      role: 'security',
      department: 'Facility Security & Access Control',
      phone: '+91 98404 56789',
      isActive: true,
    });

    // Admin: Arjun Kumar (For setup/administration)
    const admin = await User.create({
      name: 'Arjun Kumar',
      email: 'admin@example.com',
      password: 'password123',
      role: 'admin',
      department: 'Operations & IT Infrastructure',
      phone: '+91 98400 12345',
      isActive: true,
    });

    console.log('✅ Created 5 enterprise users (Priya Lakshmi, Karthik Raj, Meena Devi, Vignesh Kumar, Arjun Kumar).');

    // 4. Create Minimal South Indian Demo Visit Records
    const today = new Date().toISOString().slice(0, 10);

    // Calculate time strings for demo
    const now = new Date();
    const currentH = now.getHours();
    const currentM = now.getMinutes();

    // Visit 1: Approved and Expected Today — Ananya Ramesh meeting Karthik Raj (Staff)
    const token1 = 'QR_' + crypto.randomBytes(24).toString('hex');
    const visit1 = await Visit.create({
      referenceNumber: 'VST-20261013-ANAN',
      visitorName: 'Ananya Ramesh',
      visitorEmail: 'ananya.ramesh@example.com',
      visitorPhone: '+91 98411 98765',
      organization: 'TCS Innovations',
      purpose: 'Technical Project Review',
      idProofType: 'Company ID',
      idProofNumber: 'TCS-9011',
      host: staff._id,
      visitDate: today,
      expectedArrival: '10:00',
      expectedDeparture: '18:00',
      status: 'Approved',
      qrToken: token1,
      qrExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      approvedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    });

    // Visit 2: Currently Checked In (Active) — Suresh Balaji meeting Meena Devi (HR)
    const token2 = 'QR_' + crypto.randomBytes(24).toString('hex');
    const checkedIn1HrAgo = new Date(Date.now() - 60 * 60 * 1000);
    const visit2 = await Visit.create({
      referenceNumber: 'VST-20261013-SURE',
      visitorName: 'Suresh Balaji',
      visitorEmail: 'suresh.balaji@example.com',
      visitorPhone: '+91 98412 87654',
      organization: 'Candidate',
      purpose: 'Final Round In-Person Interview',
      idProofType: 'National ID',
      idProofNumber: 'AADHAR-7712',
      host: hr._id,
      visitDate: today,
      expectedArrival: '11:00',
      expectedDeparture: '19:30',
      status: 'CheckedIn',
      qrToken: token2,
      qrExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      approvedAt: checkedIn1HrAgo,
      actualCheckInTime: checkedIn1HrAgo,
      checkedInBy: receptionist._id,
      isOverdue: false,
      overdueMinutes: 0,
    });

    // Visit 3: Active Overdue Visit for Security Notification Demonstration
    // Expected departure 35 minutes ago, grace period is 15 minutes => overdue by 35 minutes
    const token3 = 'QR_' + crypto.randomBytes(24).toString('hex');
    const pastDepTime = new Date(Date.now() - 35 * 60 * 1000);
    const pastDepStr = `${String(pastDepTime.getHours()).padStart(2, '0')}:${String(pastDepTime.getMinutes()).padStart(2, '0')}`;
    const checkedInTwoHrsAgo = new Date(Date.now() - 120 * 60 * 1000);

    const visit3 = await Visit.create({
      referenceNumber: 'VST-20261013-DEEP',
      visitorName: 'Deepa Sundaram',
      visitorEmail: 'deepa.sundaram@example.com',
      visitorPhone: '+91 98413 76543',
      organization: 'L&T Infotech',
      purpose: 'Client Architecture Presentation',
      idProofType: 'National ID',
      idProofNumber: 'ID-5544A',
      host: staff._id,
      visitDate: today,
      expectedArrival: '09:30',
      expectedDeparture: pastDepStr,
      status: 'CheckedIn',
      qrToken: token3,
      qrExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      approvedAt: checkedInTwoHrsAgo,
      actualCheckInTime: checkedInTwoHrsAgo,
      checkedInBy: receptionist._id,
      isOverdue: true,
      overdueMinutes: 35,
    });

    // Visit 4: Completed Visit — Mohan Raj
    const visit4 = await Visit.create({
      referenceNumber: 'VST-20261013-MOHN',
      visitorName: 'Mohan Raj',
      visitorEmail: 'mohan.raj@example.com',
      visitorPhone: '+91 98414 65432',
      organization: 'BlueStar Solutions',
      purpose: 'AC Maintenance Check',
      idProofType: 'Company ID',
      idProofNumber: 'BS-102',
      host: admin._id,
      visitDate: today,
      expectedArrival: '09:00',
      expectedDeparture: '10:30',
      status: 'CheckedOut',
      qrToken: 'QR_' + crypto.randomBytes(24).toString('hex'),
      qrExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      actualCheckInTime: new Date(Date.now() - 4 * 60 * 60 * 1000),
      actualCheckOutTime: new Date(Date.now() - 2 * 60 * 60 * 1000),
      checkedInBy: receptionist._id,
      checkedOutBy: security._id,
      isQrRevoked: true,
    });

    // 5. Seed Overdue Notification specifically for Security & Staff
    await Notification.create([
      {
        recipient: security._id,
        title: 'OVERDUE VISITOR: Deepa Sundaram',
        message: `Deepa Sundaram was expected to leave at ${pastDepStr}. Currently overdue by 35 minutes.`,
        type: 'overstay_alert',
        visit: visit3._id,
      },
      {
        recipient: staff._id,
        title: 'OVERDUE VISITOR: Deepa Sundaram',
        message: `Your visitor Deepa Sundaram from L&T Infotech was expected to leave at ${pastDepStr}. Overdue by 35 minutes.`,
        type: 'overstay_alert',
        visit: visit3._id,
      },
    ]);

    // 6. Initial Audit Log
    await AuditLog.create({
      action: 'SYSTEM_BOOT',
      performedBy: admin._id,
      userRole: 'admin',
      details: 'Vistara Enterprise initialized with simplified clean demo configuration.',
    });

    console.log('✅ Demo database seeded with clean South Indian accounts & realistic visitor records!');
  } catch (error) {
    console.error('❌ Error during demo database seed:', error);
  }
}

module.exports = seedDatabase;

if (require.main === module) {
  require('dotenv').config();
  const connectDB = require('../config/db');
  connectDB().then(async () => {
    await seedDatabase();
    process.exit(0);
  });
}
