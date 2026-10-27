require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const connectDB = require('./config/db');
const seedDatabase = require('./services/seed');
const { startOverstayScheduler } = require('./services/overstayService');

// Route Imports
const authRoutes = require('./routes/authRoutes');
const visitRoutes = require('./routes/visitRoutes');
const userRoutes = require('./routes/userRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const systemRoutes = require('./routes/systemRoutes');

const app = express();

// Security and Essential Middlewares
app.use(helmet({
  crossOriginResourcePolicy: false,
}));

app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
  })
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Health Check API
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    system: 'Vistara Enterprise Visitor Management System',
    timestamp: new Date().toISOString(),
  });
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/visits', visitRoutes);
app.use('/api/users', userRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/system', systemRoutes);

// Fallback 404 Handler for API
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `API endpoint '${req.originalUrl}' not found.`,
  });
});

// Central Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

const PORT = process.env.PORT || 5000;

// Initialize Server, Database & Overstay Detection Engine
async function startServer() {
  try {
    await connectDB();

    // Auto-seed demo data if database is fresh
    const User = require('./models/User');
    const userCount = await User.countDocuments();
    if (userCount === 0) {
      console.log('Database is empty. Populating Vistara demo records...');
      await seedDatabase();
    }

    // Start background overstay evaluation job (runs every 60 seconds)
    startOverstayScheduler(60000);

    // Start background safe End-of-Day active list cleanup scheduler (runs every 60 seconds)
    const { startEodScheduler } = require('./services/eodCleanupService');
    startEodScheduler(60000);

    app.listen(PORT, () => {
      console.log(`=======================================================`);
      console.log(`🚀 Vistara Enterprise Server running on port ${PORT}`);
      console.log(`🌐 API base: http://localhost:${PORT}/api`);
      console.log(`🛡️  Security: CORS enabled for ${process.env.CLIENT_URL || 'http://localhost:5173'}`);
      console.log(`=======================================================`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

if (process.env.NODE_ENV !== 'test') {
  startServer();
}

module.exports = app;
