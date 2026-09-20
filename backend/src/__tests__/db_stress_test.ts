/**
 * UWE Database & API Engine Load Test (Unthrottled Throughput)
 */
import app from '../index';
import autocannon from 'autocannon';
import jwt from 'jsonwebtoken';
import { getJwtSecret } from '../middlewares/authenticate';

const PORT = 5007;
const BASE_URL = `http://localhost:${PORT}`;

const adminToken = jwt.sign(
  { id: 'db-stress-admin', email: 'admin@uwe.lk', type: 'admin', role: 'SUPER_ADMIN' },
  getJwtSecret(),
  { expiresIn: '1h', algorithm: 'HS256' }
);

const PHASES = [
  { name: 'Phase 1: 10 concurrent connections',  connections: 10,  duration: 6 },
  { name: 'Phase 2: 50 concurrent connections',  connections: 50,  duration: 6 },
  { name: 'Phase 3: 100 concurrent connections', connections: 100, duration: 6 },
  { name: 'Phase 4: 200 concurrent connections', connections: 200, duration: 6 },
];

const ENDPOINTS = [
  {
    name: 'GET /api/courses (Database Catalog Read)',
    method: 'GET' as const,
    path: '/api/courses',
    headers: {},
  },
  {
    name: 'GET /api/gamification/leaderboard (DB Aggregation)',
    method: 'GET' as const,
    path: '/api/gamification/leaderboard',
    headers: {},
  },
  {
    name: 'GET /api/jobs (Job Vacancies Read)',
    method: 'GET' as const,
    path: '/api/jobs',
    headers: {},
  },
  {
    name: 'GET /api/users [Auth + RBAC + DB Select]',
    method: 'GET' as const,
    path: '/api/users',
    headers: { 'Authorization': `Bearer ${adminToken}` },
  },
];

function runBenchmark(endpoint: typeof ENDPOINTS[0], connections: number, duration: number): Promise<autocannon.Result> {
  return new Promise((resolve, reject) => {
    const opts: autocannon.Options = {
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
  process.env.NODE_ENV = 'test';

  const server = app.listen(PORT, async () => {
    console.log(`\n🚀 Benchmark server listening on http://localhost:${PORT}\n`);
    console.log('='.repeat(95));
    console.log('  🎯 RAW DATABASE & API ENGINE STRESS TEST (UNTHROTTLED DATABASE CAPACITY)');
    console.log('='.repeat(95));

    for (const phase of PHASES) {
      console.log(`\n▶ ${phase.name}`);

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
          console.log(`  ${status} ${endpoint.name.padEnd(46)} | ${rps.toFixed(0).padStart(5)} req/s | avg: ${avg.toFixed(1).padStart(5)}ms | p99: ${p99.toFixed(1).padStart(5)}ms | 2xx: ${total - non2xx}/${total}`);
        } catch (e: any) {
          console.log(`  ❌ ${endpoint.name}: ${e.message}`);
        }
      }
    }

    console.log('\n' + '='.repeat(95));
    server.close(() => {
      console.log('  Benchmark complete.\n');
      process.exit(0);
    });
  });
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
