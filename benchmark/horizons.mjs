// Third, independent reference: NASA/JPL Horizons (DE441), computed by JPL's own service.
//
// Horizons observer quantity 31 = apparent geocentric ecliptic longitude/latitude of date (light
// time, gravitational deflection, aberration), printed to 1e-7 deg (0.36 mas). JPL documents
// this quantity in the IAU 1976/1980 precession-nutation frame, whereas both libraries use
// IAU 2006 precession with an IAU 2000 nutation. That frame difference is common to both
// libraries; it is reported as "shared" below so it is not mistaken for an ephemeris error.
//
// Raw Horizons responses are cached in horizons-cache/ (committed), so a re-run is offline and
// byte-reproducible; delete the cache or pass --refresh to query JPL again.
// Usage: node horizons.mjs [--samples 200] [--seed 20261109] [--refresh]
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { arcsec, BENCH_DIR, bodyPairs, flag, loadEngine, loadSwiss, machine, option, rng, round, stats, swissCalc, writeResult } from './lib/common.mjs';

const N = Number(option('--samples', 200));
const SEED = Number(option('--seed', 20261109));
const CHUNK = 50;
const CACHE = join(BENCH_DIR, 'horizons-cache');
const API = 'https://ssd.jpl.nasa.gov/api/horizons.api';
// Mars..Pluto as system barycentres (4..9), as in DE440 and in both libraries.
const TARGETS = { sun: '10', moon: '301', mercury: '199', venus: '299', mars: '4', jupiter: '5', saturn: '6', uranus: '7', neptune: '8', pluto: '9', chiron: '2060;' };

const { engine, info } = loadEngine();
const swiss = loadSwiss();
const swissIds = Object.fromEntries(bodyPairs(engine, swiss.c));

const random = rng(SEED);
const epochs = Array.from({ length: N }, () => Number((2415020.5 + random() * (2488069.5 - 2415020.5)).toFixed(6))).sort((a, b) => a - b);

async function horizons(body, chunkIndex, jds) {
  mkdirSync(CACHE, { recursive: true });
  const file = join(CACHE, `${body}_${SEED}_${N}_${chunkIndex}.txt`);
  if (existsSync(file) && !flag('--refresh')) return readFileSync(file, 'utf8');
  const params = new URLSearchParams({
    format: 'json', COMMAND: `'${TARGETS[body]}'`, OBJ_DATA: "'NO'", MAKE_EPHEM: "'YES'", EPHEM_TYPE: "'OBSERVER'",
    CENTER: "'500@399'", QUANTITIES: "'31'", TLIST_TYPE: "'JD'", TIME_TYPE: "'TT'", ANG_FORMAT: "'DEG'",
    EXTRA_PREC: "'YES'", CSV_FORMAT: "'YES'", TLIST: jds.map((jd) => `'${jd.toFixed(6)}'`).join(','),
  });
  const response = await fetch(`${API}?${params}`);
  const json = await response.json();
  if (!json.result) throw new Error(`Horizons: ${JSON.stringify(json).slice(0, 300)}`);
  writeFileSync(file, json.result);
  await new Promise((r) => setTimeout(r, 1000)); // be polite to the public service
  return json.result;
}

function parse(text) {
  const a = text.indexOf('$$SOE'); const b = text.indexOf('$$EOE');
  if (a < 0 || b < 0) throw new Error(`Unexpected Horizons response: ${text.slice(0, 300)}`);
  return text.slice(a + 5, b).trim().split('\n').map((line) => line.split(',').map((s) => s.trim()))
    .map((cols) => ({ lon: Number(cols[3]), lat: Number(cols[4]) }));
}

const source = {};
const results = {};
for (const body of Object.keys(TARGETS)) {
  const rows = [];
  for (let k = 0; k < epochs.length; k += CHUNK) {
    const text = await horizons(body, k / CHUNK, epochs.slice(k, k + CHUNK));
    source[body] ??= (text.match(/Target body name:.*\{source: ([^}]+)\}/) || [])[1];
    rows.push(...parse(text));
  }
  if (rows.length !== epochs.length) throw new Error(`${body}: ${rows.length} Horizons rows for ${epochs.length} epochs`);
  const ours = []; const theirs = []; const between = [];
  epochs.forEach((jd, i) => {
    const z = engine.positionTT(jd, body).longitude;
    const s = swissCalc(swiss, 'calc', jd, swissIds[body])[0];
    ours.push(arcsec(z, rows[i].lon)); theirs.push(arcsec(s, rows[i].lon)); between.push(arcsec(z, s));
  });
  const summary = (v) => Object.fromEntries(Object.entries(stats(v)).map(([k, x]) => [k, k === 'n' ? x : round(x)]));
  results[body] = { zodiacallyVsHorizons: summary(ours), swissVsHorizons: summary(theirs), zodiacallyVsSwiss: summary(between) };
  console.log(`${body.padEnd(8)} Z-H max ${results[body].zodiacallyVsHorizons.max}" mean ${results[body].zodiacallyVsHorizons.mean}"   S-H max ${results[body].swissVsHorizons.max}" mean ${results[body].swissVsHorizons.mean}"   Z-S max ${results[body].zodiacallyVsSwiss.max}"`);
}

const file = writeResult('horizons', {
  measuredAt: new Date().toISOString(),
  engine: { name: info.engine, version: info.version, dataVersion: info.dataVersion, manifestSha256: info.manifestSha256 },
  references: { horizons: { api: API, quantity: 31, sourcePerBody: source }, swiss: { library: 'sweph', packageVersion: swiss.packageVersion, swissVersion: swiss.swissVersion, data: swiss.source } },
  machine: machine(),
  method: { samples: N, seed: SEED, epochs: 'uniform JD TT 1900-01-01..2100-01-01, rounded to 1e-6 day, identical TT for all three', units: 'arcseconds, |x| statistics, bias = signed mean' },
  bodies: results,
  note: 'Horizons quantity 31 is defined in the IAU 1976/1980 frame; a difference common to both libraries (similar Z-H and S-H, small Z-S) is that frame, not an ephemeris error. Output resolution 1e-7 deg = 0.36 mas.',
});
console.log(`wrote ${file}`);
