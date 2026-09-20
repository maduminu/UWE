/**
 * UWE Live Hosted Production Stress Test (Vercel Serverless & CDN Edge)
 * Target: https://uwe-pearl.vercel.app
 */

const autocannon = require('autocannon');

const BASE_URL = 'https://uwe-pearl.vercel.app';

const PHASES = [
  { name: '🟢 Phase 1: 5 concurrent users (Normal traffic)',      connections: 5,   duration: 8 },
  { name: '🟡 Phase 2: 20 concurrent users (Moderate cloud load)', connections: 20,  duration: 8 },
  { name: '🟠 Phase 3: 50 concurrent users (Peak cloud load)',     connections: 50,  duration: 8 },
  { name: '🔴 Phase 4: 100 concurrent users (Serverless Stress)',  connections: 100, duration: 8 },
];

const ENDPOINTS = [
  {
    name: 'Frontend Static HTML / CDN (GET /)',
    method: 'GET',
    path: '/',
    headers: {},
  },
  {
    name: 'Serverless Health Check (GET /api/health)',
    method: 'GET',
    path: '/api/health',
    headers: {},
  },
  {
    name: 'Course Catalog Database API (GET /api/courses)',
    method: 'GET',
    path: '/api/courses',
    headers: {},
  },
  {
    name: 'Leaderboard API (GET /api/gamification/leaderboard)',
    method: 'GET',
    path: '/api/gamification/leaderboard',
    headers: {},
  },
];

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

function runBenchmark(endpoint, connections, duration) {
  return new Promise((resolve, reject) => {
    const opts = {
      url: `${BASE_URL}${endpoint.path}`,
      connections,
      duration,
      method: endpoint.method,
      headers: endpoint.headers || {},
      timeout: 20,
    };

    const instance = autocannon(opts, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });

    autocannon.track(instance, { renderProgressBar: false });
  });
}

async function main() {
  console.log('\n' + '='.repeat(100));
  console.log('  🌐 UWE LIVE HOSTED PLATFORM STRESS TEST (VERCEL CLOUD & SERVERLESS)');
  console.log(`  Target URL: ${BASE_URL}`);
  console.log(`  Phases: 5 → 100 concurrent remote connections`);
  console.log('='.repeat(100));

  const allResults = [];

  for (const phase of PHASES) {
    console.log(`\n▶ ${phase.name} (${phase.connections} connections × ${phase.duration}s)\n`);
    const phaseResults = [];

    for (const endpoint of ENDPOINTS) {
      process.stdout.write(`    ⏳ Testing ${endpoint.name}...`);
      try {
        const result = await runBenchmark(endpoint, phase.connections, phase.duration);
        const rps = result.requests.average || 0;
        const latencyAvg = result.latency.average || 0;
        const latencyP99 = result.latency.p99 || 0;
        const totalReqs = result.requests.total || 0;
        const errors = result.errors || 0;
        const timeouts = result.timeouts || 0;
        const non2xx = result.non2xx || 0;
        const throughput = result.throughput.average || 0;

        const status = (errors + timeouts === 0 && non2xx < totalReqs * 0.1) ? '✅' : '⚠️';
        console.log(`\r    ${status} ${endpoint.name}`);
        console.log(`       Throughput: ${rps.toFixed(1)} req/s (${totalReqs} total) | Bandwidth: ${formatBytes(throughput)}/s`);
        console.log(`       Latency: Avg: ${formatDuration(latencyAvg)} | P99: ${formatDuration(latencyP99)}`);
        if (errors > 0 || timeouts > 0 || non2xx > 0) {
          console.log(`       ⚠️  Errors: ${errors} | Timeouts: ${timeouts} | Non-2xx/RateLimited: ${non2xx}`);
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
      }
    }
    allResults.push({ phase: phase.name, connections: phase.connections, results: phaseResults });
  }

  console.log('\n' + '='.repeat(100));
  console.log('  📊 VERCEL LIVE CLOUD BENCHMARK SUMMARY');
  console.log('='.repeat(100));

  console.log('\n  Requests/sec (Throughput over Internet):\n');
  console.log('  ' + '─'.repeat(95));
  console.log('  ' + 'Endpoint'.padEnd(45) + '5 conn'.padStart(12) + '20 conn'.padStart(12) + '50 conn'.padStart(12) + '100 conn'.padStart(12));
  console.log('  ' + '─'.repeat(95));

  const endpointNames = ENDPOINTS.map(e => e.name);
  for (const name of endpointNames) {
    let row = '  ' + name.padEnd(45);
    for (const phase of allResults) {
      const r = phase.results.find(r => r.endpoint === name);
      if (r) {
        row += `${r.rps.toFixed(0)} rps`.padStart(12);
      } else {
        row += 'N/A'.padStart(12);
      }
    }
    console.log(row);
  }
  console.log('  ' + '─'.repeat(95));

  console.log('\n  P99 Latency (Round-Trip over Internet):\n');
  console.log('  ' + '─'.repeat(95));
  console.log('  ' + 'Endpoint'.padEnd(45) + '5 conn'.padStart(12) + '20 conn'.padStart(12) + '50 conn'.padStart(12) + '100 conn'.padStart(12));
  console.log('  ' + '─'.repeat(95));

  for (const name of endpointNames) {
    let row = '  ' + name.padEnd(45);
    for (const phase of allResults) {
      const r = phase.results.find(r => r.endpoint === name);
      if (r) {
        row += formatDuration(r.latencyP99).padStart(12);
      } else {
        row += 'N/A'.padStart(12);
      }
    }
    console.log(row);
  }
  console.log('  ' + '─'.repeat(95));
  console.log('\n' + '='.repeat(100));
}

main().catch(console.error);
