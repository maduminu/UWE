import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import courseRoutes from './routes/courseRoutes';
import leadRoutes from './routes/leadRoutes';
import demoRoutes from './routes/demoRoutes';
import bannerRoutes from './routes/bannerRoutes';
import authRoutes from './routes/authRoutes';
import programVideoRoutes from './routes/programVideoRoutes';
import jobRoutes from './routes/jobRoutes';
import userRoutes from './routes/userRoutes';
import videoProgressRoutes from './routes/videoProgressRoutes';
import paymentSlipRoutes from './routes/paymentSlipRoutes';
import staffRoutes from './routes/staffRoutes';
import couponRoutes from './routes/couponRoutes';
import reviewRoutes from './routes/reviewRoutes';
import instructorRoutes from './routes/instructorRoutes';
import certificateRoutes from './routes/certificateRoutes';
import mastermindRoutes from './routes/mastermindRoutes';
import gamificationRoutes from './routes/gamificationRoutes';
import docsRoutes from './routes/docsRoutes';
import { requestLogger, logger } from './utils/logger';
import { errorHandler } from './middlewares/errorHandler';

dotenv.config();

// ── Startup Environment & Secrets Validation (Fail-Fast) ──────────────────
if (process.env.NODE_ENV !== 'test') {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    console.error('💥 FATAL ERROR: JWT_SECRET environment variable is missing or shorter than 32 characters.');
    process.exit(1);
  }
}

const app: Express = express();
const PORT = process.env.PORT || 5005;

// Trust Vercel / reverse-proxy headers for accurate client IP identification in rate-limiters
app.set('trust proxy', 1);

// ── Security Headers (Helmet) ───────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: false, // Allows Swagger UI CDN assets to render cleanly
}));

// ── Telemetry & Request Logging ────────────────────────────────────────────
app.use(requestLogger);

// ── CORS — Restricted to known domains & Vercel deployment URLs ───────────────
const ALLOWED_ORIGINS = [
  'https://uwe-pearl.vercel.app',
  'https://uwe.lk',
  'https://www.uwe.lk',
  'http://localhost:5173',
  'http://localhost:4173',
  'http://localhost:3000',
  'http://localhost:5005',
];

if (process.env.FRONTEND_URL) {
  ALLOWED_ORIGINS.push(process.env.FRONTEND_URL);
}

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (Postman, curl, server-to-server, or same-origin on Vercel)
    if (!origin) return callback(null, true);
    
    // Check exact list
    if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
    
    // Check wildcard for Vercel preview branch deployments (*.vercel.app)
    if (origin.endsWith('.vercel.app')) return callback(null, true);

    callback(new Error(`CORS policy: origin ${origin} not allowed`));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
  credentials: true,
}));

// ── Media & Payment Slip routes — registered BEFORE global body limit so image uploads aren't rejected ──
app.use('/api/slips', express.json({ limit: '10mb' }), express.urlencoded({ extended: true, limit: '10mb' }), paymentSlipRoutes);
app.use('/slips', express.json({ limit: '10mb' }), express.urlencoded({ extended: true, limit: '10mb' }), paymentSlipRoutes);
app.use('/api/demos', express.json({ limit: '10mb' }), express.urlencoded({ extended: true, limit: '10mb' }), demoRoutes);
app.use('/demos', express.json({ limit: '10mb' }), express.urlencoded({ extended: true, limit: '10mb' }), demoRoutes);
app.use('/api/program-videos', express.json({ limit: '10mb' }), express.urlencoded({ extended: true, limit: '10mb' }), programVideoRoutes);
app.use('/program-videos', express.json({ limit: '10mb' }), express.urlencoded({ extended: true, limit: '10mb' }), programVideoRoutes);

// ── Body Parsers with size limits (all other routes) ────────────────────────
app.use(express.json({ limit: '500kb' }));
app.use(express.urlencoded({ extended: true, limit: '500kb' }));

