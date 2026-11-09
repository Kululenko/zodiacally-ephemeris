'use strict';

// Time scales for the Zodiacally ephemeris: UTC <-> Julian Day UT1 / TT.
//
// Conventions:
// - From 1972-01-01 UTC onward: TT = UTC + (TAI-UTC) + 32.184 s and UT1 = TT - DeltaT.
// - Before 1972 civil UTC is treated as UT1 (UTC then followed UT1 within ~0.1 s) and
//   TT = UT1 + DeltaT.
// - Future UTC: TAI-UTC stays at its last value (37 s) for all dates after the leap-second
//   table. No further leap second has been announced, and the CGPM decided in 2022
//   (Resolution 4) to let |UT1-UTC| grow beyond 0.9 s by 2035 at the latest, so future UTC
//   is a fixed offset from TAI. UT1 still comes from Delta T, so UT1-UTC grows slowly.
// - All Julian Days are Gregorian-calendar Julian Days as plain doubles. A double at
//   JD ~2.4e6 resolves 2^-31 day (~40 microseconds); conversions add at most one rounding.

const { JD0, STEP_DAYS, IERS_LAST_JD, DELTA_T_MS } = require('./deltaTTable');

const SECONDS_PER_DAY = 86400;
const MJD_OFFSET = 2400000.5;
// TT - TAI, exact by definition (IAU 1991 Resolution A4; IERS Conventions 2010, eq. 10.1).
const TT_MINUS_TAI = 32.184;

// TAI-UTC in seconds from 1972 onward: [MJD of 0h UTC on which the value takes effect, TAI-UTC].
// Source: IERS Earth Orientation Centre, Leap_Second.dat (hpiers.obspm.fr/iers/bul/bulc/),
// "Updated through IERS Bulletin C 72 issued in July 2026, File expires on 28 June 2027":
// the last leap second was inserted at the end of 2016-12-31; none is scheduled up to 2027-06.
// Identical to USNO tai-utc.dat and ERFA eraDat. After the expiry date the table keeps 37 s
// (see the header; refresh this table if IERS ever announces another leap second).
const LEAP_SECONDS = [
  [41317, 10], [41499, 11], [41683, 12], [42048, 13], [42413, 14], [42778, 15],
  [43144, 16], [43509, 17], [43874, 18], [44239, 19], [44786, 20], [45151, 21],
  [45516, 22], [46247, 23], [47161, 24], [47892, 25], [48257, 26], [48804, 27],
  [49169, 28], [49534, 29], [50083, 30], [50630, 31], [51179, 32], [53736, 33],
  [54832, 34], [56109, 35], [57204, 36], [57754, 37],
];
const LEAP_TABLE_EXPIRES = '2027-06-28';
const MJD_1972 = LEAP_SECONDS[0][0];

// Range in which DeltaT is defined: the 4-point interpolation needs one sample on each side.
const JD_UT1_MIN = JD0 + STEP_DAYS;
const JD_UT1_MAX = JD0 + (DELTA_T_MS.length - 2) * STEP_DAYS;

function rangeError(message) {
  const error = new RangeError(message);
  error.code = 'EPHEMERIS_TIME_OUT_OF_RANGE';
  return error;
}

/**
 * DeltaT = TT - UT1 in seconds at a Julian Day UT1, from the table in deltaTTable.js
 * (sources cited there and in build/delta-t/build_delta_t.py).
 * Interpolation: 4-point Lagrange cubic on the uniform 1/12-year grid
 * (Abramowitz & Stegun 1964, eq. 25.2.13; Meeus, Astronomical Algorithms 2nd ed., ch. 3).
 */
function deltaTSeconds(jdUT1) {
  if (!(jdUT1 >= JD_UT1_MIN && jdUT1 <= JD_UT1_MAX)) {
    throw rangeError(`DeltaT is only tabulated for JD ${JD_UT1_MIN}..${JD_UT1_MAX} (got ${jdUT1}).`);
  }
  const x = (jdUT1 - JD0) / STEP_DAYS;
  const k = Math.min(Math.floor(x), DELTA_T_MS.length - 3);
  const u = x - k;
  const y0 = DELTA_T_MS[k - 1];
  const y1 = DELTA_T_MS[k];
  const y2 = DELTA_T_MS[k + 1];
  const y3 = DELTA_T_MS[k + 2];
  const ms = (-u * (u - 1) * (u - 2) * y0) / 6
    + ((u + 1) * (u - 1) * (u - 2) * y1) / 2
    - ((u + 1) * u * (u - 2) * y2) / 2
    + ((u + 1) * u * (u - 1) * y3) / 6;
  return ms / 1000;
}

