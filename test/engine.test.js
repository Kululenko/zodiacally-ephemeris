const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const engine = require('..');
const { evaluate, getTable, loadManifest, loadTables, DATA_DIR } = require('../chebyshev');
// Human Design mandala: gate 41 opens the wheel at 302 deg; 64 gates of 5.625 deg, 6 lines each.
const GATE_SEQUENCE = [41, 19, 13, 49, 30, 55, 37, 63, 22, 36, 25, 17, 21, 51, 42, 3, 27, 24, 2, 23, 8, 20,
  16, 35, 45, 12, 15, 52, 39, 53, 62, 56, 31, 33, 7, 4, 29, 59, 40, 64, 47, 6, 46, 18, 48, 57, 32, 50, 28, 44,
  1, 43, 14, 34, 9, 5, 26, 11, 10, 58, 38, 54, 61, 60];
const gateStartLongitude = (gate, line = 1) =>
  (302 + GATE_SEQUENCE.indexOf(gate) * 5.625 + (line - 1) * 0.9375) % 360;
const reference = require('./fixtures/reference.json');

const arcsecBetween = (a, b) => Math.abs(((((a - b) % 360) + 540) % 360) - 180) * 3600;
const signedArcsec = (a, b) => (((((a - b) % 360) + 540) % 360) - 180) * 3600;
const REQUIRED_TT = [2414655.5, 2488434.5]; // 1899-01-01 .. 2101-01-01
const BODY_NAMES = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune',
  'pluto', 'chiron', 'trueNode'];
const TABLE_NAMES = [...BODY_NAMES, 'nutationLongitude', 'trueObliquity'];
const PLANET_NAMES = BODY_NAMES.filter((name) => !['sun', 'moon', 'trueNode'].includes(name));

