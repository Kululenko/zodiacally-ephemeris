// Agreement: Zodiacally Ephemeris vs. the Swiss Ephemeris at the same instant.
//
// Positions are compared at the same TT Julian day and houses at the same UT1 Julian day, so the
// two libraries' Delta T / UT1 models (which differ for future dates) play no role here: what
// remains is the ephemeris data plus the apparent-place reduction.
//
// With --jpl the Swiss Ephemeris is additionally run on NASA/JPL's DE440 file (fetch it with
// `node fetch-swiss-data.mjs --jpl`). That gives a referee computed by the Swiss Ephemeris code
// itself from the same JPL file Zodiacally Ephemeris is built from (DE440; the Swiss Ephemeris'
// default SE1 files of 2026-05-26 are built from the companion release DE441):
//   Zodiacally - Swiss(DE440)   reduction differences only (same JPL data, different code)
//   Swiss(SE1) - Swiss(DE440)   data differences only (same code, DE441-based SE1 files vs DE440)
// Usage: node agreement.mjs [--samples 20000] [--seed 20261108] [--jpl]
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { arcsec, bodyPairs, EPHE_DIR, flag, loadEngine, loadSwiss, machine, option, rng, round, stats, swissCalc, writeResult } from './lib/common.mjs';

const N = Number(option('--samples', 20000));
const SEED = Number(option('--seed', 20261108));
const USE_JPL = flag('--jpl');
const JD_START = 2415020.5; // 1900-01-01 TT
const JD_END = 2488069.5; // 2100-01-01 TT
const JD_2050 = 2469807.5;

const { engine, info } = loadEngine();
if (USE_JPL && !existsSync(join(EPHE_DIR, 'de440.eph'))) throw new Error('Run `node fetch-swiss-data.mjs --jpl` first.');
const swiss = loadSwiss({ jplFile: USE_JPL ? 'de440.eph' : null });
const { swe, c } = swiss;
const pairs = bodyPairs(engine, c);
const SE1 = { ...swiss, flags: c.SEFLG_SWIEPH | c.SEFLG_SPEED };
const JPL = { ...swiss, flags: c.SEFLG_JPLEPH | c.SEFLG_SPEED };

const random = rng(SEED);
const epochs = Array.from({ length: N }, () => JD_START + random() * (JD_END - JD_START));
const sites = epochs.map(() => ({ lat: -66 + random() * 132, lon: -180 + random() * 360 }));

const rad = Math.PI / 180;
const separation = (l1, b1, l2, b2) => Math.acos(Math.min(1, Math.sin(b1 * rad) * Math.sin(b2 * rad)
  + Math.cos(b1 * rad) * Math.cos(b2 * rad) * Math.cos((l1 - l2) * rad))) / rad;

const series = {}; // name -> { lon: [], speed: [] }
const add = (key, lon, speed) => { (series[key] ??= { lon: [], speed: [] }); series[key].lon.push(lon); series[key].speed.push(speed); };
const display = { sign: 0, arcminute: 0, values: 0 };
const housesData = { asc: [[], []], mc: [[], []], cusps: [[], []] };
let houseSkipped = 0;

