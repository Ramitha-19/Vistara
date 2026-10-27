# Vistara Enterprise - Testing Documentation & Coverage Report

## 1. Overview
The **Vistara Enterprise Visitor Management System** backend test suite provides automated testing across unit and integration levels. The test framework ensures that business logic, security policies (RBAC), database schemas, overstay detection, and REST API contracts operate reliably and safely without requiring external database dependencies.

---

## 2. Testing Stack
- **Test Runner & Assertion Library**: [Jest](https://jestjs.io/) v30+
- **HTTP / API Mocking & Assertions**: [Supertest](https://github.com/ladjs/supertest) v7+
- **Database Mocking**: [MongoDB Memory Server](https://github.com/nodkz/mongodb-memory-server) (isolated in-memory MongoDB instance per test execution)
- **Token Generation & Session Verification**: JSONWebToken (`jsonwebtoken`)

---

## 3. Test Structure & Directory Layout

```
server/
├── jest.config.js                               # Central Jest configuration
├── tests/
│   ├── testHelper.js                           # In-memory DB setup, teardown & auth token helpers
│   ├── unit/
│   │   ├── authMiddleware.test.js              # Unit tests for JWT protect & RBAC authorize
│   │   ├── overstayService.test.js             # Unit tests for overstay detection & scheduler
│   │   └── visitModel.test.js                  # Unit tests for Visit Mongoose schema & validation
│   └── integration/
│       ├── authRoutes.test.js                  # Integration tests for /api/auth (register, login, me, logout)
│       └── visitRoutes.test.js                 # Integration tests for /api/visits (register, check-in, check-out, list)
```

---

## 4. Test Suites Breakdown

### 4.1 Unit Tests

#### `server/tests/unit/authMiddleware.test.js`
- **`protect` Middleware**:
  - Rejects unauthenticated requests with 401 when no token is provided.
  - Verifies and authenticates requests using `Bearer <token>` in the Authorization header.
  - Verifies and authenticates requests using the `vistara_token` HTTP-Only cookie.
  - Rejects corrupted or invalid tokens with 401.
  - Rejects deactivated user accounts (`isActive: false`) with 401.
- **`authorize` Middleware**:
  - Grants access when the authenticated user possesses an allowed role.
  - Rejects unauthorized roles with 403 Forbidden.
  - Rejects unauthenticated contexts with 403 Forbidden.

#### `server/tests/unit/overstayService.test.js`
- **`checkOverstays` Engine**:
  - Automatically identifies visitors whose expected departure + grace period has passed.
  - Computes `overdueMinutes` and sets `isOverdue: true`.
  - Dispatches automated alert notifications to security guards, receptionists, administrators, and hosts.
  - Leaves visitors within scheduled hours or within grace periods unaffected.
  - Gracefully resets overdue state if visitor schedules are extended.
  - Strictly limits overstay detection to currently `CheckedIn` visitors, ignoring checked-out or pending requests.
- **`startOverstayScheduler`**:
  - Verifies scheduler interval initialization and periodic job execution.

#### `server/tests/unit/visitModel.test.js`
- Validates creation of valid `Visit` documents with default fields (`Pending` status, `Company ID` default ID type, `isQrRevoked: false`, `isOverdue: false`).
- Enforces presence of all required fields (`visitorName`, `visitorPhone`, `organization`, `purpose`, `host`, `visitDate`, `expectedArrival`, `expectedDeparture`, `referenceNumber`).
- Validates status enum constraints (`Pending`, `Approved`, `Rejected`, `CheckedIn`, `CheckedOut`, `Cancelled`).
- Enforces strict uniqueness on reference numbers (`VST-YYYYMMDD-XXXX`).
- Validates string trimming across input fields.

---

### 4.2 Integration Tests

#### `server/tests/integration/authRoutes.test.js`
- **`POST /api/auth/register`**:
  - Registers new workplace accounts and returns signed JWT tokens.
  - Validates required fields (`name`, `email`, `password`).
  - Enforces duplicate email prevention (400 Bad Request).
- **`POST /api/auth/login`**:
  - Successfully authenticates users with valid work credentials, sets HTTP-only cookies, and returns user profile data.
  - Rejects incorrect passwords with 401.
  - Rejects unregistered email addresses with 401.
  - Prevents login for deactivated accounts (403 Forbidden).
- **`GET /api/auth/me`**:
  - Retrieves profile for authenticated sessions.
  - Rejects unauthenticated access with 401.
- **`POST /api/auth/logout`**:
  - Clears `vistara_token` session cookies.
- **`POST /api/auth/forgot-password`**:
  - Returns workplace IT helpdesk instructions.

#### `server/tests/integration/visitRoutes.test.js`
- **`POST /api/visits/register`**:
  - Allows public visitor registration and sets initial status to `Pending`.
  - Rejects registrations missing mandatory information.
  - Enforces that `expectedDeparture` must be strictly later than `expectedArrival`.
  - Automatically approves walk-in registrations when performed by a logged-in Receptionist.
- **`GET /api/visits/status/:ref`**:
  - Returns visitor clearance status and details given a reference number.
  - Returns 404 for non-existent reference numbers.
- **`POST /api/visits/:id/check-in`**:
  - Allows Receptionist or Admin to check in an `Approved` visitor.
  - Prevents checking in visits that are still `Pending`.
  - Enforces role-based authorization (rejects unauthorized roles with 403).
- **`POST /api/visits/:id/check-out`**:
  - Strictly enforces that only `security` personnel can complete checkouts.
  - Marks status as `CheckedOut`, revokes QR pass, and records departure timestamp.
  - Rejects checkout for visitors not currently `CheckedIn`.
- **`GET /api/visits`**:
  - Returns complete visitor lists for administrators.
  - Enforces host scoping (hosts can only view their own assigned visitors).
  - Supports status filtering (`?status=CheckedIn`).

---

## 5. How to Run Tests

From the `server` directory:

### Run all tests with coverage:
```bash
npm test
```

### Run only unit tests:
```bash
npx jest tests/unit
```

### Run only integration tests:
```bash
npx jest tests/integration
```

### Run tests in watch mode (during development):
```bash
npx jest --watch
```

---

## 6. Coverage Report Summary

| File / Component | % Statements | % Branch | % Functions | % Lines |
| :--- | :--- | :--- | :--- | :--- |
| **All Files** | **51.16%** | **41.73%** | **48.00%** | **52.10%** |
| `middleware/auth.js` | **100%** | **100%** | **100%** | **100%** |
| `models/Visit.js` | **100%** | **100%** | **100%** | **100%** |
| `models/User.js` | **100%** | **100%** | **100%** | **100%** |
| `models/Notification.js`| **100%** | **100%** | **100%** | **100%** |
| `models/AuditLog.js` | **100%** | **100%** | **100%** | **100%** |
| `models/SystemConfig.js`| **100%** | **100%** | **100%** | **100%** |
| `routes/authRoutes.js` | **100%** | **100%** | **100%** | **100%** |
| `services/overstayService.js` | **95.12%** | **76.19%** | **100%** | **97.43%** |
| `controllers/authController.js` | **89.09%** | **76.66%** | **100%** | **89.09%** |
| `routes/visitRoutes.js` | **88.09%** | **80.00%** | **50.00%** | **87.50%** |

*Test execution uses MongoDB Memory Server to guarantee 100% self-contained, offline-compatible, and zero-side-effect test execution.*
