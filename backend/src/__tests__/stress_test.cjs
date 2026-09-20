/**
 * UWE Server Stress Test — Progressive Concurrency Load Testing
 *
 * Tests the server under increasing concurrent connection levels:
 *   Phase 1: 10 concurrent users (warm-up)
 *   Phase 2: 50 concurrent users (moderate load)
 *   Phase 3: 100 concurrent users (heavy load)
 *   Phase 4: 200 concurrent users (stress test)
 *   Phase 5: 500 concurrent users (breaking point)
 *
 * Endpoints tested per phase:
 *   - GET  /api/health          (lightweight — baseline)
 *   - GET  /api/courses         (database read — catalog)
 *   - POST /api/leads           (database write — form submission)
 *   - GET  /api/gamification/leaderboard (cached/computed)
 */

const autocannon = require('autocannon');
const jwt = require('jsonwebtoken');

const BASE_URL = process.env.BASE_URL || 'http://localhost:5005';
const JWT_SECRET = process.env.JWT_SECRET || 'uwe-jwt-secret-dev-key-change-in-production';

// Generate a valid student token for authenticated endpoints
const studentToken = jwt.sign(
  { id: 'loadtest-student', email: 'loadtest@uwe.lk', type: 'student' },
  JWT_SECRET,
  { expiresIn: '1h', algorithm: 'HS256' }
);

const adminToken = jwt.sign(
  { id: 'loadtest-admin', email: 'loadtest-admin@uwe.lk', type: 'admin', role: 'SUPER_ADMIN' },
  JWT_SECRET,
  { expiresIn: '1h', algorithm: 'HS256' }
);

// ── Test Configurations ─────────────────────────────────────────────────────

const PHASES = [
  { name: '🟢 Phase 1: Warm-Up',       connections: 10,  duration: 10 },
  { name: '🟡 Phase 2: Moderate Load',  connections: 50,  duration: 10 },
  { name: '🟠 Phase 3: Heavy Load',     connections: 100, duration: 10 },
  { name: '🔴 Phase 4: Stress Test',    connections: 200, duration: 10 },
  { name: '💀 Phase 5: Breaking Point', connections: 500, duration: 10 },
];

const ENDPOINTS = [
  {
    name: 'Health Check (GET /api/health)',
    method: 'GET',
    path: '/api/health',
    headers: {},
  },
  {
    name: 'Course Catalog (GET /api/courses)',
    method: 'GET',
    path: '/api/courses',
    headers: {},
  },
  {
    name: 'Lead Submission (POST /api/leads)',
    method: 'POST',
    path: '/api/leads',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Load Test User',
      phone: '+94771234567',
      message: 'Stress test inquiry',
    }),
  },
  {
    name: 'Leaderboard (GET /api/gamification/leaderboard)',
    method: 'GET',
    path: '/api/gamification/leaderboard',
    headers: {},
  },
  {
    name: 'Admin Users (GET /api/users) [Auth]',
    method: 'GET',
    path: '/api/users',
    headers: { 'Authorization': `Bearer ${adminToken}` },
  },
];

