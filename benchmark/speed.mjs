// Speed: Zodiacally Ephemeris vs. the Swiss Ephemeris (sweph) through their Node.js APIs.
//
// Warm workloads (same inputs, same process, single thread, alternating order per round):
//   chart      12 apparent geocentric longitudes with speeds + Placidus houses (one birth chart)
//   singleBody one longitude with speed (bodies in rotation)
//   houses     Placidus houses only
// Cold start (fresh `node` process per run): load the library and compute the first chart.
// Usage: node speed.mjs [--rounds 7] [--calls 5000] [--cold-runs 15] [--engine <path>] [--out-dir <dir>]
import { spawnSync } from 'node:child_process';
import { performance } from 'node:perf_hooks';
import { BENCH_DIR, bodyPairs, EPHE_DIR, loadEngine, loadSwiss, machine, option, rng, writeResult } from './lib/common.mjs';

const ROUNDS = Number(option('--rounds', 7));
const CALLS = Number(option('--calls', 5000));
const WARMUP = 2000;
const SEED = 20261104; // same seed number as the 4 November 2026 measurement, whose earlier script used another generator (different inputs, same ranges)
const COLD_RUNS = Number(option('--cold-runs', 15));

const { engine, path: enginePath, info } = loadEngine();
const swiss = loadSwiss();
const { swe, c, flags } = swiss;
const pairs = bodyPairs(engine, c);

const random = rng(SEED);
const samples = Array.from({ length: 1024 }, () => ({
  jd: 2415020.5 + random() * 46385, // JD UT1 1900-01-01 .. 2026-12-31
  lat: -65 + random() * 130,
  lon: -180 + random() * 360,
}));
for (const [, id] of pairs) {
  const r = swe.calc_ut(samples[0].jd, id, flags);
  if (r.error || (id !== c.SE_TRUE_NODE && !(r.flag & c.SEFLG_SWIEPH))) throw new Error('Swiss data missing or fallback active');
}

let sink = 0;
const workloads = {
  chart: {
    zodiacally(i) {
      const p = samples[i & 1023];
      for (const [body] of pairs) { const r = engine.position(p.jd, body); sink += r.longitude + r.speed; }
      sink += engine.houses(p.jd, p.lat, p.lon, 'P').mc;
    },
    swiss(i) {
      const p = samples[i & 1023];
      for (const [, id] of pairs) { const d = swe.calc_ut(p.jd, id, flags).data; sink += d[0] + d[3]; }
      sink += swe.houses(p.jd, p.lat, p.lon, 'P').data.points[1];
    },
  },
  // 12 bodies at the same date (as inside a chart): the Swiss Ephemeris can reuse per-date work.
  bodiesSameDate: {
    zodiacally(i) {
      const p = samples[i & 1023];
      for (const [body] of pairs) { const r = engine.position(p.jd, body); sink += r.longitude + r.speed; }
    },
    swiss(i) {
      const p = samples[i & 1023];
      for (const [, id] of pairs) { const d = swe.calc_ut(p.jd, id, flags).data; sink += d[0] + d[3]; }
    },
  },
  // One body per call at a new date every call: no per-date work can be reused (worst case for Swiss).
  singleBody: {
    zodiacally(i) { const r = engine.position(samples[i & 1023].jd, pairs[i % 12][0]); sink += r.longitude + r.speed; },
    swiss(i) { const d = swe.calc_ut(samples[i & 1023].jd, pairs[i % 12][1], flags).data; sink += d[0] + d[3]; },
  },
  houses: {
    zodiacally(i) { const p = samples[i & 1023]; sink += engine.houses(p.jd, p.lat, p.lon, 'P').mc; },
    swiss(i) { const p = samples[i & 1023]; sink += swe.houses(p.jd, p.lat, p.lon, 'P').data.points[1]; },
  },
};

function measure(fn, calls) {
  const start = process.hrtime.bigint();
  for (let i = 0; i < calls; i++) fn(i);
  return Number(process.hrtime.bigint() - start) / calls / 1000; // microseconds per call
}
const median = (values) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];

