const request = require('supertest');
const app = require('../../server');
const { connectTestDB, clearTestDB, closeTestDB, generateTestToken } = require('../testHelper');
const Visit = require('../../models/Visit');
const User = require('../../models/User');

beforeAll(async () => {
  await connectTestDB();
});

afterAll(async () => {
  await closeTestDB();
});

afterEach(async () => {
  await clearTestDB();
});

describe('Integration Tests: Visit API Routes (/api/visits)', () => {
  let hostUser;
  let receptionistUser;
  let securityUser;
  let adminUser;
  let hostToken;
  let receptionistToken;
  let securityToken;
  let adminToken;

  beforeEach(async () => {
    hostUser = await User.create({
      name: 'Host Employee',
      email: 'host.visit@example.com',
      password: 'password123',
      role: 'host',
      department: 'Product',
    });

    receptionistUser = await User.create({
      name: 'Front Desk',
      email: 'reception.visit@example.com',
      password: 'password123',
      role: 'receptionist',
    });

    securityUser = await User.create({
      name: 'Gate Security',
      email: 'security.visit@example.com',
      password: 'password123',
      role: 'security',
    });

    adminUser = await User.create({
      name: 'System Admin',
      email: 'admin.visit@example.com',
      password: 'password123',
      role: 'admin',
    });

    hostToken = generateTestToken(hostUser);
    receptionistToken = generateTestToken(receptionistUser);
    securityToken = generateTestToken(securityUser);
    adminToken = generateTestToken(adminUser);
  });

  describe('POST /api/visits/register', () => {
    it('should register a new visit request successfully for public visitor', async () => {
      const payload = {
        visitorName: 'David Miller',
        visitorEmail: 'david@example.com',
        visitorPhone: '9876543210',
        organization: 'Apex Solutions',
        purpose: 'Vendor Meeting',
        idProofType: 'National ID',
        idProofNumber: 'ID-12345',
        hostId: hostUser._id.toString(),
        visitDate: '2026-10-28',
        expectedArrival: '10:00',
        expectedDeparture: '11:00',
      };

      const res = await request(app)
        .post('/api/visits/register')
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.visit).toBeDefined();
      expect(res.body.visit.visitorName).toBe('David Miller');
      expect(res.body.visit.status).toBe('Pending');
      expect(res.body.visit.referenceNumber).toMatch(/^VST-/);
    });

    it('should fail registration when required fields are missing', async () => {
      const res = await request(app)
        .post('/api/visits/register')
        .send({ visitorName: 'Incomplete User' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Please provide all required fields');
    });

    it('should fail when expectedDeparture is earlier than expectedArrival', async () => {
      const payload = {
        visitorName: 'Time Traveler',
        visitorPhone: '9876543210',
        organization: 'Time Corp',
        purpose: 'Meeting',
        hostId: hostUser._id.toString(),
        visitDate: '2026-10-28',
        expectedArrival: '15:00',
        expectedDeparture: '14:00',
      };

      const res = await request(app)
        .post('/api/visits/register')
        .send(payload);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Expected departure time must be later');
    });

    it('should auto-approve walk-in visit registered by Receptionist', async () => {
      const payload = {
        visitorName: 'Walk-in Guest',
        visitorPhone: '9876543210',
        organization: 'Guest Co',
        purpose: 'Immediate Meeting',
        hostId: hostUser._id.toString(),
        visitDate: '2026-10-28',
        expectedArrival: '10:00',
        expectedDeparture: '12:00',
        isWalkin: true,
      };

      const res = await request(app)
        .post('/api/visits/register')
        .set('Authorization', `Bearer ${receptionistToken}`)
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.visit.status).toBe('Approved');
      expect(res.body.visit.qrToken).toBeDefined();
    });
  });

  describe('GET /api/visits/status/:ref', () => {
    it('should return visit status and details by reference number', async () => {
      const visit = await Visit.create({
        referenceNumber: 'VST-STATUS-001',
        visitorName: 'Status Visitor',
        visitorPhone: '9876543210',
        organization: 'Status Inc',
        purpose: 'Consultation',
        host: hostUser._id,
        visitDate: '2026-10-28',
        expectedArrival: '11:00',
        expectedDeparture: '12:00',
        status: 'Approved',
        qrToken: 'QR_SAMPLE_TOKEN_123',
      });

      const res = await request(app).get(`/api/visits/status/${visit.referenceNumber}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.visit.referenceNumber).toBe('VST-STATUS-001');
      expect(res.body.visit.visitorName).toBe('Status Visitor');
    });

    it('should return 404 for non-existent reference number', async () => {
      const res = await request(app).get('/api/visits/status/VST-DOES-NOT-EXIST');

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/visits/:id/check-in', () => {
    let approvedVisit;

    beforeEach(async () => {
      approvedVisit = await Visit.create({
        referenceNumber: 'VST-CHECKIN-001',
        visitorName: 'Checkin Guest',
        visitorPhone: '9876543210',
        organization: 'Checkin Org',
        purpose: 'Meeting',
        host: hostUser._id,
        visitDate: '2026-10-28',
        expectedArrival: '09:00',
        expectedDeparture: '10:00',
        status: 'Approved',
        qrToken: 'QR_CHECKIN_TOKEN_456',
      });
    });

    it('should successfully check in an Approved visitor by receptionist', async () => {
      const res = await request(app)
        .post(`/api/visits/${approvedVisit._id}/check-in`)
        .set('Authorization', `Bearer ${receptionistToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.visit.status).toBe('CheckedIn');
      expect(res.body.visit.actualCheckInTime).toBeDefined();

      const inDB = await Visit.findById(approvedVisit._id);
      expect(inDB.status).toBe('CheckedIn');
    });

    it('should fail check-in if visit is still Pending (not yet approved)', async () => {
      approvedVisit.status = 'Pending';
      await approvedVisit.save();

      const res = await request(app)
        .post(`/api/visits/${approvedVisit._id}/check-in`)
        .set('Authorization', `Bearer ${receptionistToken}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Cannot check in');
    });

    it('should return 403 Forbidden if non-receptionist/non-security attempts check-in', async () => {
      const res = await request(app)
        .post(`/api/visits/${approvedVisit._id}/check-in`)
        .set('Authorization', `Bearer ${hostToken}`);

      expect(res.status).toBe(403);
    });
  });

  describe('POST /api/visits/:id/check-out', () => {
    let checkedInVisit;

    beforeEach(async () => {
      checkedInVisit = await Visit.create({
        referenceNumber: 'VST-CHECKOUT-001',
        visitorName: 'Checkout Guest',
        visitorPhone: '9876543210',
        organization: 'Exit Org',
        purpose: 'Closing',
        host: hostUser._id,
        visitDate: '2026-10-28',
        expectedArrival: '09:00',
        expectedDeparture: '10:00',
        status: 'CheckedIn',
        actualCheckInTime: new Date(),
      });
    });

    it('should successfully check out visitor when authorized by Security', async () => {
      const res = await request(app)
        .post(`/api/visits/${checkedInVisit._id}/check-out`)
        .set('Authorization', `Bearer ${securityToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.visit.status).toBe('CheckedOut');
      expect(res.body.visit.actualCheckOutTime).toBeDefined();
      expect(res.body.visit.isQrRevoked).toBe(true);

      const inDB = await Visit.findById(checkedInVisit._id);
      expect(inDB.status).toBe('CheckedOut');
    });

    it('should reject check-out attempt with 403 Forbidden by non-security role', async () => {
      const res = await request(app)
        .post(`/api/visits/${checkedInVisit._id}/check-out`)
        .set('Authorization', `Bearer ${receptionistToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('should fail check-out if visitor is not CheckedIn', async () => {
      checkedInVisit.status = 'Approved';
      await checkedInVisit.save();

      const res = await request(app)
        .post(`/api/visits/${checkedInVisit._id}/check-out`)
        .set('Authorization', `Bearer ${securityToken}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Visitor is not currently checked in');
    });
  });

  describe('GET /api/visits', () => {
    beforeEach(async () => {
      await Visit.create([
        {
          referenceNumber: 'VST-LIST-001',
          visitorName: 'Visitor One',
          visitorPhone: '9876543210',
          organization: 'Org 1',
          purpose: 'Meeting 1',
          host: hostUser._id,
          visitDate: '2026-10-28',
          expectedArrival: '09:00',
          expectedDeparture: '10:00',
          status: 'CheckedIn',
          isOverdue: false,
        },
        {
          referenceNumber: 'VST-LIST-002',
          visitorName: 'Visitor Two',
          visitorPhone: '9876543211',
          organization: 'Org 2',
          purpose: 'Meeting 2',
          host: adminUser._id,
          visitDate: '2026-10-28',
          expectedArrival: '11:00',
          expectedDeparture: '12:00',
          status: 'Approved',
          isOverdue: false,
        },
      ]);
    });

    it('should retrieve all visits for Admin', async () => {
      const res = await request(app)
        .get('/api/visits')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.visits.length).toBe(2);
    });

    it('should scope visits for Host to only visits where they are the host', async () => {
      const res = await request(app)
        .get('/api/visits')
        .set('Authorization', `Bearer ${hostToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.visits.length).toBe(1);
      expect(res.body.visits[0].referenceNumber).toBe('VST-LIST-001');
    });

    it('should filter visits by status', async () => {
      const res = await request(app)
        .get('/api/visits?status=CheckedIn')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.visits.length).toBe(1);
      expect(res.body.visits[0].status).toBe('CheckedIn');
    });
  });
});