// ── Rate Limiters ───────────────────────────────────────────────────────────
// Auth: max 12 attempts per 15 minutes per IP (brute-force protection)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 12,
  message: { success: false, message: 'Too many login attempts. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Lead / job submissions: max 20 per hour per IP (spam protection)
const submissionLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  message: { success: false, message: 'Too many submissions from this IP. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// General API: 300 requests per 15 minutes
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api', generalLimiter);

// Root / Health Check Route
app.get('/', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ONLINE',
    system: 'UWE Backend Command Center API',
    version: '2.0.0',
    documentation: '/api/docs',
    endpoints: [
      '/api/docs', '/api/health', '/api/diagnostics', '/api/courses',
      '/api/leads', '/api/demos', '/api/banners', '/api/auth', '/api/jobs',
      '/api/users', '/api/slips', '/api/staff',
    ],
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/health', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'ONLINE', system: 'UWE Backend Command Center API', timestamp: new Date().toISOString() });
});

app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'ONLINE', system: 'UWE Backend Command Center API', timestamp: new Date().toISOString() });
});

// System Diagnostics Route
app.get('/api/diagnostics', (_req: Request, res: Response) => {
  const memoryUsage = process.memoryUsage();
  res.status(200).json({
    status: 'HEALTHY',
    system: 'UWE Command Server Telemetry',
    nodeVersion: process.version,
    uptimeSeconds: Math.floor(process.uptime()),
    memoryMb: {
      rss: Math.round(memoryUsage.rss / 1024 / 1024),
      heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
      heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
    },
    env: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
  });
});

// ── OpenAPI & Interactive Swagger Documentation ────────────────────────────
app.use('/api/docs', docsRoutes);
app.use('/docs', docsRoutes);

// ── API Routes ─────────────────────────────────────────────────────────────
app.use('/api/auth', authLimiter, authRoutes);
app.use('/auth', authLimiter, authRoutes);

app.use('/api/leads', submissionLimiter, leadRoutes);
app.use('/leads', submissionLimiter, leadRoutes);

app.use('/api/jobs', submissionLimiter, jobRoutes);
app.use('/jobs', submissionLimiter, jobRoutes);

app.use('/api/courses', courseRoutes);
app.use('/courses', courseRoutes);

app.use('/api/demos', demoRoutes);
app.use('/demos', demoRoutes);

app.use('/api/banners', bannerRoutes);
app.use('/banners', bannerRoutes);

app.use('/api/program-videos', programVideoRoutes);
app.use('/program-videos', programVideoRoutes);

app.use('/api/users', userRoutes);
app.use('/users', userRoutes);

app.use('/api/progress', videoProgressRoutes);
app.use('/progress', videoProgressRoutes);

app.use('/api/staff', staffRoutes);
app.use('/staff', staffRoutes);

app.use('/api/coupons', couponRoutes);
app.use('/coupons', couponRoutes);

app.use('/api/reviews', reviewRoutes);
app.use('/reviews', reviewRoutes);

app.use('/api/instructors', instructorRoutes);
app.use('/instructors', instructorRoutes);

app.use('/api/certificates', certificateRoutes);
app.use('/certificates', certificateRoutes);

app.use('/api/mastermind', mastermindRoutes);
app.use('/mastermind', mastermindRoutes);

app.use('/api/gamification', gamificationRoutes);
app.use('/gamification', gamificationRoutes);

// Error Middleware
app.use(errorHandler);

process.on('uncaughtException', (err) => {
  logger.error(`💥 Fatal Uncaught Exception: ${err.message}`, 'SYSTEM', { stack: err.stack });
  if (process.env.NODE_ENV !== 'test') {
    process.exit(1);
  }
});

process.on('unhandledRejection', (reason: any) => {
  logger.error(`💥 Fatal Unhandled Promise Rejection: ${reason?.message || reason}`, 'SYSTEM');
  if (process.env.NODE_ENV !== 'test') {
    process.exit(1);
  }
});

// Start Server (only in standalone/local mode, not inside Vercel serverless or unit tests)
if (!process.env.VERCEL && process.env.NODE_ENV !== 'test') {
  const server = app.listen(PORT, () => {
    logger.info(`🚀 UWE Backend API Server running on port ${PORT}`, 'SERVER');
    logger.info(`📡 Health Check: http://localhost:${PORT}/api/health`, 'SERVER');
    logger.info(`📖 OpenAPI Docs: http://localhost:${PORT}/api/docs`, 'SERVER');
  });

  server.on('error', (err) => {
    logger.error(`💥 Server Error: ${err.message}`, 'SERVER', { error: err });
  });
}

export default app;