const warm = {};
for (const [name, w] of Object.entries(workloads)) {
  const calls = name === 'chart' || name === 'bodiesSameDate' ? CALLS : CALLS * 10;
  for (let i = 0; i < WARMUP; i++) { w.zodiacally(i); w.swiss(i); }
  const rounds = [];
  for (let r = 0; r < ROUNDS; r++) {
    let ours; let theirs;
    if (r % 2) { theirs = measure(w.swiss, calls); ours = measure(w.zodiacally, calls); }
    else { ours = measure(w.zodiacally, calls); theirs = measure(w.swiss, calls); }
    rounds.push({ zodiacallyMicroseconds: ours, swissMicroseconds: theirs, ratio: theirs / ours });
  }
  const ours = median(rounds.map((r) => r.zodiacallyMicroseconds));
  const theirs = median(rounds.map((r) => r.swissMicroseconds));
  warm[name] = { callsPerRound: calls, medianZodiacallyMicroseconds: ours, medianSwissMicroseconds: theirs, speedup: theirs / ours, rounds };
  console.log(`${name.padEnd(10)} zodiacally ${ours.toFixed(3)} µs   swiss ${theirs.toFixed(3)} µs   ${(theirs / ours).toFixed(1)}x`);
}
if (!Number.isFinite(sink)) throw new Error('Non-finite benchmark output');

// Cold start: a fresh process loads the library (Zodiacally verifies the SHA-256 of all data
// tables on first use) and computes one chart. Both sides pay the same Node.js startup.
const coldScripts = {
  zodiacally: `const t0=performance.now();const e=require(${JSON.stringify(enginePath)});let s=0;
for(const b of Object.values(e.BODIES)){const r=e.position(2451545,b);s+=r.longitude;}
s+=e.houses(2451545,52.52,13.405,'P').mc;process.stdout.write(String(performance.now()-t0));`,
  swiss: `const t0=performance.now();const swe=require('sweph');const c=swe.constants;swe.set_ephe_path(${JSON.stringify(EPHE_DIR)});
const f=c.SEFLG_SWIEPH|c.SEFLG_SPEED;let s=0;for(const b of [0,1,2,3,4,5,6,7,8,9,15,11]){s+=swe.calc_ut(2451545,b,f).data[0];}
s+=swe.houses(2451545,52.52,13.405,'P').data.points[1];process.stdout.write(String(performance.now()-t0));`,
};
const cold = {};
for (const [name, script] of Object.entries(coldScripts)) {
  const inProcess = []; const wall = [];
  for (let i = 0; i < COLD_RUNS; i++) {
    const t0 = performance.now();
    const run = spawnSync(process.execPath, ['-e', script], { cwd: BENCH_DIR, encoding: 'utf8' });
    wall.push(performance.now() - t0);
    if (run.status !== 0) throw new Error(`${name} cold start failed: ${run.stderr}`);
    inProcess.push(Number(run.stdout));
  }
  cold[name] = { runs: COLD_RUNS, medianLoadAndFirstChartMs: median(inProcess), medianProcessWallMs: median(wall) };
  console.log(`cold start ${name.padEnd(10)} load + first chart ${median(inProcess).toFixed(2)} ms   whole process ${median(wall).toFixed(1)} ms`);
}

const file = writeResult('speed', {
  measuredAt: new Date().toISOString(),
  engine: { name: info.engine, version: info.version, dataVersion: info.dataVersion, manifestSha256: info.manifestSha256 },
  comparison: { library: 'sweph', packageVersion: swiss.packageVersion, swissVersion: swiss.swissVersion, flags: 'SEFLG_SWIEPH | SEFLG_SPEED', data: swiss.source },
  machine: machine(),
  method: {
    inputs: '1024 reproducible inputs (seed 20261104): JD UT1 1900-01-01..2026-12-31, latitude -65..65, longitude -180..180; identical for both libraries',
    warmup: WARMUP, rounds: ROUNDS, order: 'alternating per round', statistic: 'median of the per-round means',
    singleThread: true, coldStartRuns: COLD_RUNS,
  },
  warm, cold,
  limitations: [
    'Node.js API comparison on one machine; the Swiss Ephemeris is called through the sweph native addon, which adds a JavaScript-to-C call per function. A C program calling the Swiss Ephemeris directly is not measured here.',
    'Zodiacally Ephemeris evaluates precomputed apparent longitudes (one polynomial per body); the Swiss Ephemeris computes positions from its data at run time and returns longitude, latitude, distance and their speeds, reusing per-date work when several bodies share a date.',
    'Zodiacally Ephemeris covers fewer bodies, house systems and a shorter date range than the Swiss Ephemeris.',
    'Speed says nothing about accuracy; see agreement.mjs and horizons.mjs.',
  ],
});
console.log(`wrote ${file}`);
