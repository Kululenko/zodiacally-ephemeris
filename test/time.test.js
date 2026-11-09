const time = require('../time');
const { DELTA_T_MS } = require('../deltaTTable');

const DAY = 86400;
const seconds = (jdA, jdB) => (jdA - jdB) * DAY;

// Deterministic pseudo-random numbers (mulberry32).
function rng(seed) {
  let s = seed;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// UTC reading -> seconds on a continuous TAI-like scale (leap second 23:59:60 counted in).
function utcScale(u) {
  const mjd = Date.UTC(u.year, u.month - 1, u.day) / 86400000 + 40587;
  let dat = 0;
  for (const [start, value] of time.LEAP_SECONDS) if (start <= mjd) dat = value;
  return mjd * DAY + u.hour * 3600 + u.minute * 60 + u.second + dat;
}

describe('calendar conversion (pre-1972: UTC is treated as UT1)', () => {
  test('Meeus, Astronomical Algorithms, example 7.a: 1957 Oct 4.81 = JD 2436116.31', () => {
    const { jdUT1 } = time.utcToJd({ year: 1957, month: 10, day: 4, hour: 19, minute: 26, second: 24 });
    expect(jdUT1).toBeCloseTo(2436116.31, 9);
  });

  test('J2000.0 epoch and the inverse conversion (Meeus chapter 7)', () => {
    expect(time.utcToJd({ year: 1960, month: 1, day: 1, hour: 12 }).jdUT1).toBe(2436935);
    const u = time.jdUT1ToUtc(2436116.31);
    expect([u.year, u.month, u.day, u.hour, u.minute]).toEqual([1957, 10, 4, 19, 26]);
    expect(u.second).toBeCloseTo(24, 4);
  });

  test('Gregorian leap-year rules are applied', () => {
    expect(time.utcToJd({ year: 2000, month: 3, day: 1 }).jdTT - time.utcToJd({ year: 2000, month: 2, day: 28 }).jdTT)
      .toBeCloseTo(2, 9);
    expect(time.utcToJd({ year: 1900, month: 3, day: 1 }).jdUT1 - time.utcToJd({ year: 1900, month: 2, day: 28 }).jdUT1)
      .toBe(1);
    expect(() => time.utcToJd({ year: 1900, month: 2, day: 29 })).toThrow(RangeError);
    expect(() => time.utcToJd({ year: 2023, month: 4, day: 31 })).toThrow(RangeError);
  });
});

describe('leap seconds (IERS Bulletin C / Leap_Second.dat)', () => {
  test('table: 10 s in 1972 up to 37 s since 2017-01-01, nothing newer announced', () => {
    expect(time.LEAP_SECONDS[0]).toEqual([41317, 10]);
    expect(time.LEAP_SECONDS[time.LEAP_SECONDS.length - 1]).toEqual([57754, 37]);
    expect(time.LEAP_SECONDS).toHaveLength(28);
  });

  test('TT = UTC + (TAI-UTC) + 32.184 s from 1972 on', () => {
    const jd2017 = 2457754.5; // 2017-01-01T00:00:00
    expect(seconds(time.utcToJd({ year: 2017, month: 1, day: 1 }).jdTT, jd2017)).toBeCloseTo(69.184, 4);
    expect(seconds(time.utcToJd({ year: 2016, month: 12, day: 31, hour: 23, minute: 59, second: 59 }).jdTT, jd2017))
      .toBeCloseTo(67.184, 4);
    expect(seconds(time.utcToJd({ year: 1972, month: 1, day: 1 }).jdTT, 2441317.5)).toBeCloseTo(42.184, 4);
  });

  test('23:59:60 is accepted only on a leap-second day and continues into the next day', () => {
    const leap = time.utcToJd({ year: 2016, month: 12, day: 31, hour: 23, minute: 59, second: 60.5 });
    const next = time.utcToJd({ year: 2017, month: 1, day: 1 });
    expect(seconds(next.jdTT, leap.jdTT)).toBeCloseTo(0.5, 4);
    expect(seconds(next.jdUT1, leap.jdUT1)).toBeCloseTo(0.5, 4);
    expect(() => time.utcToJd({ year: 2016, month: 12, day: 30, hour: 23, minute: 59, second: 60 })).toThrow(RangeError);
    expect(() => time.utcToJd({ year: 2016, month: 12, day: 31, hour: 23, minute: 58, second: 60 })).toThrow(RangeError);
    const u = time.jdUT1ToUtc(leap.jdUT1);
    expect([u.year, u.month, u.day, u.hour, u.minute]).toEqual([2016, 12, 31, 23, 59]);
    expect(u.second).toBeCloseTo(60.5, 4);
  });
});

describe('Delta T', () => {
  // Published values (USNO / IERS: TT - UT1 at 0h on Jan 1, observed).
  test.each([
    [1962, 33.99],
    [1970, 40.18],
    [1980, 50.54],
    [1990, 56.86],
    [2000, 63.83],
    [2010, 66.07],
    [2017, 68.59],
  ])('%i: %f s', (year, expected) => {
    const jd = time.utcToJd({ year, month: 1, day: 1 }).jdUT1;
    expect(Math.abs(time.deltaTSeconds(jd) - expected)).toBeLessThan(0.03);
  });

  test('1900 and the long-term extrapolation are in the published range', () => {
    // Stephenson, Morrison & Hohenkerk 2016: about -2 s in 1900; Delta T keeps growing after 2030.
    expect(time.deltaTSeconds(2415020.5)).toBeGreaterThan(-3);
    expect(time.deltaTSeconds(2415020.5)).toBeLessThan(-1);
    expect(time.deltaTSeconds(2488069.5)).toBeGreaterThan(time.deltaTSeconds(2469807.5));
  });

  test('the table is smooth: no jumps between consecutive monthly samples', () => {
    let worst = 0;
    for (let k = 2; k < DELTA_T_MS.length; k++) {
      worst = Math.max(worst, Math.abs(DELTA_T_MS[k] - 2 * DELTA_T_MS[k - 1] + DELTA_T_MS[k - 2]));
    }
    expect(worst).toBeLessThan(60); // ms of second difference per month^2
  });

  test('covers 1899-01-01 .. 2101-01-01 and refuses to extrapolate', () => {
    expect(time.JD_UT1_MIN).toBeLessThanOrEqual(2414655.5);
    expect(time.JD_UT1_MAX).toBeGreaterThanOrEqual(2488434.5);
    expect(() => time.deltaTSeconds(2400000)).toThrow(RangeError);
    expect(() => time.deltaTSeconds(2500000)).toThrow(RangeError);
    expect(() => time.utcToJd({ year: 1890, month: 1, day: 1 })).toThrow(RangeError);
    expect(() => time.utcToJd({ year: 2102, month: 1, day: 1 })).toThrow(RangeError);
    expect(() => time.deltaTSeconds(NaN)).toThrow(expect.objectContaining({ code: 'EPHEMERIS_TIME_OUT_OF_RANGE' }));
  });

  test('ttToUt1 inverts ut1ToTT', () => {
    const random = rng(11);
    for (let i = 0; i < 2000; i++) {
      const jdUT1 = 2414655.5 + random() * 73779;
      expect(Math.abs(seconds(time.ttToUt1(time.ut1ToTT(jdUT1)), jdUT1))).toBeLessThan(1e-4);
    }
  });
});

describe('round trips', () => {
  test('JD UT1 -> UTC -> JD UT1 is exact (1e-6 s) for 1899..2101', () => {
    const random = rng(5);
    for (let i = 0; i < 5000; i++) {
      const jdUT1 = 2414655.5 + random() * 73779;
      expect(Math.abs(seconds(time.utcToJd(time.jdUT1ToUtc(jdUT1)).jdUT1, jdUT1))).toBeLessThan(1e-6);
    }
  });

  test('UTC -> JD -> UTC reproduces the reading to the resolution of a double JD (~20 us)', () => {
    const random = rng(9);
    for (let i = 0; i < 5000; i++) {
      const d = new Date(Date.UTC(1899, 0, 1) + random() * (Date.UTC(2101, 0, 1) - Date.UTC(1899, 0, 1)));
      const u = {
        year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate(),
        hour: d.getUTCHours(), minute: d.getUTCMinutes(), second: d.getUTCSeconds() + random() * 0.999,
      };
      if (u.year === 1971 && u.month === 12 && u.day === 31) continue; // overlap, see below
      const back = time.jdUT1ToUtc(time.utcToJd(u).jdUT1);
      expect(Math.abs(utcScale(back) - utcScale(u))).toBeLessThan(5e-5);
    }
  });

  test('every leap second round-trips', () => {
    for (const [mjd] of time.LEAP_SECONDS.slice(1)) {
      const d = new Date((mjd - 1 - 40587) * 86400000);
      for (const second of [59.5, 60, 60.25, 60.999]) {
        const u = { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate(), hour: 23, minute: 59, second };
        const { jdUT1 } = time.utcToJd(u);
        expect(Math.abs(utcScale(time.jdUT1ToUtc(jdUT1)) - utcScale(u))).toBeLessThan(5e-5);
      }
    }
  });

  test('1971/1972 boundary is continuous in TT and monotonic in UT1', () => {
    const before = time.utcToJd({ year: 1971, month: 12, day: 31, hour: 23, minute: 59, second: 59 });
    const after = time.utcToJd({ year: 1972, month: 1, day: 1 });
    // UT1-UTC was about -0.04 s on 1972-01-01, so the step is 1 s minus that.
    expect(Math.abs(seconds(after.jdUT1, before.jdUT1) - 1)).toBeLessThan(0.1);
    expect(Math.abs(seconds(after.jdTT, before.jdTT) - 1)).toBeLessThan(0.1);
    const u = time.jdUT1ToUtc(after.jdUT1);
    expect([u.year, u.month, u.day, u.hour, u.minute]).toEqual([1972, 1, 1, 0, 0]);
    expect(u.second).toBeLessThan(1e-4);
  });
});

describe('future UTC (no leap seconds known beyond the table)', () => {
  test('TAI-UTC stays at 37 s for all future dates (no switch back to UT1)', () => {
    expect(time.LEAP_TABLE_EXPIRES).toBe('2027-06-28');
    expect(time.UTC_AS_UT1_FROM_MJD).toBeUndefined();
    for (const year of [2027, 2033, 2035, 2050, 2075, 2100]) {
      const mjd = Date.UTC(year, 6, 1) / 86400000 + 40587;
      const { jdTT, jdUT1 } = time.utcToJd({ year, month: 7, day: 1 });
      expect(seconds(jdTT, 2400000.5 + mjd)).toBeCloseTo(69.184, 4);
      // UT1 = TT - DeltaT: UT1-UTC simply follows the Delta T prediction (beyond 0.9 s later on).
      expect(seconds(jdUT1, 2400000.5 + mjd)).toBeCloseTo(69.184 - time.deltaTSeconds(jdUT1), 4);
    }
    // 2033-02-03, the former switch day of the 0.9 s rule, is now continuous in TT.
    const before = time.utcToJd({ year: 2033, month: 2, day: 2, hour: 23, minute: 59, second: 59 });
    const after = time.utcToJd({ year: 2033, month: 2, day: 3 });
    expect(seconds(after.jdTT, before.jdTT)).toBeCloseTo(1, 4);
    expect(seconds(after.jdUT1, before.jdUT1)).toBeCloseTo(1, 4);
  });

  test('far-future UTC round-trips through JD UT1', () => {
    for (const u of [
      { year: 2033, month: 2, day: 3, hour: 0, minute: 0, second: 0.25 },
      { year: 2060, month: 12, day: 31, hour: 23, minute: 59, second: 59.5 },
      { year: 2100, month: 6, day: 15, hour: 12, minute: 30, second: 1 },
    ]) {
      const back = time.jdUT1ToUtc(time.utcToJd(u).jdUT1);
      expect(Math.abs(utcScale(back) - utcScale(u))).toBeLessThan(5e-5);
    }
  });
});