/** Julian Day TT for a Julian Day UT1: TT = UT1 + DeltaT(UT1). */
function ut1ToTT(jdUT1) {
  return jdUT1 + deltaTSeconds(jdUT1) / SECONDS_PER_DAY;
}

/**
 * Julian Day UT1 for a Julian Day TT: solves UT1 + DeltaT(UT1) = TT by fixed-point iteration
 * (|dDeltaT/dt| < 1e-7, so each step gains > 7 digits; the result is the exact inverse of
 * ut1ToTT up to floating-point rounding).
 */
function ttToUt1(jdTT) {
  let jdUT1 = jdTT - deltaTSeconds(Math.min(Math.max(jdTT, JD_UT1_MIN), JD_UT1_MAX)) / SECONDS_PER_DAY;
  for (let i = 0; i < 4; i++) {
    const next = jdTT - deltaTSeconds(jdUT1) / SECONDS_PER_DAY;
    if (next === jdUT1) break;
    jdUT1 = next;
  }
  return jdUT1;
}

/**
 * Modified Julian Day number of a Gregorian calendar date (0h).
 * Meeus, Astronomical Algorithms 2nd ed. (1998), eq. (7.1), Gregorian branch.
 */
function mjdOfDate(year, month, day) {
  let y = year;
  let m = month;
  if (m <= 2) {
    y -= 1;
    m += 12;
  }
  const a = Math.floor(y / 100);
  const b = 2 - a + Math.floor(a / 4);
  // JD = INT(365.25(Y+4716)) + INT(30.6001(M+1)) + D + B - 1524.5;  MJD = JD - 2400000.5
  return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + day + b - 2401525;
}

/** Gregorian calendar date of an integer MJD. Meeus (1998), chapter 7, inverse algorithm. */
function dateOfMjd(mjd) {
  const z = mjd + 2400001; // INT(JD + 0.5) for JD = MJD + 2400000.5
  const alpha = Math.floor((z - 1867216.25) / 36524.25);
  const a = z + 1 + alpha - Math.floor(alpha / 4);
  const b = a + 1524;
  const c = Math.floor((b - 122.1) / 365.25);
  const d = Math.floor(365.25 * c);
  const e = Math.floor((b - d) / 30.6001);
  const day = b - d - Math.floor(30.6001 * e);
  const month = e < 14 ? e - 1 : e - 13;
  const year = month > 2 ? c - 4716 : c - 4715;
  return { year, month, day };
}

/** TAI-UTC (s) in effect at 0h UTC of the given MJD (>= 1972). */
function taiMinusUtc(mjd) {
  let dat = LEAP_SECONDS[0][1];
  for (let i = 1; i < LEAP_SECONDS.length && LEAP_SECONDS[i][0] <= mjd; i++) dat = LEAP_SECONDS[i][1];
  return dat;
}

/** Length in seconds of the UTC day with this MJD (86401 on a leap-second day). */
function utcDayLength(mjd) {
  return SECONDS_PER_DAY + taiMinusUtc(mjd + 1) - taiMinusUtc(mjd);
}

function splitSecondsOfDay(mjd, secondsOfDay) {
  // A leap second is 23:59:60.x; it is never split across minutes.
  let hour;
  let minute;
  let second;
  if (secondsOfDay >= SECONDS_PER_DAY) {
    hour = 23;
    minute = 59;
    second = secondsOfDay - SECONDS_PER_DAY + 60;
  } else {
    hour = Math.floor(secondsOfDay / 3600);
    minute = Math.floor((secondsOfDay - hour * 3600) / 60);
    second = secondsOfDay - hour * 3600 - minute * 60;
  }
  return { ...dateOfMjd(mjd), hour, minute, second };
}

/** Split a Julian Day into an integer MJD and seconds of that day (both subtractions exact). */
function splitJd(jd) {
  const days = jd - MJD_OFFSET;
  const mjd = Math.floor(days);
  return { mjd, seconds: Math.min((days - mjd) * SECONDS_PER_DAY, SECONDS_PER_DAY - 1e-9) };
}

function assertInteger(name, value, min, max) {
  if (!Number.isInteger(value) || value < min || value > max) {
    throw rangeError(`Invalid UTC ${name}: ${value}`);
  }
}

/**
 * Julian Days TT and UT1 of a Gregorian UTC date/time.
 * second may carry a fraction; 60 <= second < 61 is accepted only in 23:59 of a leap-second day.
 */
