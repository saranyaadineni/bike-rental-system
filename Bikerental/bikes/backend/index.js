import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/database.js';
import authRoutes from './routes/auth.js';
import bikeRoutes from './routes/bikes.js';
import rentalRoutes from './routes/rentals.js';
import userRoutes from './routes/users.js';
import documentRoutes from './routes/documents.js';
import locationRoutes from './routes/locations.js';
import paymentRoutes from './routes/payments.js';
import settingsRoutes from './routes/settings.js';
import heroImageRoutes from './routes/heroImages.js';
import supportRoutes from './routes/support.js';
import { initCronJobs } from './utils/cron.js';

dotenv.config();
if (!process.env.MONGODB_URI) {
  dotenv.config({ path: './.env.example' });
}

const app = express();
const PORT = 3000;

// Connect to MongoDB
connectDB();

// Initialize scheduled tasks
initCronJobs();

// Middleware
const defaultOrigins = [
  'http://localhost:8080',
  'http://localhost:8081',
  'http://127.0.0.1:8080',
  'http://127.0.0.1:8081',
  'http://192.168.0.100:8080',
  'http://192.168.0.100:8081',
];
const extraOrigins = (process.env.FRONTEND_URLS || '')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);
const allowedOrigins = [
  ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : []),
  ...defaultOrigins,
  ...extraOrigins,
];
function isDevOrigin(origin) {
  if (!origin) return true;
  return /^http:\/\/(localhost|127\.0\.0\.1|192\.168\.)\d{1,3}(:\d+)?$/.test(origin);
}
app.use(cors({
  origin: (origin, callback) => {
    if (process.env.CORS_ALLOW_ALL === 'true' || process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    if (!origin || allowedOrigins.includes(origin) || isDevOrigin(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET','POST','PUT','DELETE','OPTIONS'],
  allowedHeaders: ['Authorization','Content-Type'],
  optionsSuccessStatus: 204,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/bikes', bikeRoutes);
app.use('/api/rentals', rentalRoutes);
app.use('/api/users', userRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/hero-images', heroImageRoutes);
app.use('/api/support', supportRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// Root info route to avoid "Cannot GET /" confusion
app.get('/', (req, res) => {
  res.type('text').send('Bike Rental API is running. Use /api/* endpoints.');
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

const server = app.listen(PORT, () => {
  console.log(`🚀 Backend server running on http://localhost:${PORT}`);
  const r = process.env.AWS_REGION;
  const b = process.env.AWS_S3_BUCKET;
  if (!r || !b) {
    console.warn('⚠️ AWS env missing: AWS_REGION or AWS_S3_BUCKET not set');
  }
});
server.on('error', (err) => {
  console.error(err);
  process.exit(1);
});
