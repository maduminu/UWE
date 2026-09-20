/**
 * Live Hosted Supabase & Serverless DB Transaction Pilot Stress Test
 *
 * Target: https://uwe-pearl.vercel.app
 * Focus: Uncached, DB-writing and transactional database paths:
 *   1. Coupon Validation (Uncached DB Read: `POST /api/coupons/validate`)
 *   2. CRM Lead Inquiries (Uncached DB Write: `POST /api/leads`)
 *   3. Job Applications (Uncached DB Write: `POST /api/jobs/applications`)
 *   4. Student Login & Session Minting (DB Query + bcrypt + Session write: `POST /api/auth/login`)
 */

const autocannon = require('autocannon');

const BASE_URL = 'https://uwe-pearl.vercel.app';

const PHASES = [
  { name: '🌱 Phase 1: 10 Concurrent DB Transactions (Pilot Kickoff)',       connections: 10, duration: 8 },
  { name: '🚀 Phase 2: 30 Concurrent DB Transactions (Active Checkout Rush)', connections: 30, duration: 8 },
  { name: '⚡ Phase 3: 50 Concurrent DB Transactions (Cohort Enrollment Surge)', connections: 50, duration: 8 },
  { name: '🔥 Phase 4: 100 Concurrent DB Transactions (Max Pilot Pressure)',  connections: 100, duration: 8 },
];

const DB_ENDPOINTS = [
  {
    name: 'Coupon Code Validation (Uncached DB Read)',
    method: 'POST',
    path: '/api/coupons/validate',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      code: 'PILOT-TEST-COUPON',
      originalPrice: 50000,
    }),
  },
  {
    name: 'Lead Submission (Uncached DB Write + Dedup)',
    method: 'POST',
    path: '/api/leads',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Pilot Student',
      phone: '+94770001234',
      email: 'pilot@uwe.lk',
      courseSlug: 'bmb',
      message: 'Pilot cohort enrollment inquiry',
    }),
  },
  {
    name: 'Job Application (Uncached DB Relational Write)',
    method: 'POST',
    path: '/api/jobs/applications',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Pilot Applicant',
      phone: '+94770009999',
      email: 'applicant@uwe.lk',
      experience: '2 years marketing experience',
    }),
  },
  {
    name: 'Student Login (DB Lookup + Auth Verification)',
    method: 'POST',
    path: '/api/auth/login',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'nonexistent-pilot-user@uwe.lk',
      password: 'SomePassword123!',
    }),
  },
];

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
      body: endpoint.body || undefined,
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
  console.log('\n' + '='.repeat(110));
  console.log('  🎯 LIVE HOSTED SUPABASE / POSTGRES DATABASE TRANSACTION STRESS TEST');
  console.log(`  Target URL: ${BASE_URL}`);
  console.log('  Testing Uncached DB Reads, Writes, Validations & Auth Paths under 10 → 100 Concurrent Sockets');
  console.log('='.repeat(110));

  const allResults = [];

  for (const phase of PHASES) {
    console.log(`\n▶ ${phase.name} (${phase.connections} connections × ${phase.duration}s)\n`);
    const phaseResults = [];

    for (const endpoint of DB_ENDPOINTS) {
      process.stdout.write(`    ⏳ Executing ${endpoint.name} at ${phase.connections} concurrent transactions...`);
      try {
        const result = await runBenchmark(endpoint, phase.connections, phase.duration);
        const rps = result.requests.average || 0;
        const latencyAvg = result.latency.average || 0;
        const latencyP99 = result.latency.p99 || 0;
        const totalReqs = result.requests.total || 0;
        const errors = result.errors || 0;
        const timeouts = result.timeouts || 0;
        const non2xx = result.non2xx || 0;
        const throughput2xx = totalReqs - non2xx;

        const isSuccess = (errors === 0 && timeouts === 0);
        const status = isSuccess ? '✅' : '⚠️';

        console.log(`\r    ${status} ${endpoint.name}`);
        console.log(`       Throughput: ${rps.toFixed(1)} req/s (${totalReqs} total requests)`);
        console.log(`       Latency: Avg: ${formatDuration(latencyAvg)} | P99: ${formatDuration(latencyP99)}`);
        console.log(`       Status: Processed: ${totalReqs} | Rate-Limited/Throttled: ${non2xx} | Network Errors: ${errors} | Timeouts: ${timeouts}`);
        console.log('');

        phaseResults.push({
          endpoint: endpoint.name,
          connections: phase.connections,
          rps,
          latencyAvg,
          latencyP99,
          totalReqs,
          throughput2xx,
          errors,
          timeouts,
          non2xx,
        });
      } catch (err) {
        console.log(`\r    ❌ ${endpoint.name} — FAILED: ${err.message}\n`);
      }
    }
    allResults.push({ phase: phase.name, connections: phase.connections, results: phaseResults });
  }

  console.log('\n' + '='.repeat(110));
  console.log('  📊 SUPABASE LIVE DATABASE TRANSACTION THROUGHPUT & CONNECTION POOL ANALYSIS');
  console.log('='.repeat(110));

  console.log('\n  Transactional Throughput (Requests/sec to Database):\n');
  console.log('  ' + '─'.repeat(105));
  console.log('  ' + 'Database Path'.padEnd(52) + '10 conn'.padStart(12) + '30 conn'.padStart(12) + '50 conn'.padStart(12) + '100 conn'.padStart(12));
  console.log('  ' + '─'.repeat(105));

  const endpointNames = DB_ENDPOINTS.map(e => e.name);
  for (const name of endpointNames) {
    let row = '  ' + name.padEnd(52);
    for (const phase of allResults) {
      const r = phase.results.find(r => r.endpoint === name);
      if (r) {
        row += `${r.rps.toFixed(0)} req/s`.padStart(12);
      } else {
        row += 'N/A'.padStart(12);
      }
    }
    console.log(row);
  }
  console.log('  ' + '─'.repeat(105));

  console.log('\n  P99 Latency (End-to-End Database Transaction Duration):\n');
  console.log('  ' + '─'.repeat(105));
  console.log('  ' + 'Database Path'.padEnd(52) + '10 conn'.padStart(12) + '30 conn'.padStart(12) + '50 conn'.padStart(12) + '100 conn'.padStart(12));
  console.log('  ' + '─'.repeat(105));

  for (const name of endpointNames) {
    let row = '  ' + name.padEnd(52);
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
  console.log('  ' + '─'.repeat(105));
  console.log('\n' + '='.repeat(110));
}

main().catch(console.error);
