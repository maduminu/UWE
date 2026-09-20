/**
 * ============================================================================
 * UWE PRODUCTION STRESS TEST — 500–1000 Concurrent Users
 * Target: Live Vercel Deployment + Upstash Redis Cache
 * ============================================================================
 *
 * Compares Redis-cached endpoints vs non-cached to quantify the improvement.
 * Run with: npx tsx scripts/production-stress-test.ts
 */

import autocannon from 'autocannon';

// ─── CONFIG ─────────────────────────────────────────────────────────────────
const BASE_URL = 'https://uwe-5o6c2mz44-maduminu.vercel.app';

const PHASES = [
  { label: '⚡ Phase 1 —  500 concurrent users', connections: 500,  duration: 10 },
  { label: '🔥 Phase 2 —  750 concurrent users', connections: 750,  duration: 10 },
  { label: '💥 Phase 3 — 1000 concurrent users', connections: 1000, duration: 10 },
];

// ─── ENDPOINTS ───────────────────────────────────────────────────────────────
// 🟢 REDIS-CACHED — these should be fast even under load
const CACHED_ENDPOINTS = [
  { name: 'GET /api/courses          [Redis SWR]',      path: '/api/courses'                },
  { name: 'GET /api/banners          [Redis SWR]',      path: '/api/banners'                },
  { name: 'GET /api/jobs             [Redis SWR]',      path: '/api/jobs'                   },
  { name: 'GET /api/demo-videos      [Redis SWR]',      path: '/api/demo-videos'            },
  { name: 'GET /api/staff            [Redis SWR]',      path: '/api/staff'                  },
  { name: 'GET /api/gamification/leaderboard [Redis]',  path: '/api/gamification/leaderboard' },
];

// 🔴 NON-CACHED — these hit the DB directly every time (baseline comparison)
const UNCACHED_ENDPOINTS = [
  { name: 'GET /api/health           [No Cache]',       path: '/api/health'                 },
];

// ─── RUNNER ──────────────────────────────────────────────────────────────────
function bench(url: string, connections: number, duration: number): Promise<autocannon.Result> {
  return new Promise((resolve, reject) => {
    autocannon(
      {
        url,
        connections,
        duration,
        method: 'GET',
        timeout: 30,
        headers: {
          'User-Agent': 'UWE-StressTest/2.0',
          'Accept':     'application/json',
        },
      },
      (err, result) => {
        if (err) return reject(err);
        resolve(result);
      },
    );
  });
}

function formatRow(
  label: string,
  rps: number,
  avg: number,
  p99: number,
  p999: number,
  total: number,
  non2xx: number,
  errors: number,
) {
  const ok     = total - non2xx - errors;
  const pct    = total > 0 ? ((ok / total) * 100).toFixed(1) : '0.0';
  const icon   = (non2xx === 0 && errors === 0) ? '✅' : (errors > 50 ? '❌' : '⚠️');
  return (
    `  ${icon} ${label.padEnd(50)} | ` +
    `${rps.toFixed(0).padStart(6)} req/s | ` +
    `avg ${avg.toFixed(0).padStart(4)}ms | ` +
    `p99 ${p99.toFixed(0).padStart(4)}ms | ` +
    `p999 ${p999.toFixed(0).padStart(5)}ms | ` +
    `${pct.padStart(5)}% 2xx`
  );
}

// ─── SUMMARY STORAGE ─────────────────────────────────────────────────────────
interface Summary {
  phase:    string;
  endpoint: string;
  cached:   boolean;
  rps:      number;
  avg:      number;
  p99:      number;
}

const summaries: Summary[] = [];

