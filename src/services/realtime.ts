import { useEffect } from 'react';

export type RealtimeEventName =
  | 'banner:updated'
  | 'course:updated'
  | 'slip:verified'
  | 'slip:rejected'
  | 'video:updated'
  | 'mastermind:updated'
  | 'mastermind:new_question'
  | 'mastermind:upvoted'
  | 'mastermind:answered'
  | 'mastermind:deleted'
  | 'mastermind:reply'
  | 'mastermind:solved'
  | 'review:updated'
  | 'user:updated'
  | 'job:updated'
  | 'job_app:updated'
  | 'session:revoked'
  | 'progress:updated'
  | 'notification:new'
  | 'notification:read'
  | 'calllog:updated'
  | 'lead:locked'
  | 'lead:unlocked'
  | 'lead:signed_up';

// ── Multi-Tab BroadcastChannel for instantaneous cross-tab synchronization ──
const localBroadcast = typeof window !== 'undefined' && 'BroadcastChannel' in window
  ? new BroadcastChannel('uwe_realtime_channel')
  : null;

if (localBroadcast) {
  localBroadcast.onmessage = (event) => {
    if (event.data && event.data.type) {
      window.dispatchEvent(new CustomEvent(`realtime:${event.data.type}`, { detail: event.data.payload }));
      window.dispatchEvent(new CustomEvent('realtime:all', { detail: event.data }));
    }
  };
}

/**
 * Broadcast locally across open browser tabs immediately
 */
export function broadcastLocally(type: RealtimeEventName, payload: any = {}): void {
  if (localBroadcast) {
    try {
      localBroadcast.postMessage({ type, payload, timestamp: Date.now() });
    } catch { /* ignore */ }
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(`realtime:${type}`, { detail: payload }));
    window.dispatchEvent(new CustomEvent('realtime:all', { detail: { type, payload } }));
  }
}

// ── Server-Sent Events (SSE) with Exponential Backoff & Zombie Watchdog ─────
let sseSource: EventSource | null = null;
let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
let watchdogInterval: ReturnType<typeof setInterval> | null = null;
let resetSuccessTimer: ReturnType<typeof setTimeout> | null = null;

let reconnectAttempts = 0;
let lastActivityTime = Date.now();
let isConnectingOrConnected = false;

const INITIAL_RECONNECT_DELAY = 1500; // 1.5s
const MAX_RECONNECT_DELAY = 30000;     // 30s
const BACKOFF_MULTIPLIER = 1.6;
const HEARTBEAT_WATCHDOG_TIMEOUT = 55000; // 55s (Server emits :keepalive every 25s)

const ALL_REALTIME_EVENTS: RealtimeEventName[] = [
  'banner:updated',
  'course:updated',
  'slip:verified',
  'slip:rejected',
  'video:updated',
  'mastermind:updated',
  'mastermind:new_question',
  'mastermind:upvoted',
  'mastermind:answered',
  'mastermind:deleted',
  'mastermind:reply',
  'mastermind:solved',
  'review:updated',
  'user:updated',
  'job:updated',
  'job_app:updated',
  'session:revoked',
  'progress:updated',
  'calllog:updated',
  'lead:locked',
  'lead:unlocked',
  'lead:signed_up',
];

/**
 * Calculate exponential backoff with full random jitter
 * Prevents "thundering herd" reconnection storms on server restarts.
 */
function calculateBackoffDelay(): number {
  const baseDelay = Math.min(
    INITIAL_RECONNECT_DELAY * Math.pow(BACKOFF_MULTIPLIER, reconnectAttempts),
    MAX_RECONNECT_DELAY
  );
  const jitter = Math.random() * 800;
  return Math.round(baseDelay + jitter);
}

/**
 * Teardown current active EventSource connection cleanly
 */
function closeCurrentConnection(): void {
  if (sseSource) {
    try {
      sseSource.close();
    } catch { /* ignore */ }
    sseSource = null;
  }
  isConnectingOrConnected = false;
}

/**
 * Start or reset idle connection watchdog.
 * If no keepalive comment or message is received within 55s, closes and reconnects.
 */
function restartWatchdog(): void {
  lastActivityTime = Date.now();
  if (watchdogInterval) clearInterval(watchdogInterval);

  watchdogInterval = setInterval(() => {
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
      // Don't kill connections aggressively if the user minimized the tab
      return;
    }

    if (Date.now() - lastActivityTime > HEARTBEAT_WATCHDOG_TIMEOUT) {
      console.warn('⚠️ [Realtime] Heartbeat watchdog timeout (55s without activity). Forcing clean reconnection...');
      scheduleReconnection(true);
    }
  }, 15000);
}

/**
 * Schedule reconnection with exponential backoff
 */
