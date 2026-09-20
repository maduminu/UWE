import { Router } from 'express';
import { handleRealtimeStream, getActiveRealtimeClientsCount } from '../utils/realtimeEmitter';

const router = Router();

// Stream endpoint for browsers (SSE / EventSource)
router.get('/stream', handleRealtimeStream);

// Status endpoint to check active listener count
router.get('/status', (_req, res) => {
  res.status(200).json({
    success: true,
    activeStreams: getActiveRealtimeClientsCount(),
    timestamp: new Date().toISOString(),
  });
});

export default router;
