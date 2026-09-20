import { Request, Response } from 'express';
import { logger } from './logger';

export type RealtimeEventType =
  | 'banner:updated'
  | 'course:updated'
  | 'slip:verified'
  | 'slip:rejected'
  | 'slip:updated'
  | 'video:updated'
  | 'mastermind:updated'
  | 'mastermind:new_question'
  | 'mastermind:upvoted'
  | 'mastermind:answered'
  | 'mastermind:deleted'
  | 'review:updated'
  | 'user:updated'
  | 'job:updated'
  | 'job_app:updated'
  | 'session:revoked'
  | 'progress:updated'
  | 'mastermind:reply'
  | 'mastermind:solved'
  | 'notification:new'
  | 'notification:read'
  | 'calllog:updated'
  | 'lead:locked'
  | 'lead:unlocked'
  | 'lead:signed_up'
  | 'ping';

interface ConnectedClient {
  id: string;
  res: Response;
  ip: string;
  connectedAt: number;
}

const clients = new Map<string, ConnectedClient>();

// Periodic 25-second server-side heartbeat (:keepalive\n\n) to prevent Cloudflare, Nginx, and proxies from terminating idle connections
const heartbeatInterval = setInterval(() => {
  if (clients.size === 0) return;
  const pingMessage = `:keepalive\n\n`;
  for (const [id, client] of clients.entries()) {
    try {
      client.res.write(pingMessage);
      if (typeof (client.res as any).flush === 'function') {
        (client.res as any).flush();
      }
    } catch {
      clients.delete(id);
    }
  }
}, 25000);

// Prevent heartbeat from holding open Node process during tests/graceful shutdowns
if (heartbeatInterval && typeof heartbeatInterval.unref === 'function') {
  heartbeatInterval.unref();
}

/**
 * Handle incoming SSE subscription stream from browsers
 */
export function handleRealtimeStream(req: Request, res: Response): void {
  const clientId = `client_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const clientIp = req.ip || 'unknown';

  // Set SSE Headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();

  // Send immediate heartbeat comment to defeat proxy buffering
  res.write(`:keepalive\n\n`);

  const client: ConnectedClient = {
    id: clientId,
    res,
    ip: clientIp,
    connectedAt: Date.now(),
  };

  clients.set(clientId, client);
  logger.info(`[REALTIME] Client connected (${clientId}) — total active: ${clients.size}`, 'REALTIME');

  // Initial welcome event
  res.write(`event: connected\ndata: ${JSON.stringify({ clientId, timestamp: new Date().toISOString() })}\n\n`);

  // Cleanup on connection termination
  req.on('close', () => {
    clients.delete(clientId);
    logger.info(`[REALTIME] Client disconnected (${clientId}) — remaining: ${clients.size}`, 'REALTIME');
  });
}

/**
 * Broadcast an event instantly to all connected browser clients
 */
export function broadcastRealtimeEvent(event: RealtimeEventType, data: Record<string, any> = {}): void {
  const payload = {
    event,
    data,
    timestamp: new Date().toISOString(),
  };

  const sseChunk = `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;
  let activeCount = 0;

  for (const [id, client] of clients.entries()) {
    try {
      client.res.write(sseChunk);
      if (typeof (client.res as any).flush === 'function') {
        (client.res as any).flush();
      }
      activeCount++;
    } catch {
      clients.delete(id);
    }
  }

  logger.info(`[REALTIME] Broadcasted '${event}' to ${activeCount} active stream(s)`, 'REALTIME');
}

export function getActiveRealtimeClientsCount(): number {
  return clients.size;
}