function scheduleReconnection(immediate = false): void {
  closeCurrentConnection();

  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
    reconnectTimeout = null;
  }

  const delay = immediate ? 200 : calculateBackoffDelay();
  reconnectAttempts++;

  console.log(`📡 [Realtime] Reconnecting in ${(delay / 1000).toFixed(2)}s (attempt #${reconnectAttempts})...`);

  reconnectTimeout = setTimeout(() => {
    reconnectTimeout = null;
    initRealtimeConnection();
  }, delay);
}

/**
 * Initialize SSE connection with heartbeat handling and lifecycle resilience
 */
export function initRealtimeConnection(): () => void {
  if (typeof window === 'undefined') return () => {};

  // If already open or connecting, do not create duplicate stream
  if (sseSource && (sseSource.readyState === EventSource.OPEN || sseSource.readyState === EventSource.CONNECTING)) {
    return () => {};
  }

  if (isConnectingOrConnected) {
    return () => {};
  }

  isConnectingOrConnected = true;
  closeCurrentConnection();

  const streamUrl = `${window.location.origin}/api/realtime/stream`;

  try {
    sseSource = new EventSource(streamUrl);
    restartWatchdog();

    sseSource.onopen = () => {
      console.log('⚡ [Realtime] Live SSE connection established');
      lastActivityTime = Date.now();

      // Reset backoff attempts only after 3.5 seconds of sustained connection
      if (resetSuccessTimer) clearTimeout(resetSuccessTimer);
      resetSuccessTimer = setTimeout(() => {
        reconnectAttempts = 0;
      }, 3500);
    };

    // Generic message listener (catches keepalives and default events)
    sseSource.onmessage = () => {
      lastActivityTime = Date.now();
    };

    // Listen to connected handshake
    sseSource.addEventListener('connected', () => {
      lastActivityTime = Date.now();
    });

    // Register all platform real-time event listeners
    ALL_REALTIME_EVENTS.forEach((eventName) => {
      sseSource?.addEventListener(eventName, (e: MessageEvent) => {
        lastActivityTime = Date.now();

        try {
          const parsed = JSON.parse(e.data);
          const data = parsed.data || {};
          console.log(`📡 [Realtime] Received '${eventName}':`, data);

          // Dispatch local DOM CustomEvent for active React hooks
          window.dispatchEvent(new CustomEvent(`realtime:${eventName}`, { detail: data }));
          window.dispatchEvent(new CustomEvent('realtime:all', { detail: { type: eventName, payload: data } }));

          // Mirror instantaneously across open browser tabs via BroadcastChannel
          if (localBroadcast) {
            localBroadcast.postMessage({ type: eventName, payload: data, timestamp: Date.now() });
          }
        } catch (err) {
          console.warn(`[Realtime] Failed to parse payload for '${eventName}':`, err);
        }
      });
    });

    sseSource.onerror = (err) => {
      console.warn('⚠️ [Realtime] SSE connection interrupted/closed by remote host or proxy:', err);
      scheduleReconnection(false);
    };
  } catch (err) {
    console.warn('❌ [Realtime] Failed to initialize EventSource instance:', err);
    scheduleReconnection(false);
  }

  return () => {
    closeCurrentConnection();
    if (reconnectTimeout) clearTimeout(reconnectTimeout);
    if (watchdogInterval) clearInterval(watchdogInterval);
    if (resetSuccessTimer) clearTimeout(resetSuccessTimer);
  };
}

// ── Browser Lifecycle Resilience Listeners ──────────────────────────────────
if (typeof window !== 'undefined') {
  // Reconnect immediately when network connection is restored
  window.addEventListener('online', () => {
    console.log('🌐 [Realtime] Network back online — initiating immediate reconnect');
    reconnectAttempts = 0;
    scheduleReconnection(true);
  });

  // Re-verify stream health when user switches back to this tab
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      if (!sseSource || sseSource.readyState === EventSource.CLOSED) {
        console.log('👁️ [Realtime] Tab focused & connection was closed — reconnecting');
        scheduleReconnection(true);
      } else if (Date.now() - lastActivityTime > HEARTBEAT_WATCHDOG_TIMEOUT) {
        console.log('👁️ [Realtime] Tab focused & heartbeat expired — refreshing stream');
        scheduleReconnection(true);
      }
    }
  });
}

/**
 * React hook to listen for specific real-time events and trigger live UI updates
 */
export function useRealtimeEvent(event: RealtimeEventName, callback: (detail: any) => void) {
  useEffect(() => {
    initRealtimeConnection();

    const handler = (e: Event) => {
      const customEvent = e as CustomEvent;
      callback(customEvent.detail);
    };

    window.addEventListener(`realtime:${event}`, handler);
    return () => {
      window.removeEventListener(`realtime:${event}`, handler);
    };
  }, [event, callback]);
}
