const jwt = require('jsonwebtoken');
const { connectTestDB, clearTestDB, closeTestDB } = require('../testHelper');
const { protect, authorize } = require('../../middleware/auth');
const User = require('../../models/User');

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

describe('Unit Test: Auth Middleware (protect & authorize)', () => {
  let user;
  let validToken;

  beforeEach(async () => {
    user = await User.create({
      name: 'Security Officer',
      email: 'security.auth@example.com',
      password: 'password123',
      role: 'security',
      isActive: true,
    });

    validToken = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET || 'vistara_secret_key',
      { expiresIn: '1h' }
    );
  });

  describe('protect middleware', () => {
    it('should return 401 if no token is provided in headers or cookies', async () => {
      const req = { headers: {}, cookies: {} };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      const next = jest.fn();

      await protect(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Access denied. Please log in to continue.',
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should authenticate user successfully via Bearer token in headers', async () => {
      const req = {
        headers: { authorization: `Bearer ${validToken}` },
        cookies: {},
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      const next = jest.fn();

      await protect(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.user).toBeDefined();
      expect(req.user._id.toString()).toBe(user._id.toString());
      expect(req.user.email).toBe(user.email);
    });

    it('should authenticate user successfully via vistara_token cookie', async () => {
      const req = {
        headers: {},
        cookies: { vistara_token: validToken },
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      const next = jest.fn();

      await protect(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.user).toBeDefined();
      expect(req.user._id.toString()).toBe(user._id.toString());
    });

    it('should return 401 if token is invalid or corrupted', async () => {
      const req = {
        headers: { authorization: 'Bearer invalid.fake.token' },
        cookies: {},
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      const next = jest.fn();

      await protect(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Invalid or expired session token. Please log in again.',
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 if user account is deactivated', async () => {
      user.isActive = false;
      await user.save();

      const req = {
        headers: { authorization: `Bearer ${validToken}` },
        cookies: {},
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      const next = jest.fn();

      await protect(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'User no longer exists or account is deactivated.',
        })
      );
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('authorize middleware', () => {
    it('should call next() if user role is included in allowed roles', () => {
      const req = { user: { role: 'security' } };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      const next = jest.fn();

      const middleware = authorize('security', 'admin');
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should return 403 Forbidden if user role is not authorized', () => {
      const req = { user: { role: 'staff' } };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      const next = jest.fn();

      const middleware = authorize('security', 'admin');
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: expect.stringContaining("Forbidden: role 'staff'"),
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 403 Forbidden if req.user is undefined', () => {
      const req = {};
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      const next = jest.fn();

      const middleware = authorize('admin');
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });
  });
});
