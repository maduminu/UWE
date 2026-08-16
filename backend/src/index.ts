import express, { Express, Request, Response } from 'express';
import cors from 'cors';
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
import { errorHandler } from './middlewares/errorHandler';

dotenv.config();

const app: Express = express();
const PORT = process.env.PORT || 5000;

// Middlewares
app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Root / Health Check Route
app.get('/', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ONLINE',
    system: 'UWE Backend Command Center API',
    message: 'Welcome to UWE API Gateway. Access endpoints at /api/*',
    endpoints: [
      '/api/health',
      '/api/courses',
      '/api/leads',
      '/api/demos',
      '/api/banners',
      '/api/auth',
      '/api/jobs',
      '/api/users',
      '/api/slips',
      '/api/staff',
    ],
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ONLINE',
    system: 'UWE Backend Command Center API',
    timestamp: new Date().toISOString(),
  });
});

app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ONLINE',
    system: 'UWE Backend Command Center API',
    timestamp: new Date().toISOString(),
  });
});

// API Routes (Mounted on both /api/* and /* for full routing compatibility)
app.use('/api/courses', courseRoutes);
app.use('/courses', courseRoutes);
app.use('/api/leads', leadRoutes);
app.use('/leads', leadRoutes);
app.use('/api/demos', demoRoutes);
app.use('/demos', demoRoutes);
app.use('/api/banners', bannerRoutes);
app.use('/banners', bannerRoutes);
app.use('/api/auth', authRoutes);
app.use('/auth', authRoutes);
app.use('/api/program-videos', programVideoRoutes);
app.use('/program-videos', programVideoRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/jobs', jobRoutes);
app.use('/api/users', userRoutes);
app.use('/users', userRoutes);
app.use('/api/progress', videoProgressRoutes);
app.use('/progress', videoProgressRoutes);
app.use('/api/slips', paymentSlipRoutes);
app.use('/slips', paymentSlipRoutes);
app.use('/api/staff', staffRoutes);
app.use('/staff', staffRoutes);

// Error Middleware
app.use(errorHandler);

process.on('uncaughtException', (err) => {
  console.error('💥 Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason) => {
  console.error('💥 Unhandled Rejection:', reason);
});

// Start Server (only in standalone/local mode, not inside Vercel serverless)
if (!process.env.VERCEL) {
  const server = app.listen(PORT, () => {
    console.log(`🚀 UWE Backend API Server running on port ${PORT}`);
    console.log(`📡 Health Check: http://localhost:${PORT}/api/health`);
  });

  server.on('error', (err) => {
    console.error('💥 Server Error:', err);
  });
}

export default app;