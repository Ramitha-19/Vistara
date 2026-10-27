const mongoose = require('mongoose');
const { connectTestDB, clearTestDB, closeTestDB } = require('../testHelper');
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

describe('Unit Test: Visit Model Schema & Validations', () => {
  let hostUser;

  beforeEach(async () => {
    hostUser = await User.create({
      name: 'Host User',
      email: 'host.model@example.com',
      password: 'password123',
      role: 'host',
    });
  });

  it('should successfully create a valid Visit document', async () => {
    const validData = {
      referenceNumber: 'VST-20261027-TEST',
      visitorName: 'Jane Doe',
      visitorEmail: 'jane@example.com',
      visitorPhone: '+1-555-0199',
      organization: 'Tech Innovations',
      purpose: 'Technical Discussion',
      host: hostUser._id,
      visitDate: '2026-10-27',
      expectedArrival: '10:00',
      expectedDeparture: '11:30',
    };

    const visit = new Visit(validData);
    const saved = await visit.save();

    expect(saved._id).toBeDefined();
    expect(saved.referenceNumber).toBe('VST-20261027-TEST');
    expect(saved.status).toBe('Pending');
    expect(saved.idProofType).toBe('Company ID');
    expect(saved.isQrRevoked).toBe(false);
    expect(saved.isOverdue).toBe(false);
    expect(saved.overdueMinutes).toBe(0);
    expect(saved.checkoutRequest.status).toBe('None');
    expect(saved.isArchivedFromActiveList).toBe(false);
  });

  it('should fail validation when required fields are missing', async () => {
    const emptyVisit = new Visit({});
    let error;

    try {
      await emptyVisit.validate();
    } catch (err) {
      error = err;
    }

    expect(error).toBeDefined();
    expect(error.errors.visitorName).toBeDefined();
    expect(error.errors.visitorPhone).toBeDefined();
    expect(error.errors.organization).toBeDefined();
    expect(error.errors.purpose).toBeDefined();
    expect(error.errors.host).toBeDefined();
    expect(error.errors.visitDate).toBeDefined();
    expect(error.errors.expectedArrival).toBeDefined();
    expect(error.errors.expectedDeparture).toBeDefined();
    expect(error.errors.referenceNumber).toBeDefined();
  });

  it('should enforce status enum values', async () => {
    const visit = new Visit({
      referenceNumber: 'VST-INVALID-STATUS',
      visitorName: 'Invalid Status Test',
      visitorPhone: '1234567890',
      organization: 'Org',
      purpose: 'Testing',
      host: hostUser._id,
      visitDate: '2026-10-27',
      expectedArrival: '10:00',
      expectedDeparture: '11:00',
      status: 'InvalidStatusValue',
    });

    let error;
    try {
      await visit.validate();
    } catch (err) {
      error = err;
    }

    expect(error).toBeDefined();
    expect(error.errors.status).toBeDefined();
  });

  it('should enforce idProofType enum values', async () => {
    const visit = new Visit({
      referenceNumber: 'VST-INVALID-ID',
      visitorName: 'Invalid ID Test',
      visitorPhone: '1234567890',
      organization: 'Org',
      purpose: 'Testing',
      host: hostUser._id,
      visitDate: '2026-10-27',
      expectedArrival: '10:00',
      expectedDeparture: '11:00',
      idProofType: 'FakeIDCard',
    });

    let error;
    try {
      await visit.validate();
    } catch (err) {
      error = err;
    }

    expect(error).toBeDefined();
    expect(error.errors.idProofType).toBeDefined();
  });

  it('should trim string values properly', async () => {
    const visit = await Visit.create({
      referenceNumber: 'VST-TRIM-TEST',
      visitorName: '   Spaced Visitor Name   ',
      visitorPhone: '   9876543210   ',
      organization: '   Trim Org   ',
      purpose: '   Trim Purpose   ',
      host: hostUser._id,
      visitDate: '2026-10-27',
      expectedArrival: '10:00',
      expectedDeparture: '12:00',
    });

    expect(visit.visitorName).toBe('Spaced Visitor Name');
    expect(visit.visitorPhone).toBe('9876543210');
    expect(visit.organization).toBe('Trim Org');
    expect(visit.purpose).toBe('Trim Purpose');
  });

  it('should enforce unique referenceNumber', async () => {
    const data = {
      referenceNumber: 'VST-DUPLICATE-REF',
      visitorName: 'Person One',
      visitorPhone: '9876543210',
      organization: 'Org A',
      purpose: 'Meeting',
      host: hostUser._id,
      visitDate: '2026-10-27',
      expectedArrival: '09:00',
      expectedDeparture: '10:00',
    };

    await Visit.create(data);

    let duplicateError;
    try {
      await Visit.create({
        ...data,
        visitorName: 'Person Two',
      });
    } catch (err) {
      duplicateError = err;
    }

    expect(duplicateError).toBeDefined();
    expect(duplicateError.code).toBe(11000);
  });
});
