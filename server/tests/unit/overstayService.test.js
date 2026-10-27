const { connectTestDB, clearTestDB, closeTestDB } = require('../testHelper');
const { checkOverstays, startOverstayScheduler } = require('../../services/overstayService');
const Visit = require('../../models/Visit');
const User = require('../../models/User');
const Notification = require('../../models/Notification');
const SystemConfig = require('../../models/SystemConfig');

beforeAll(async () => {
  await connectTestDB();
});

afterAll(async () => {
  await closeTestDB();
});

afterEach(async () => {
  await clearTestDB();
  jest.clearAllMocks();
});

describe('Unit Test: overstayService', () => {
  let hostUser;
  let adminUser;
  let securityUser;
  let receptionistUser;

  beforeEach(async () => {
    hostUser = await User.create({
      name: 'Host User',
      email: 'host@example.com',
      password: 'password123',
      role: 'host',
      department: 'Engineering',
    });

    adminUser = await User.create({
      name: 'Admin User',
      email: 'admin@example.com',
      password: 'password123',
      role: 'admin',
    });

    securityUser = await User.create({
      name: 'Security User',
      email: 'security@example.com',
      password: 'password123',
      role: 'security',
    });

    receptionistUser = await User.create({
      name: 'Receptionist User',
      email: 'reception@example.com',
      password: 'password123',
      role: 'receptionist',
    });
  });

  function getLocalDateParts(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return {
      visitDate: `${year}-${month}-${day}`,
      timeStr: `${hours}:${minutes}`,
    };
  }

  describe('checkOverstays()', () => {
    it('should detect overdue visitor and create alert notifications for staff and host', async () => {
      // Set grace period to 15 minutes
      await SystemConfig.create({
        key: 'main_config',
        overstayGracePeriodMinutes: 15,
      });

      // Visit scheduled for departure 2 hours ago
      const pastDate = new Date(Date.now() - 2 * 60 * 60 * 1000);
      const { visitDate, timeStr } = getLocalDateParts(pastDate);

      const visit = await Visit.create({
        referenceNumber: 'VST-OVERDUE-001',
        visitorName: 'John Doe',
        visitorPhone: '9876543210',
        organization: 'Acme Corp',
        purpose: 'Audit',
        host: hostUser._id,
        visitDate,
        expectedArrival: '09:00',
        expectedDeparture: timeStr,
        status: 'CheckedIn',
        actualCheckInTime: new Date(Date.now() - 3 * 60 * 60 * 1000),
        isOverdue: false,
      });

      await checkOverstays();

      const updatedVisit = await Visit.findById(visit._id);
      expect(updatedVisit.isOverdue).toBe(true);
      expect(updatedVisit.overdueMinutes).toBeGreaterThanOrEqual(100);

      // Verify notifications generated
      const notifications = await Notification.find({ visit: visit._id });
      expect(notifications.length).toBeGreaterThanOrEqual(4); // admin, receptionist, security, host
      const hostNotif = notifications.find(n => n.recipient.toString() === hostUser._id.toString());
      expect(hostNotif).toBeDefined();
      expect(hostNotif.type).toBe('overstay_alert');
    });

    it('should not mark visitor as overdue if within grace period or departure is in future', async () => {
      const futureDate = new Date(Date.now() + 2 * 60 * 60 * 1000);
      const { visitDate, timeStr } = getLocalDateParts(futureDate);

      const visit = await Visit.create({
        referenceNumber: 'VST-ONTIME-002',
        visitorName: 'Alice Green',
        visitorPhone: '9876543211',
        organization: 'Tech Lab',
        purpose: 'Interview',
        host: hostUser._id,
        visitDate,
        expectedArrival: '10:00',
        expectedDeparture: timeStr,
        status: 'CheckedIn',
        actualCheckInTime: new Date(),
        isOverdue: false,
      });

      await checkOverstays();

      const checkedVisit = await Visit.findById(visit._id);
      expect(checkedVisit.isOverdue).toBe(false);
      expect(checkedVisit.overdueMinutes).toBe(0);

      const notifications = await Notification.find({ visit: visit._id });
      expect(notifications.length).toBe(0);
    });

    it('should reset isOverdue to false if visit was overdue but departure was extended', async () => {
      const futureDate = new Date(Date.now() + 3 * 60 * 60 * 1000);
      const { visitDate, timeStr } = getLocalDateParts(futureDate);

      const visit = await Visit.create({
        referenceNumber: 'VST-RESET-003',
        visitorName: 'Bob White',
        visitorPhone: '9876543212',
        organization: 'Partner LLC',
        purpose: 'Project Review',
        host: hostUser._id,
        visitDate,
        expectedArrival: '09:00',
        expectedDeparture: timeStr,
        status: 'CheckedIn',
        actualCheckInTime: new Date(),
        isOverdue: true,
        overdueMinutes: 45,
      });

      await checkOverstays();

      const updated = await Visit.findById(visit._id);
      expect(updated.isOverdue).toBe(false);
      expect(updated.overdueMinutes).toBe(0);
    });

    it('should ignore non-CheckedIn visits (e.g. CheckedOut, Pending, Approved)', async () => {
      const pastDate = new Date(Date.now() - 4 * 60 * 60 * 1000);
      const visitDateStr = pastDate.toISOString().slice(0, 10);

      const checkedOutVisit = await Visit.create({
        referenceNumber: 'VST-CHECKEDOUT-004',
        visitorName: 'Charlie Brown',
        visitorPhone: '9876543213',
        organization: 'Global Supply',
        purpose: 'Delivery',
        host: hostUser._id,
        visitDate: visitDateStr,
        expectedArrival: '08:00',
        expectedDeparture: '09:00',
        status: 'CheckedOut',
        isOverdue: false,
      });

      await checkOverstays();

      const visitInDB = await Visit.findById(checkedOutVisit._id);
      expect(visitInDB.isOverdue).toBe(false);
    });
  });

  describe('startOverstayScheduler()', () => {
    it('should initialize scheduler interval and invoke checkOverstays', () => {
      jest.useFakeTimers();
      const intervalTimer = startOverstayScheduler(10000);

      expect(intervalTimer).toBeDefined();
      clearInterval(intervalTimer);
      jest.useRealTimers();
    });
  });
});