// ── Formatting Helpers ──────────────────────────────────────────────────────

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatDuration(ms) {
  if (ms < 1) return `${(ms * 1000).toFixed(0)}µs`;
  if (ms < 1000) return `${ms.toFixed(1)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function printSeparator(char = '─', len = 80) {
  console.log(char.repeat(len));
}

// ── Single Benchmark Runner ─────────────────────────────────────────────────

function runBenchmark(endpoint, connections, duration) {
  return new Promise((resolve, reject) => {
    const opts = {
      url: `${BASE_URL}${endpoint.path}`,
      connections,
      duration,
      method: endpoint.method,
      headers: endpoint.headers || {},
      ...(endpoint.body ? { body: endpoint.body } : {}),
      timeout: 30,
    };

    const instance = autocannon(opts, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });

    // Suppress default autocannon output
    autocannon.track(instance, { renderProgressBar: false });
  });
}

// ── Main Test Runner ────────────────────────────────────────────────────────

async function main() {
  console.log('\n');
  printSeparator('═');
  console.log('  🔥 UWE SERVER STRESS TEST — MAXIMUM CONCURRENCY ANALYSIS');
  console.log(`  Target: ${BASE_URL}`);
  console.log(`  Phases: ${PHASES.length} (10 → 500 concurrent connections)`);
  console.log(`  Endpoints: ${ENDPOINTS.length} per phase`);
  printSeparator('═');

  // Quick connectivity check
  try {
    const http = require('http');
    await new Promise((resolve, reject) => {
      const req = http.get(`${BASE_URL}/api/health`, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          if (res.statusCode === 200) {
            console.log('\n  ✅ Server is reachable. Starting load test...\n');
            resolve();
          } else {
            reject(new Error(`Health check returned ${res.statusCode}`));
          }
        });
      });
      req.on('error', reject);
      req.setTimeout(5000, () => { req.destroy(); reject(new Error('Connection timeout')); });
    });
  } catch (err) {
    console.error(`\n  ❌ Cannot reach server at ${BASE_URL}: ${err.message}`);
    console.error('  → Start the server first: cd backend && npm run dev\n');
    process.exit(1);
  }

  const allResults = [];

  for (const phase of PHASES) {
    printSeparator('─');
    console.log(`\n  ${phase.name} — ${phase.connections} concurrent connections × ${phase.duration}s\n`);

    const phaseResults = [];

    for (const endpoint of ENDPOINTS) {
      process.stdout.write(`    ⏳ ${endpoint.name}...`);

      try {
        const result = await runBenchmark(endpoint, phase.connections, phase.duration);

        const rps = result.requests.average || 0;
        const latencyAvg = result.latency.average || 0;
        const latencyP99 = result.latency.p99 || 0;
        const errors = result.errors || 0;
        const timeouts = result.timeouts || 0;
        const non2xx = result.non2xx || 0;
        const totalReqs = result.requests.total || 0;
        const throughput = result.throughput.average || 0;

        const status = (errors + timeouts === 0 && non2xx < totalReqs * 0.05) ? '✅' : '⚠️';

        console.log(`\r    ${status} ${endpoint.name}`);
        console.log(`       Requests/sec: ${rps.toFixed(1)} | Total: ${totalReqs}`);
        console.log(`       Latency avg: ${formatDuration(latencyAvg)} | p99: ${formatDuration(latencyP99)}`);
        console.log(`       Throughput: ${formatBytes(throughput)}/sec`);
        if (errors > 0 || timeouts > 0 || non2xx > 0) {
          console.log(`       ⚠️  Errors: ${errors} | Timeouts: ${timeouts} | Non-2xx: ${non2xx}`);
        }
        console.log('');

        phaseResults.push({
          endpoint: endpoint.name,
          connections: phase.connections,
          rps,
          latencyAvg,
          latencyP99,
          totalReqs,
          errors,
          timeouts,
          non2xx,
          throughput,
        });
      } catch (err) {
        console.log(`\r    ❌ ${endpoint.name} — FAILED: ${err.message}\n`);
        phaseResults.push({
          endpoint: endpoint.name,
          connections: phase.connections,
          rps: 0, latencyAvg: 0, latencyP99: 0, totalReqs: 0,
          errors: 1, timeouts: 0, non2xx: 0, throughput: 0,
          failed: true,
        });
      }
    }

    allResults.push({ phase: phase.name, connections: phase.connections, results: phaseResults });
  }

  // ── Final Summary Report ──────────────────────────────────────────────────

  console.log('\n');
  printSeparator('═');
  console.log('  📊 FINAL STRESS TEST REPORT');
  printSeparator('═');

  console.log('\n  Requests/sec by Concurrency Level:\n');
  console.log('  ' + '─'.repeat(110));
  console.log(
    '  ' +
    'Endpoint'.padEnd(45) +
    '10 conn'.padStart(12) +
    '50 conn'.padStart(12) +
    '100 conn'.padStart(12) +
    '200 conn'.padStart(12) +
    '500 conn'.padStart(12)
  );
  console.log('  ' + '─'.repeat(110));

  // Pivot data by endpoint
  const endpointNames = ENDPOINTS.map(e => e.name);
  for (const name of endpointNames) {
    let row = '  ' + name.padEnd(45);
    for (const phase of allResults) {
      const r = phase.results.find(r => r.endpoint === name);
      if (r && !r.failed) {
        row += `${r.rps.toFixed(0)} rps`.padStart(12);
      } else {
        row += 'FAIL'.padStart(12);
      }
    }
    console.log(row);
  }
  console.log('  ' + '─'.repeat(110));

  console.log('\n  P99 Latency by Concurrency Level:\n');
  console.log('  ' + '─'.repeat(110));
  console.log(
    '  ' +
    'Endpoint'.padEnd(45) +
    '10 conn'.padStart(12) +
    '50 conn'.padStart(12) +
    '100 conn'.padStart(12) +
    '200 conn'.padStart(12) +
    '500 conn'.padStart(12)
  );
  console.log('  ' + '─'.repeat(110));

  for (const name of endpointNames) {
    let row = '  ' + name.padEnd(45);
    for (const phase of allResults) {
      const r = phase.results.find(r => r.endpoint === name);
      if (r && !r.failed) {
        row += formatDuration(r.latencyP99).padStart(12);
      } else {
        row += 'FAIL'.padStart(12);
      }
    }
    console.log(row);
  }
  console.log('  ' + '─'.repeat(110));

  // Error summary
  console.log('\n  Error Summary:\n');
  let totalErrors = 0;
  let totalTimeouts = 0;
  let totalNon2xx = 0;

  for (const phase of allResults) {
    for (const r of phase.results) {
      totalErrors += r.errors;
      totalTimeouts += r.timeouts;
      totalNon2xx += r.non2xx;
    }
  }

  // Find the max concurrency that was stable (< 5% error rate)
  let maxStableConcurrency = 0;
  for (const phase of allResults) {
    const totalReqs = phase.results.reduce((sum, r) => sum + r.totalReqs, 0);
    const totalFails = phase.results.reduce((sum, r) => sum + r.errors + r.timeouts, 0);
    const errorRate = totalReqs > 0 ? (totalFails / totalReqs) * 100 : 100;

    if (errorRate < 5) {
      maxStableConcurrency = phase.connections;
    }
  }

  console.log(`  Total Errors:   ${totalErrors}`);
  console.log(`  Total Timeouts: ${totalTimeouts}`);
  console.log(`  Total Non-2xx:  ${totalNon2xx}`);
  console.log(`\n  🏆 Maximum Stable Concurrency: ${maxStableConcurrency} simultaneous connections`);

  // Estimate concurrent users (assuming 1 request every 3 seconds per user)
  const peakRps = allResults
    .filter(p => p.connections === maxStableConcurrency)
    .flatMap(p => p.results)
    .reduce((max, r) => Math.max(max, r.rps), 0);

  const estimatedUsers = Math.floor(peakRps * 3); // 1 req per 3s per user
  console.log(`  📈 Estimated Concurrent Users (at peak RPS): ~${estimatedUsers} users`);
  console.log(`  ⚡ Peak Throughput: ${peakRps.toFixed(0)} requests/second\n`);

  printSeparator('═');
  console.log('  Load test complete.\n');
}

main().catch(console.error);
