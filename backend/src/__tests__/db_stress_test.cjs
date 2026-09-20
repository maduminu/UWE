/**
 * UWE Database & Application Engine Stress Test (Unthrottled Throughput)
 * Runs with NODE_ENV=test (bypasses rate limiters) to measure true DB & compute capacity.
 */

const http = require('http');
const autocannon = require('autocannon');
const jwt = require('jsonwebtoken');

const PORT = 5006;
const BASE_URL = `http://localhost:${PORT}`;
const JWT_SECRET = 'uwe-jwt-secret-dev-key-change-in-production';

const adminToken = jwt.sign(
  { id: 'db-stress-admin', email: 'admin@uwe.lk', type: 'admin', role: 'SUPER_ADMIN' },
  JWT_SECRET,
  { expiresIn: '1h', algorithm: 'HS256' }
);

const PHASES = [
  { name: 'Phase 1: 10 concurrent DB connections',  connections: 10,  duration: 6 },
  { name: 'Phase 2: 50 concurrent DB connections',  connections: 50,  duration: 6 },
  { name: 'Phase 3: 100 concurrent DB connections', connections: 100, duration: 6 },
  { name: 'Phase 4: 200 concurrent DB connections', connections: 200, duration: 6 },
];

const ENDPOINTS = [
  {
    name: 'GET /api/courses (Full DB Read + Query)',
    method: 'GET',
    path: '/api/courses',
  },
  {
    name: 'GET /api/gamification/leaderboard (DB Aggregation)',
    method: 'GET',
    path: '/api/gamification/leaderboard',
  },
  {
    name: 'GET /api/jobs (DB Query + Relation)',
    method: 'GET',
    path: '/api/jobs',
  },
  {
    name: 'GET /api/users [Auth + RBAC + DB Select]',
    method: 'GET',
    path: '/api/users',
    headers: { 'Authorization': `Bearer ${adminToken}` },
  },
];

function runBenchmark(endpoint, connections, duration) {
  return new Promise((resolve, reject) => {
    const opts = {
      url: `${BASE_URL}${endpoint.path}`,
      connections,
      duration,
      method: endpoint.method,
      headers: endpoint.headers || {},
      timeout: 30,
    };

    autocannon(opts, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
  });
}

async function main() {
  // Start express app on PORT 5006
  process.env.NODE_ENV = 'test';
  process.env.PORT = String(PORT);

  const { default: app } = await import('../../dist/index.js').catch(async () => {
    // Fallback to tsx
    return { default: require('../index.ts') };
  });

  const server = app.listen(PORT, async () => {
    console.log(`\n🚀 Test server listening on http://localhost:${PORT} (Rate Limiting Disabled)\n`);

    console.log('='.repeat(90));
    console.log('  🎯 RAW DATABASE & API ENGINE STRESS TEST (UNTHROTTLED THROUGHPUT)');
    console.log('='.repeat(90));

    for (const phase of PHASES) {
      console.log(`\n▶ ${phase.name} (${phase.connections} connections)`);

      for (const endpoint of ENDPOINTS) {
        try {
          const result = await runBenchmark(endpoint, phase.connections, phase.duration);
          const rps = result.requests.average || 0;
          const p99 = result.latency.p99 || 0;
          const avg = result.latency.average || 0;
          const errors = result.errors || 0;
          const non2xx = result.non2xx || 0;
          const total = result.requests.total || 0;

          const status = (errors === 0 && non2xx === 0) ? '✅' : '⚠️';
          console.log(`  ${status} ${endpoint.name.padEnd(45)} | ${rps.toFixed(0).padStart(5)} req/s | avg: ${avg.toFixed(1)}ms | p99: ${p99.toFixed(1)}ms | 2xx: ${total - non2xx}/${total}`);
        } catch (e) {
          console.log(`  ❌ ${endpoint.name}: ${e.message}`);
        }
      }
    }

    console.log('\n' + '='.repeat(90));
    server.close(() => {
      console.log('  Server stopped. Test complete.\n');
      process.exit(0);
    });
  });
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
