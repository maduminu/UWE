/**
 * UWE Live Hosted Stress Test: 200 & 500 Concurrent Connections
 * Target: https://uwe-pearl.vercel.app
 */

const autocannon = require('autocannon');

const BASE_URL = 'https://uwe-pearl.vercel.app';

const PHASES = [
  { name: '🔥 Phase 1: 200 Concurrent Remote Connections', connections: 200, duration: 10 },
  { name: '💀 Phase 2: 500 Concurrent Remote Connections', connections: 500, duration: 12 },
];

const ENDPOINTS = [
  {
    name: 'Frontend Static HTML (GET /)',
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
      timeout: 30,
    };

    const instance = autocannon(opts, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });

    autocannon.track(instance, { renderProgressBar: false });
  });
}

async function main() {
  console.log('\n' + '='.repeat(105));
  console.log('  🚀 UWE LIVE VERCEL MAXIMUM STRESS TEST: 200 → 500 CONCURRENT CONNECTIONS');
  console.log(`  Target URL: ${BASE_URL}`);
  console.log('='.repeat(105));

  const allResults = [];

  for (const phase of PHASES) {
    console.log(`\n▶ ${phase.name} (${phase.connections} connections × ${phase.duration}s)\n`);
    const phaseResults = [];

    for (const endpoint of ENDPOINTS) {
      process.stdout.write(`    ⏳ Pushing ${endpoint.name} to ${phase.connections} concurrent users...`);
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

        const status = (errors === 0 && timeouts === 0) ? '✅' : '⚠️';
        console.log(`\r    ${status} ${endpoint.name}`);
        console.log(`       Throughput: ${rps.toFixed(1)} req/s (${totalReqs} total requests) | Bandwidth: ${formatBytes(throughput)}/s`);
        console.log(`       Latency: Avg: ${formatDuration(latencyAvg)} | P99: ${formatDuration(latencyP99)}`);
        console.log(`       Status: 2xx Success: ${totalReqs - non2xx} | Non-2xx/RateLimited: ${non2xx} | Errors: ${errors} | Timeouts: ${timeouts}`);
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

  console.log('\n' + '='.repeat(105));
  console.log('  📊 VERCEL 500 CONCURRENT USERS FINAL STRESS REPORT');
  console.log('='.repeat(105));

  console.log('\n  Requests/sec (Throughput):\n');
  console.log('  ' + '─'.repeat(80));
  console.log('  ' + 'Endpoint'.padEnd(50) + '200 conn'.padStart(15) + '500 conn'.padStart(15));
  console.log('  ' + '─'.repeat(80));

  const endpointNames = ENDPOINTS.map(e => e.name);
  for (const name of endpointNames) {
    let row = '  ' + name.padEnd(50);
    for (const phase of allResults) {
      const r = phase.results.find(r => r.endpoint === name);
      if (r) {
        row += `${r.rps.toFixed(0)} rps`.padStart(15);
      } else {
        row += 'N/A'.padStart(15);
      }
    }
    console.log(row);
  }
  console.log('  ' + '─'.repeat(80));

  console.log('\n  P99 Latency (Round-Trip over Internet):\n');
  console.log('  ' + '─'.repeat(80));
  console.log('  ' + 'Endpoint'.padEnd(50) + '200 conn'.padStart(15) + '500 conn'.padStart(15));
  console.log('  ' + '─'.repeat(80));

  for (const name of endpointNames) {
    let row = '  ' + name.padEnd(50);
    for (const phase of allResults) {
      const r = phase.results.find(r => r.endpoint === name);
      if (r) {
        row += formatDuration(r.latencyP99).padStart(15);
      } else {
        row += 'N/A'.padStart(15);
      }
    }
    console.log(row);
  }
  console.log('  ' + '─'.repeat(80));
  console.log('\n' + '='.repeat(105));
}

main().catch(console.error);
