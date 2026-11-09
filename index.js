'use strict';

// Zodiacally ephemeris: public API.
//
// - Time currency is the Julian Day UT1 (utcToJd / jdUT1ToUtc, see time.js). Positions are
//   evaluated at TT = UT1 + DeltaT (deltaTSeconds).
// - position(): geocentric apparent ecliptic longitude of date (tropical, true equinox) and its
//   rate in deg/day, from the Chebyshev tables in ./data (see chebyshev.js and the manifest).
// - houses(): Placidus or Whole Sign from sidereal time (IAU 2006 GMST + equation of the
//   equinoxes) with delta-psi and the true obliquity from the nutationLongitude and
//   trueObliquity tables (see houses.js).
// Errors: RangeError code EPHEMERIS_RANGE outside the table coverage (EPHEMERIS_TIME_OUT_OF_RANGE
// from the time functions outside the DeltaT table), EPHEMERIS_DATA_INVALID for corrupt data.

const { evaluate, loadManifest } = require('./chebyshev');
const time = require('./time');
const houseMath = require('./houses');

const ENGINE = 'zodiacally-ephemeris';
const ENGINE_VERSION = '1.1.0';

const BODIES = Object.freeze({
  sun: 'sun',
  moon: 'moon',
  mercury: 'mercury',
  venus: 'venus',
  mars: 'mars',
  jupiter: 'jupiter',
  saturn: 'saturn',
  uranus: 'uranus',
  neptune: 'neptune',
  pluto: 'pluto',
  chiron: 'chiron',
  trueNode: 'trueNode',
});
const BODY_SET = new Set(Object.values(BODIES));

function rangeError(message) {
  const error = new RangeError(message);
  error.code = 'EPHEMERIS_RANGE';
  return error;
}

// Common coverage of all tables in JD TT, and the matching JD UT1 interval (computed once).
let coverage = null;
function getCoverage() {
  if (coverage) return coverage;
  const { manifest } = loadManifest();
  const specs = Object.values(manifest.tables);
  const jdTTStart = Math.max(...specs.map((s) => s.jdStart));
  const jdTTEnd = Math.min(...specs.map((s) => s.jdEnd));
  // Inverse DeltaT, then nudged inward by double-precision steps so that the UT1 bounds
  // themselves always map back inside the TT coverage.
  let jdUT1Start = time.ttToUt1(jdTTStart);
  while (time.ut1ToTT(jdUT1Start) < jdTTStart) jdUT1Start += 1e-9;
  let jdUT1End = time.ttToUt1(jdTTEnd);
  while (time.ut1ToTT(jdUT1End) > jdTTEnd) jdUT1End -= 1e-9;
  coverage = { jdTTStart, jdTTEnd, jdUT1Start, jdUT1End };
  return coverage;
}

function checkBody(body) {
  if (!BODY_SET.has(body)) {
    const error = new TypeError(`Unknown body: ${body}`);
    error.code = 'EPHEMERIS_UNKNOWN_BODY';
    throw error;
  }
}

/** Apparent geocentric ecliptic longitude of date (deg, [0,360)) and speed (deg/day) at JD TT. */
function positionTT(jdTT, body) {
  checkBody(body);
  const { value, rate } = evaluate(body, jdTT);
  return { longitude: value, speed: rate };
}

/** Same as positionTT, for a Julian Day UT1 (TT = UT1 + DeltaT). */
function position(jdUT1, body) {
  checkBody(body);
  const c = getCoverage();
  if (!(jdUT1 >= c.jdUT1Start && jdUT1 <= c.jdUT1End)) {
    throw rangeError(`Ephemeris covers JD UT1 ${c.jdUT1Start}..${c.jdUT1End} (got ${jdUT1}).`);
  }
  const { value, rate } = evaluate(body, time.ut1ToTT(jdUT1));
  return { longitude: value, speed: rate };
}

/**
 * Houses at JD UT1 for a geographic latitude (north +) and longitude (east +), system 'P'
 * (Placidus) or 'W' (Whole Sign). ARMC = GAST + longitude.
 * Returns { cusps: [12] | null, ascendant, mc, armc, error }; Placidus inside the polar circles
 * returns cusps null and error 'PLACIDUS_POLAR' (callers fall back to 'W').
 */
function houses(jdUT1, latitudeDeg, longitudeDeg, system) {
  if (!Number.isFinite(longitudeDeg)) throw new RangeError(`Invalid longitude: ${longitudeDeg}`);
  const c = getCoverage();
  if (!(jdUT1 >= c.jdUT1Start && jdUT1 <= c.jdUT1End)) {
    throw rangeError(`Ephemeris covers JD UT1 ${c.jdUT1Start}..${c.jdUT1End} (got ${jdUT1}).`);
  }
  const jdTT = time.ut1ToTT(jdUT1);
  const deltaPsiDeg = evaluate('nutationLongitude', jdTT).value;
  const trueObliquityDeg = evaluate('trueObliquity', jdTT).value;
  const { gastDeg } = houseMath.sidereal({ jdUT1, jdTT, deltaPsiDeg, trueObliquityDeg });
  return houseMath.houses({ armcDeg: gastDeg + longitudeDeg, latitudeDeg, trueObliquityDeg, system });
}

function deepFreeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
  }
  return value;
}

// ISO 8601 UTC string of a JD UT1, rounded to the millisecond (inward: up for a start bound).
function isoOfJdUT1(jdUT1, roundUp) {
  const u = time.jdUT1ToUtc(jdUT1);
  const ms = roundUp ? Math.ceil(u.second * 1000) : Math.floor(u.second * 1000);
  const date = new Date(Date.UTC(u.year, u.month - 1, u.day, u.hour, u.minute, 0) + ms);
  // Date.UTC maps years 0..99 to 1900..1999; the coverage is 1899..2101, so this never applies.
  return date.toISOString();
}

let infoCache = null;
/** Engine and data identification (computed once). */
function info() {
  if (infoCache) return infoCache;
  const { manifest, sha256 } = loadManifest();
  const c = getCoverage();
  infoCache = deepFreeze({
    engine: ENGINE,
    version: ENGINE_VERSION,
    dataVersion: manifest.dataVersion,
    manifestSha256: sha256,
    coverage: {
      fromUtc: isoOfJdUT1(c.jdUT1Start, true),
      toUtc: isoOfJdUT1(c.jdUT1End, false),
      jdTT: [c.jdTTStart, c.jdTTEnd],
      jdUT1: [c.jdUT1Start, c.jdUT1End],
    },
    sources: structuredClone(manifest.sources),
  });
  return infoCache;
}

module.exports = {
  BODIES,
  utcToJd: time.utcToJd,
  jdUT1ToUtc: time.jdUT1ToUtc,
  deltaTSeconds: time.deltaTSeconds,
  position,
  positionTT,
  houses,
  info,
};