function rng(seed) {
  let s = seed;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe('manifest and data integrity', () => {
  const { manifest } = loadManifest();

  test('manifest header and table set follow the format contract', () => {
    expect(manifest).toMatchObject({ engine: 'zodiacally-ephemeris', formatVersion: 2 });
    expect(typeof manifest.dataVersion).toBe('string');
    expect(Object.keys(manifest.tables).sort()).toEqual([...TABLE_NAMES].sort());
  });

  test.each(TABLE_NAMES)('%s: size, sha256, record layout and coverage', (name) => {
    const spec = manifest.tables[name];
    const bytes = fs.readFileSync(path.join(DATA_DIR, spec.file));
    expect(bytes.length).toBe(spec.bytes);
    expect(crypto.createHash('sha256').update(bytes).digest('hex')).toBe(spec.sha256);
    const nRecords = (spec.jdEnd - spec.jdStart) / spec.intervalDays;
    expect(Number.isInteger(nRecords)).toBe(true);
    expect(spec.bytes).toBe(nRecords * spec.coefficients * 8);
    expect(spec).toMatchObject({ unit: 'deg', timeScale: 'TT', angle: BODY_NAMES.includes(name) });
    expect(spec.jdStart).toBeLessThanOrEqual(REQUIRED_TT[0]);
    expect(spec.jdEnd).toBeGreaterThanOrEqual(REQUIRED_TT[1]);
    // Planets and Chiron carry refined records next to superior solar conjunctions.
    const refined = spec.refinedRecords;
    expect(Boolean(refined)).toBe(PLANET_NAMES.includes(name));
    if (refined) {
      const rows = fs.readFileSync(path.join(DATA_DIR, refined.file));
      expect(rows.length).toBe(refined.bytes);
      expect(refined.bytes).toBe(refined.count * (spec.coefficients + 2) * 8);
      expect(crypto.createHash('sha256').update(rows).digest('hex')).toBe(refined.sha256);
    }
  });

  test.each(PLANET_NAMES)('%s: refined sub-records cover whole records without gaps', (name) => {
    const { refined, n, jdStart, intervalDays } = getTable(name);
    let covered = 0;
    refined.first.forEach((first, record) => {
      if (first < 0) return;
      const last = refined.last[record];
      const start = (j) => refined.rows[j * refined.stride];
      const end = (j) => refined.rows[j * refined.stride + 1];
      expect(start(first)).toBe(jdStart + record * intervalDays);
      expect(end(last)).toBe(jdStart + (record + 1) * intervalDays);
      for (let j = first; j < last; j++) expect(start(j + 1)).toBe(end(j));
      covered += 1;
    });
    expect(covered).toBeGreaterThan(10);
    expect(refined.stride).toBe(n + 2);
  });

  test.each(['moon.bin', 'uranus.refined.bin'])('a corrupted %s is rejected with EPHEMERIS_DATA_INVALID', (corrupted) => {
    jest.isolateModules(() => {
      const realFs = jest.requireActual('node:fs');
      jest.doMock('node:fs', () => ({
        ...realFs,
        readFileSync: (file, ...rest) => {
          const data = realFs.readFileSync(file, ...rest);
          if (path.basename(String(file)) === corrupted) data[100] ^= 1;
          return data;
        },
      }));
      const isolated = require('../chebyshev');
      expect(() => isolated.evaluate('sun', 2451545)).toThrow(expect.objectContaining({ code: 'EPHEMERIS_DATA_INVALID' }));
    });
    jest.dontMock('node:fs');
  });

  // A manifest that drops a table, flips its angle flag or shortens its coverage must fail on
  // load, not later as an unknown table or a range error in the middle of the coverage.
  test.each([
    ['a missing table', (m) => { delete m.tables.moon; }],
    ['a wrong angle flag', (m) => { m.tables.trueObliquity.angle = true; }],
    ['coverage short of 2101-01-01', (m) => { m.tables.pluto.jdEnd = 2488400.5; }],
    ['a refined-record count that does not match the file', (m) => { m.tables.mars.refinedRecords.count -= 1; }, /refinedRecords/],
  ])('a manifest with %s is rejected with EPHEMERIS_DATA_INVALID', (_, mutate, message = /format contract/) => {
    jest.isolateModules(() => {
      const realFs = jest.requireActual('node:fs');
      jest.doMock('node:fs', () => ({
        ...realFs,
        readFileSync: (file, ...rest) => {
          const data = realFs.readFileSync(file, ...rest);
          if (!String(file).endsWith('manifest.json')) return data;
          const manifest = JSON.parse(data.toString('utf8'));
          mutate(manifest);
          return Buffer.from(JSON.stringify(manifest));
        },
      }));
      const isolated = require('..');
      expect(() => isolated.positionTT(2451545, 'sun')).toThrow(expect.objectContaining({
        code: 'EPHEMERIS_DATA_INVALID', message: expect.stringMatching(message),
      }));
    });
    jest.dontMock('node:fs');
  });
});

describe('Chebyshev evaluator against directly computed reference values', () => {
  // ephemeris-reference.json holds positions computed directly (not from the tables) by the
  // build. fitErrorBoundArcsec is the verified maximum fit error of the record. Epochs of kind
  // 'conjunction' are where a single 16-day polynomial was worst (behind or next to the Sun);
  // the refined sub-records must hold them to the same 0.001".
  test.each(TABLE_NAMES)('%s', (name) => {
    const ref = reference.tables[name];
    const angle = getTable(name).angle;
    expect(ref.jd.length).toBeGreaterThan(300);
    let worst = 0;
    let worstRate = 0;
    for (let i = 0; i < ref.jd.length; i++) {
      const { value, rate } = evaluate(name, ref.jd[i]);
      const error = angle ? arcsecBetween(value, ref.value[i]) : Math.abs(value - ref.value[i]) * 3600;
      const bound = ref.fitErrorBoundArcsec[i];
      expect(error).toBeLessThanOrEqual(bound + 1e-7);
      expect(bound).toBeLessThanOrEqual(0.001);
      expect(error).toBeLessThanOrEqual(0.001);
      worst = Math.max(worst, error);
      // The rate is compared with the five-point difference of the direct values (~1e-3"/day
      // truncation error), except where the deflection changes within hours (conjunction).
      if (ref.kind[i] !== 'conjunction') {
        const rateError = Math.abs(rate - ref.rate[i]) * 3600;
        expect(rateError).toBeLessThanOrEqual(0.005);
        worstRate = Math.max(worstRate, rateError);
      }
      if (angle) {
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThan(360);
      }
    }
    expect(worst).toBeLessThanOrEqual(0.001);
    expect(worstRate).toBeLessThanOrEqual(0.005);
  });

  test('the rate is the derivative of the value (central difference inside records)', () => {
    const random = rng(11);
    const h = 1e-3;
    for (const name of TABLE_NAMES) {
      const { jdStart, intervalDays, nRecords, angle } = getTable(name);
      for (let i = 0; i < 200; i++) {
        const record = Math.floor(random() * nRecords);
        const t = jdStart + (record + 0.01 + 0.98 * random()) * intervalDays;
        const ahead = evaluate(name, t + h).value;
        const behind = evaluate(name, t - h).value;
        const numeric = (angle ? signedArcsec(ahead, behind) : (ahead - behind) * 3600) / (2 * h);
        // Moon: |d3/dt3| ~ 2e4 "/day^3 -> truncation h^2/6 * f''' ~ 3e-3 "/day; rounding ~2e-6/h.
        expect(Math.abs(evaluate(name, t).rate * 3600 - numeric)).toBeLessThan(0.02);
      }
    }
  });
});

describe('record boundaries', () => {
  // The polynomial pieces evaluate() uses, in time order: each main record, or the sub-records
  // that replace a refined record. Each piece: coefficient array, offset and length (days).
  function pieces(name) {
    const { coefficients, n, nRecords, intervalDays, refined } = getTable(name);
    const list = [];
    for (let i = 0; i < nRecords; i++) {
      if (refined && refined.first[i] >= 0) {
        for (let j = refined.first[i]; j <= refined.last[i]; j++) {
          const start = refined.rows[j * refined.stride];
          list.push({ c: refined.rows, base: j * refined.stride + 2, length: refined.rows[j * refined.stride + 1] - start });
        }
      } else {
        list.push({ c: coefficients, base: i * n, length: intervalDays });
      }
    }
    return { list, n };
  }

  // At x = +1: T_k = 1, T_k' = k^2; at x = -1: T_k = (-1)^k, T_k' = (-1)^(k+1) k^2.
  function boundaryJumps(name) {
    const { list, n } = pieces(name);
    const { angle } = getTable(name);
    let value = 0;
    let rate = 0;
    const rateJumps = [];
    for (let i = 1; i < list.length; i++) {
      const prev = list[i - 1];
      const next = list[i];
      let end = 0;
      let start = 0;
      let endRate = 0;
      let startRate = 0;
      for (let k = 0; k < n; k++) {
        const sign = k % 2 ? -1 : 1;
        end += prev.c[prev.base + k];
        start += sign * next.c[next.base + k];
        endRate += prev.c[prev.base + k] * k * k;
        startRate -= sign * next.c[next.base + k] * k * k;
      }
      const jump = angle ? signedArcsec(start, end) : (start - end) * 3600;
      const rateJump = Math.abs((startRate * 2) / next.length - (endRate * 2) / prev.length) * 3600;
      value = Math.max(value, Math.abs(jump));
      rate = Math.max(rate, rateJump);
      rateJumps.push(rateJump);
    }
    rateJumps.sort((a, b) => a - b);
    return { value, rate, rateMedian: rateJumps[Math.floor(rateJumps.length / 2)] };
  }

  const smooth = new Set(['sun', 'moon', 'trueNode', 'nutationLongitude', 'trueObliquity']);
  const RATE_JUMP_PLANETS = 0.5;
  const report = {};
  afterAll(() => {
    // Max jump per table across every record boundary (value in arcsec, rate in arcsec/day).
    console.info(`record-boundary jumps:\n${Object.entries(report)
      .map(([name, r]) => `  ${name.padEnd(18)} value ${r.value.toExponential(2)}"  rate max ${r.rate.toExponential(2)}"/d  median ${r.rateMedian.toExponential(2)}"/d`)
      .join('\n')}`);
  });

  test.each(TABLE_NAMES)('%s is continuous across every record and sub-record boundary', (name) => {
    const jumps = boundaryJumps(name);
    report[name] = jumps;
    // Lobatto interpolation shares the end points of neighbouring records and sub-records.
    expect(jumps.value).toBeLessThan(1e-7);
    expect(jumps.rateMedian).toBeLessThan(2e-4);
    // Derivatives are not shared: < 0.001"/day for smooth tables; planets and Chiron reach
    // ~0.1"/day only between sub-records next to a superior solar conjunction.
    expect(jumps.rate).toBeLessThan(smooth.has(name) ? 1e-3 : RATE_JUMP_PLANETS);
  });

  test('a time on a boundary uses the later record and agrees with the earlier one', () => {
    const { jdStart, intervalDays } = getTable('moon');
    const boundary = jdStart + 1000 * intervalDays;
    const at = evaluate('moon', boundary).value;
    expect(arcsecBetween(at, evaluate('moon', boundary - 1e-9).value)).toBeLessThan(1e-3);
    expect(arcsecBetween(at, evaluate('moon', boundary + 1e-9).value)).toBeLessThan(1e-3);
  });
});

describe('range handling', () => {
  const [jdTTStart, jdTTEnd] = engine.info().coverage.jdTT;
  const [ut1Start, ut1End] = engine.info().coverage.jdUT1;

  test('table ends are inclusive', () => {
    for (const body of BODY_NAMES) {
      expect(Number.isFinite(engine.positionTT(jdTTStart, body).longitude)).toBe(true);
      expect(Number.isFinite(engine.positionTT(jdTTEnd, body).longitude)).toBe(true);
      expect(Number.isFinite(engine.position(ut1Start, body).longitude)).toBe(true);
      expect(Number.isFinite(engine.position(ut1End, body).longitude)).toBe(true);
    }
    expect(engine.houses(ut1Start, 50, 10, 'P').error).toBeNull();
    expect(engine.houses(ut1End, 50, 10, 'W').error).toBeNull();
  });

  test.each([
    ['before the start', (s) => s - 1e-6],
    ['after the end', (s, e) => e + 1e-6],
    ['NaN', () => NaN],
    ['Infinity', () => Infinity],
  ])('throws EPHEMERIS_RANGE %s', (_, pick) => {
    const range = { code: 'EPHEMERIS_RANGE' };
    expect(() => engine.positionTT(pick(jdTTStart, jdTTEnd), 'sun')).toThrow(expect.objectContaining(range));
    expect(() => engine.position(pick(ut1Start, ut1End), 'moon')).toThrow(expect.objectContaining(range));
    expect(() => engine.houses(pick(ut1Start, ut1End), 50, 10, 'P')).toThrow(expect.objectContaining(range));
  });

  test('required coverage 1899-01-01 .. 2101-01-01 (TT) is inside the tables', () => {
    expect(jdTTStart).toBeLessThanOrEqual(REQUIRED_TT[0]);
    expect(jdTTEnd).toBeGreaterThanOrEqual(REQUIRED_TT[1]);
    // Human Design design moments of 1900 births reach ~1899-10.
    const { jdUT1 } = engine.utcToJd({ year: 1899, month: 10, day: 1 });
    expect(() => engine.position(jdUT1, 'sun')).not.toThrow();
  });

  test('unknown bodies and the auxiliary tables are not positions', () => {
    for (const body of ['nutationLongitude', 'meanNode', 'Sun', undefined]) {
      expect(() => engine.positionTT(2451545, body)).toThrow(expect.objectContaining({ code: 'EPHEMERIS_UNKNOWN_BODY' }));
    }
  });
});

describe('public API', () => {
  test('BODIES is frozen and lists the twelve bodies', () => {
    expect(Object.isFrozen(engine.BODIES)).toBe(true);
    expect(Object.values(engine.BODIES)).toEqual(BODY_NAMES);
  });

  test('info() identifies the engine and data and is computed once', () => {
    const info = engine.info();
    const manifestBytes = fs.readFileSync(path.join(DATA_DIR, 'manifest.json'));
    expect(info).toMatchObject({
      engine: 'zodiacally-ephemeris',
      version: expect.stringMatching(/^\d+\.\d+\.\d+$/),
      dataVersion: loadManifest().manifest.dataVersion,
      manifestSha256: crypto.createHash('sha256').update(manifestBytes).digest('hex'),
      coverage: { fromUtc: expect.stringMatching(/^1899-01-01T/), toUtc: expect.stringMatching(/^2101-01-1/) },
    });
    expect(info.sources.de440s.sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(engine.info()).toBe(info);
    expect(Object.isFrozen(info.sources)).toBe(true);
  });

  test('position(jdUT1) equals positionTT at TT = UT1 + DeltaT', () => {
    const jdUT1 = 2460000.25;
    const jdTT = jdUT1 + engine.deltaTSeconds(jdUT1) / 86400;
    for (const body of BODY_NAMES) expect(engine.position(jdUT1, body)).toEqual(engine.positionTT(jdTT, body));
  });

  test('all tables load quickly and only once', () => {
    expect(loadTables()).toBe(loadTables());
    expect(loadTables().size).toBe(TABLE_NAMES.length);
  });
});

describe('houses invariants', () => {
  const random = rng(5);
  const jd0 = 2415020.5; // 1900
  const span = 2488070.5 - jd0; // .. 2100

  test('Placidus: Asc = cusp 1, MC = cusp 10, opposite cusps, cusps in zodiacal order', () => {
    for (let i = 0; i < 400; i++) {
      const jdUT1 = jd0 + random() * span;
      const lat = (random() * 2 - 1) * 66;
      const lon = random() * 360 - 180;
      const h = engine.houses(jdUT1, lat, lon, 'P');
      expect(h.error).toBeNull();
      expect(h.cusps).toHaveLength(12);
      expect(h.cusps[0]).toBe(h.ascendant);
      expect(h.cusps[9]).toBe(h.mc);
      let total = 0;
      for (let k = 0; k < 12; k++) {
        expect(h.cusps[k]).toBeGreaterThanOrEqual(0);
        expect(h.cusps[k]).toBeLessThan(360);
        expect(arcsecBetween(h.cusps[(k + 6) % 12], h.cusps[k] + 180)).toBeLessThan(1e-6);
        const gap = (((h.cusps[(k + 1) % 12] - h.cusps[k]) % 360) + 360) % 360;
        expect(gap).toBeGreaterThan(0);
        total += gap;
      }
      expect(total).toBeCloseTo(360, 9);
    }
  });

  test('Whole Sign: 30-degree cusps starting at the sign of the Ascendant', () => {
    for (let i = 0; i < 200; i++) {
      const jdUT1 = jd0 + random() * span;
      const lat = (random() * 2 - 1) * 89;
      const h = engine.houses(jdUT1, lat, random() * 360 - 180, 'W');
      expect(h.error).toBeNull();
      expect(h.cusps[0]).toBe(Math.floor(h.ascendant / 30) * 30);
      h.cusps.forEach((c, k) => expect(c).toBe((h.cusps[0] + 30 * k) % 360));
    }
  });

  test('ARMC follows the geographic longitude; MC is independent of latitude', () => {
    const jdUT1 = 2451545.3;
    const a = engine.houses(jdUT1, 40, 0, 'P');
    const b = engine.houses(jdUT1, -35, 75.5, 'P');
    expect(arcsecBetween(b.armc, a.armc + 75.5)).toBeLessThan(1e-6);
    expect(arcsecBetween(engine.houses(jdUT1, -35, 0, 'W').mc, a.mc)).toBe(0);
    expect(arcsecBetween(engine.houses(jdUT1, 40, 360, 'P').ascendant, a.ascendant)).toBeLessThan(1e-6);
  });

  test('Placidus fails inside the polar circles (both hemispheres); Whole Sign does not', () => {
    for (const lat of [67, 70, 78.2232, -67, -80]) {
      const p = engine.houses(2451545.3, lat, 15, 'P');
      expect(p).toMatchObject({ cusps: null, error: 'PLACIDUS_POLAR' });
      expect(Number.isFinite(p.ascendant) && Number.isFinite(p.mc)).toBe(true);
      expect(engine.houses(2451545.3, lat, 15, 'W').cusps).toHaveLength(12);
    }
    expect(engine.houses(2451545.3, 66, 15, 'P').error).toBeNull();
    expect(engine.houses(2451545.3, -66, 15, 'P').error).toBeNull();
  });

  test('rejects unknown systems and invalid coordinates', () => {
    expect(() => engine.houses(2451545, 50, 10, 'K')).toThrow(RangeError);
    expect(() => engine.houses(2451545, 91, 10, 'W')).toThrow(RangeError);
    expect(() => engine.houses(2451545, 50, NaN, 'W')).toThrow(RangeError);
  });
});

describe('end-to-end charts', () => {
  // In the Zodiacally app, complete charts are additionally pinned by canonical-chart fixtures.
  // The comparison with the Swiss Ephemeris and NASA/JPL Horizons runs dev-only in the
  // benchmark/ directory of this repository.

  test('Steve Jobs: Sun enters gate 37 line 1 at the published 19:17:40 PST (within 2 s)', () => {
    // 1955-02-24 19:15 PST = 1955-02-25 03:15 UTC (UTC treated as UT1 before 1972).
    const target = gateStartLongitude(37, 1);
    let lo = engine.utcToJd({ year: 1955, month: 2, day: 25, hour: 3, minute: 15 }).jdUT1;
    let hi = lo + 10 / 1440;
    expect(engine.position(lo, 'sun').longitude).toBeLessThan(target);
    expect(engine.position(hi, 'sun').longitude).toBeGreaterThan(target);
    for (let i = 0; i < 50; i++) {
      const mid = (lo + hi) / 2;
      if (engine.position(mid, 'sun').longitude < target) lo = mid;
      else hi = mid;
    }
    const published = engine.utcToJd({ year: 1955, month: 2, day: 25, hour: 3, minute: 17, second: 40 }).jdUT1;
    expect(Math.abs(lo - published) * 86400).toBeLessThanOrEqual(2);
  });

  test('UTC round trip through the public API', () => {
    const parts = { year: 2016, month: 12, day: 31, hour: 23, minute: 59, second: 60.5 };
    const back = engine.jdUT1ToUtc(engine.utcToJd(parts).jdUT1);
    expect(back).toMatchObject({ year: 2016, month: 12, day: 31, hour: 23, minute: 59 });
    expect(back.second).toBeCloseTo(60.5, 3);
  });
});