function utcToJd({ year, month, day, hour = 0, minute = 0, second = 0 }) {
  assertInteger('year', year, 1, 9999);
  assertInteger('month', month, 1, 12);
  assertInteger('day', day, 1, 31);
  assertInteger('hour', hour, 0, 23);
  assertInteger('minute', minute, 0, 59);
  const mjd = mjdOfDate(year, month, day);
  if (dateOfMjd(mjd).day !== day) throw rangeError(`Invalid UTC day: ${year}-${month}-${day}`);
  const leapDay = mjd >= MJD_1972 && utcDayLength(mjd) > SECONDS_PER_DAY;
  const maxSecond = leapDay && hour === 23 && minute === 59 ? 61 : 60;
  if (!(Number.isFinite(second) && second >= 0 && second < maxSecond)) {
    throw rangeError(`Invalid UTC second: ${second}`);
  }
  const secondsOfDay = hour * 3600 + minute * 60 + second;

  if (mjd < MJD_1972) {
    const jdUT1 = MJD_OFFSET + mjd + secondsOfDay / SECONDS_PER_DAY;
    return { jdTT: ut1ToTT(jdUT1), jdUT1 };
  }
  // TAI-UTC at 0h of the day applies to the whole day including its leap second, so the
  // inserted second 23:59:60 continues seamlessly into the next day (IERS Conventions 2010
  // ch. 10; same day-based convention as ERFA eraUtctai).
  const jdTT = MJD_OFFSET + mjd + (secondsOfDay + taiMinusUtc(mjd) + TT_MINUS_TAI) / SECONDS_PER_DAY;
  return { jdTT, jdUT1: ttToUt1(jdTT) };
}

// First UT1 instant that utcToJd produces for 1972-01-01T00:00:00 UTC.
const JD_UT1_1972 = ttToUt1(MJD_OFFSET + MJD_1972 + (LEAP_SECONDS[0][1] + TT_MINUS_TAI) / SECONDS_PER_DAY);

/**
 * Gregorian UTC date/time of a Julian Day UT1 (inverse of utcToJd).
 * Before 1972 the result is UT1 itself. Because UT1-UTC at 1972-01-01 was not zero,
 * UT1 instants within |UT1-UTC| (~0.04 s) before that midnight have two pre-images; they
 * are reported as the 1972 UTC reading.
 */
function jdUT1ToUtc(jdUT1) {
  if (!Number.isFinite(jdUT1)) throw rangeError(`Invalid Julian Day: ${jdUT1}`);
  if (jdUT1 < JD_UT1_1972) {
    deltaTSeconds(jdUT1); // range check: same coverage as utcToJd
    const { mjd, seconds } = splitJd(jdUT1);
    return splitSecondsOfDay(mjd, seconds);
  }
  // Work in TAI seconds since MJD 0 so that every leap-second epoch (mjd * 86400 + TAI-UTC)
  // is an exact integer and all comparisons below are consistent (doubles resolve ~0.5 us).
  const tt = splitJd(ut1ToTT(jdUT1));
  const tai = tt.mjd * SECONDS_PER_DAY + tt.seconds - TT_MINUS_TAI;
  let i = LEAP_SECONDS.length - 1;
  while (i > 0 && LEAP_SECONDS[i][0] * SECONDS_PER_DAY + LEAP_SECONDS[i][1] > tai) i--;
  const [, dat] = LEAP_SECONDS[i];
  const next = LEAP_SECONDS[i + 1];
  if (next && tai >= next[0] * SECONDS_PER_DAY + dat) {
    // Inside the inserted leap second: 23:59:60.x of the day before the step.
    const mjd = next[0] - 1;
    return splitSecondsOfDay(mjd, tai - dat - mjd * SECONDS_PER_DAY);
  }
  // No leap second inside this TAI-UTC interval; never report a pre-1972 reading here.
  const utc = Math.max(tai - dat, MJD_1972 * SECONDS_PER_DAY);
  const mjd = Math.floor(utc / SECONDS_PER_DAY);
  return splitSecondsOfDay(mjd, utc - mjd * SECONDS_PER_DAY);
}

module.exports = {
  utcToJd,
  jdUT1ToUtc,
  deltaTSeconds,
  ut1ToTT,
  ttToUt1,
  JD_UT1_MIN,
  JD_UT1_MAX,
  IERS_LAST_JD,
  LEAP_SECONDS,
  LEAP_TABLE_EXPIRES,
};
