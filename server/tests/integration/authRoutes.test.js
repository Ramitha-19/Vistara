const request = require('supertest');
const app = require('../../server');
const { connectTestDB, clearTestDB, closeTestDB, generateTestToken } = require('../testHelper');
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

describe('Integration Tests: Auth Routes (/api/auth)', () => {
  let existingUser;

  beforeEach(async () => {
    existingUser = await User.create({
      name: 'Priya Lakshmi',
      email: 'priya.auth@example.com',
      password: 'password123',
      role: 'receptionist',
      department: 'Front Desk',
      phone: '9876543210',
      isActive: true,
    });
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully and return token with user payload', async () => {
      const payload = {
        name: 'New Staff Member',
        email: 'newstaff@example.com',
        password: 'securePassword123',
        role: 'staff',
        department: 'Engineering',
        phone: '9123456789',
      };

      const res = await request(app)
        .post('/api/auth/register')
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBeDefined();
      expect(res.body.user).toBeDefined();
      expect(res.body.user.email).toBe('newstaff@example.com');
      expect(res.body.user.role).toBe('staff');
      expect(res.body.user.password).toBeUndefined();

      // Check cookie was set
      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      expect(cookies[0]).toMatch(/vistara_token=/);
    });

    it('should return 400 when required fields (name, email, password) are missing', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'onlyemail@example.com' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Please provide name, email, and password');
    });

    it('should return 400 when email is already registered', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Duplicate Priya',
          email: 'priya.auth@example.com',
          password: 'anotherpassword',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('A user with this email already exists');
    });
  });

  describe('POST /api/auth/login', () => {
    it('should log in successfully with valid credentials and return token & cookie', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'priya.auth@example.com',
          password: 'password123',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBeDefined();
      expect(res.body.user).toBeDefined();
      expect(res.body.user.name).toBe('Priya Lakshmi');

      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      expect(cookies[0]).toMatch(/vistara_token=/);
    });

    it('should return 401 if password is incorrect', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'priya.auth@example.com',
          password: 'wrongpassword',
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Invalid email or password.');
    });

    it('should return 401 if user email is not registered', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'password123',
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Invalid email or password.');
    });

    it('should return 400 if email or password is missing in request', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'priya.auth@example.com' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Please provide both work email and password');
    });

    it('should return 403 if account is deactivated', async () => {
      existingUser.isActive = false;
      await existingUser.save();

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'priya.auth@example.com',
          password: 'password123',
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('This account has been deactivated');
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return user profile for authenticated user', async () => {
      const token = generateTestToken(existingUser);

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.user).toBeDefined();
      expect(res.body.user.email).toBe(existingUser.email);
    });

    it('should return 401 if unauthenticated request is made', async () => {
      const res = await request(app).get('/api/auth/me');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should clear authentication cookie on logout', async () => {
      const token = generateTestToken(existingUser);

      const res = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Logged out successfully.');

      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      expect(cookies[0]).toMatch(/vistara_token=none/);
    });
  });

  describe('POST /api/auth/forgot-password', () => {
    it('should return helpdesk instructions message', async () => {
      const res = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'priya.auth@example.com' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('Systems Administrator or internal IT Helpdesk');
    });
  });
});