// ─── MAIN ────────────────────────────────────────────────────────────────────
async function main() {
  const W = 110;
  const HR = '─'.repeat(W);

  console.log('\n' + '═'.repeat(W));
  console.log('  🚀 UWE PRODUCTION STRESS TEST — Live Vercel + Upstash Redis');
  console.log(`  🌐 Target: ${BASE_URL}`);
  console.log(`  ⏱  Phases: ${PHASES.map(p => p.connections).join(' → ')} concurrent users, ${PHASES[0].duration}s each`);
  console.log('═'.repeat(W));

  for (const phase of PHASES) {
    console.log(`\n${phase.label}`);
    console.log(HR);

    const all = [
      ...CACHED_ENDPOINTS.map(e => ({ ...e, cached: true })),
      ...UNCACHED_ENDPOINTS.map(e => ({ ...e, cached: false })),
    ];

    for (const ep of all) {
      try {
        const r = await bench(`${BASE_URL}${ep.path}`, phase.connections, phase.duration);
        const rps    = r.requests.average ?? 0;
        const avg    = r.latency.average   ?? 0;
        const p99    = r.latency.p99        ?? 0;
        const p999   = r.latency.p9999      ?? r.latency.max ?? 0;
        const total  = r.requests.total     ?? 0;
        const non2xx = r.non2xx             ?? 0;
        const errors = r.errors             ?? 0;

        console.log(formatRow(ep.name, rps, avg, p99, p999, total, non2xx, errors));

        summaries.push({
          phase:    phase.label,
          endpoint: ep.name.split('[')[0].trim(),
          cached:   ep.cached,
          rps, avg, p99,
        });
      } catch (err: any) {
        console.log(`  ❌ ${ep.name.padEnd(50)} | ERROR: ${err.message}`);
      }
    }
  }

  // ── SUMMARY TABLE ──────────────────────────────────────────────────────────
  console.log('\n\n' + '═'.repeat(W));
  console.log('  📊 PERFORMANCE SUMMARY — Redis Cache Impact');
  console.log('═'.repeat(W));
  console.log(
    `  ${'Endpoint'.padEnd(35)} ${'Phase'.padEnd(38)} ${'Cached'.padEnd(10)} ${'req/s'.padStart(8)} ${'avg ms'.padStart(8)} ${'p99 ms'.padStart(8)}`
  );
  console.log('  ' + HR.slice(2));

  for (const s of summaries) {
    const cacheLabel = s.cached ? '🟢 Yes' : '🔴 No';
    const phaseShort = s.phase.replace(/Phase \d+ — /, '').trim();
    console.log(
      `  ${s.endpoint.padEnd(35)} ${phaseShort.padEnd(38)} ${cacheLabel.padEnd(10)} ` +
      `${s.rps.toFixed(0).padStart(8)} ${s.avg.toFixed(0).padStart(8)} ${s.p99.toFixed(0).padStart(8)}`
    );
  }

  // ── CACHE vs NO-CACHE COMPARISON ──────────────────────────────────────────
  const cached   = summaries.filter(s => s.cached);
  const uncached = summaries.filter(s => !s.cached);

  if (cached.length && uncached.length) {
    const avgCachedRps   = cached.reduce((a, s)   => a + s.rps, 0) / cached.length;
    const avgUncachedRps = uncached.reduce((a, s) => a + s.rps, 0) / uncached.length;
    const avgCachedP99   = cached.reduce((a, s)   => a + s.p99, 0) / cached.length;
    const avgUncachedP99 = uncached.reduce((a, s) => a + s.p99, 0) / uncached.length;

    console.log('\n' + '═'.repeat(W));
    console.log('  ⚡ REDIS IMPACT ANALYSIS');
    console.log('═'.repeat(W));
    console.log(`  🟢 Redis-cached endpoints  → avg ${avgCachedRps.toFixed(0)} req/s | avg p99 ${avgCachedP99.toFixed(0)}ms`);
    console.log(`  🔴 Uncached endpoints       → avg ${avgUncachedRps.toFixed(0)} req/s | avg p99 ${avgUncachedP99.toFixed(0)}ms`);

    const rpsGain  = avgCachedRps > 0 && avgUncachedRps > 0
      ? ((avgCachedRps / avgUncachedRps) * 100 - 100).toFixed(0)
      : 'N/A';
    const latGain  = avgCachedP99 > 0 && avgUncachedP99 > 0
      ? ((1 - avgCachedP99 / avgUncachedP99) * 100).toFixed(0)
      : 'N/A';

    console.log(`\n  📈 Throughput improvement : ${rpsGain}% more req/s with Redis`);
    console.log(`  ⏱  Latency reduction      : ${latGain}% lower p99 latency with Redis`);
  }

  console.log('\n' + '═'.repeat(W));
  console.log('  Stress test complete.\n');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