for (let i = 0; i < N; i++) {
  const jd = epochs[i];
  const sun = swissCalc(SE1, 'calc', jd, c.SE_SUN);
  for (const [body, id] of pairs) {
    const ours = engine.positionTT(jd, body);
    const se1 = swissCalc(SE1, 'calc', jd, id);
    const dLon = arcsec(ours.longitude, se1[0]);
    const dSpeed = (ours.speed - se1[3]) * 3600;
    add(`${body}|zodiacally-se1`, dLon, dSpeed);
    const isPlanet = !['sun', 'moon', 'trueNode'].includes(body);
    if (isPlanet && separation(se1[0], se1[1], sun[0], sun[1]) > 1) add(`${body}|zodiacally-se1|>1deg`, dLon, dSpeed);
    if (USE_JPL && body !== 'chiron') {
      const jpl = swissCalc(JPL, 'calc', jd, id);
      add(`${body}|zodiacally-jpl`, arcsec(ours.longitude, jpl[0]), (ours.speed - jpl[3]) * 3600);
      add(`${body}|se1-jpl`, arcsec(se1[0], jpl[0]), (se1[3] - jpl[3]) * 3600);
      if (isPlanet && separation(se1[0], se1[1], sun[0], sun[1]) > 1) {
        add(`${body}|zodiacally-jpl|>1deg`, arcsec(ours.longitude, jpl[0]), (ours.speed - jpl[3]) * 3600);
        add(`${body}|se1-jpl|>1deg`, arcsec(se1[0], jpl[0]), (se1[3] - jpl[3]) * 3600);
      }
    }
    display.values++;
    if (Math.floor(ours.longitude / 30) !== Math.floor(se1[0] / 30)) display.sign++;
    if (Math.floor(ours.longitude * 60) !== Math.floor(se1[0] * 60)) display.arcminute++;
  }
  // Houses at the same UT1 instant.
  const jdUT1 = jd - engine.deltaTSeconds(jd) / 86400;
  const { lat, lon } = sites[i];
  const ours = engine.houses(jdUT1, lat, lon, 'P');
  const theirs = swe.houses(jdUT1, lat, lon, 'P');
  if (theirs.flag !== c.OK || ours.error) { houseSkipped++; continue; } // not expected inside |lat| <= 66; counted
  const era = jd < JD_2050 ? 0 : 1;
  housesData.asc[era].push(arcsec(ours.ascendant, theirs.data.points[0]));
  housesData.mc[era].push(arcsec(ours.mc, theirs.data.points[1]));
  for (let k = 0; k < 12; k++) housesData.cusps[era].push(arcsec(ours.cusps[k], theirs.data.houses[k]));
}

const summarize = (values) => Object.fromEntries(Object.entries(stats(values)).map(([k, v]) => [k, k === 'n' ? v : round(v)]));
const bodies = {};
for (const [key, value] of Object.entries(series)) {
  const [body, comparison, filter] = key.split('|');
  const name = filter ? `${comparison} (planets >1 deg from the Sun)` : comparison;
  ((bodies[body] ??= {})[name] = { longitudeArcsec: summarize(value.lon), speedArcsecPerDay: summarize(value.speed) });
}
const houses = {};
for (const [name, [before, after]] of Object.entries(housesData)) {
  houses[name] = { '1900-2049': summarize(before), '2050-2099': summarize(after) };
}

const file = writeResult(USE_JPL ? 'agreement-jpl' : 'agreement', {
  measuredAt: new Date().toISOString(),
  engine: { name: info.engine, version: info.version, dataVersion: info.dataVersion, manifestSha256: info.manifestSha256 },
  reference: { library: 'sweph', packageVersion: swiss.packageVersion, swissVersion: swiss.swissVersion, data: `SE1 files: "${swiss.se1Header}"${USE_JPL ? '; referee: JPL DE440 file linux_p1550p2650.440' : ''}`, se1Header: swiss.se1Header, jplReferee: USE_JPL },
  machine: machine(),
  method: {
    samples: N, seed: SEED, epochs: 'uniform JD TT 1900-01-01..2100-01-01',
    positions: 'engine.positionTT(jdTT) vs swe.calc(jdTT, body, SEFLG_SWIEPH|SEFLG_SPEED) (and SEFLG_JPLEPH with --jpl): apparent geocentric ecliptic longitude of date, tropical',
    houses: 'engine.houses(jdUT1) vs swe.houses(jdUT1), Placidus, latitude -66..66, same UT1',
    units: 'arcseconds (longitude) and arcseconds per day (speed); |x| statistics, bias = signed mean',
  },
  bodies, houses, houseSamplesSkipped: houseSkipped,
  display: { ...display, note: 'positions whose zodiac sign or displayed whole arcminute (floor) differ between the two libraries' },
});
console.log(`wrote ${file}`);
for (const [body, value] of Object.entries(bodies)) {
  console.log(body.padEnd(9), Object.entries(value).map(([k, v]) => `${k}: max ${v.longitudeArcsec.max}" p99 ${v.longitudeArcsec.p99}"`).join(' | '));
}
for (const [name, value] of Object.entries(houses)) console.log(name.padEnd(9), JSON.stringify(value));
console.log('display', display);
