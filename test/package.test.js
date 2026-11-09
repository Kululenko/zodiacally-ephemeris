const { execFileSync } = require('node:child_process');
const path = require('node:path');

const engine = require('..');
const { calculate, attribution } = require('../agent.cjs');
const horizons = require('./fixtures/horizons-golden.json');
const pkg = require('../package.json');

const ROOT = path.join(__dirname, '..');
const arcsecBetween = (a, b) => Math.abs(((((a - b) % 360) + 540) % 360) - 180) * 3600;

describe('NASA/JPL Horizons (DE441) golden values', () => {
  // Horizons quantity 31 is defined in the IAU 1976/1980 frame; between 1900 and 2100 that frame
  // differs from the IAU 2006/2000A frame of the engine by up to ~0.25" in longitude (shared by
  // every body, see benchmark/README.md). Everything beyond that would be an ephemeris error.
  test.each(Object.keys(horizons.longitude))('%s agrees with Horizons within the frame difference', (body) => {
    const expected = horizons.longitude[body];
    let worst = 0;
    horizons.jdTT.forEach((jd, i) => {
      worst = Math.max(worst, arcsecBetween(engine.positionTT(jd, body).longitude, expected[i]));
    });
    expect(horizons.jdTT).toHaveLength(200);
    expect(worst).toBeLessThan(0.26);
  });

  test('the residual is common to all bodies (frame), not body-specific', () => {
    horizons.jdTT.forEach((jd, i) => {
      const signed = (body) => {
        const d = engine.positionTT(jd, body).longitude - horizons.longitude[body][i];
        return ((((d % 360) + 540) % 360) - 180) * 3600;
      };
      const sun = signed('sun');
      for (const body of ['moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto', 'chiron']) {
        // 0.36 mas output resolution of Horizons plus the light-deflection model near the Sun.
        expect(Math.abs(signed(body) - sun)).toBeLessThan(0.02);
      }
    });
  });
});

describe('agent wrapper', () => {
  test('returns positions for all bodies, houses, provenance and the attribution', () => {
    const result = calculate({ utc: '2027-01-01T12:00:00Z', latitude: 52.52, longitude: 13.405, houseSystem: 'P' });
    expect(Object.keys(result.positions).sort()).toEqual(Object.values(engine.BODIES).sort());
    expect(result.houses.cusps).toHaveLength(12);
    expect(result.houses.usedSystem).toBe('P');
    expect(result.provenance.version).toBe(pkg.version);
    expect(result.attribution).toBe(attribution);
  });

  test('reports the whole-sign fallback inside the polar circles', () => {
    const result = calculate({ utc: '2027-06-21T12:00:00Z', latitude: 78.22, longitude: 15.65 });
    expect(result.houses).toMatchObject({ requestedSystem: 'P', usedSystem: 'W', fallbackReason: 'PLACIDUS_POLAR' });
  });

  test.each([
    [{ utc: '2027-01-01 12:00', latitude: 0, longitude: 0 }],
    [{ utc: '2027-02-30T12:00:00Z', latitude: 0, longitude: 0 }],
    [{ utc: '2027-01-01T12:00:00Z', latitude: 91, longitude: 0 }],
    [{ utc: '2027-01-01T12:00:00Z', latitude: 0, longitude: 0, houseSystem: 'K' }],
  ])('rejects invalid input %#', (input) => {
    expect(() => calculate(input)).toThrow();
  });
});

describe('command line', () => {
  test('--info prints the engine identity', () => {
    const out = JSON.parse(execFileSync(process.execPath, [path.join(ROOT, 'cli.cjs'), '--info'], { encoding: 'utf8' }));
    expect(out).toMatchObject({ engine: 'zodiacally-ephemeris', version: pkg.version });
  });

  test('--stdin calculates a chart from JSON', () => {
    const input = JSON.stringify({ utc: '2027-01-01T12:00:00Z', latitude: -33.87, longitude: 151.21, houseSystem: 'W' });
    const out = JSON.parse(execFileSync(process.execPath, [path.join(ROOT, 'cli.cjs'), '--stdin'], { input, encoding: 'utf8' }));
    expect(out.houses.usedSystem).toBe('W');
    expect(out.positions.moon.longitude).toBeGreaterThanOrEqual(0);
  });
});

describe('module formats', () => {
  test('the ES module entry exposes named exports of the same instance', async () => {
    const esm = await import('../index.mjs');
    expect(esm.default).toBe(engine);
    expect(esm.positionTT).toBe(engine.positionTT);
    expect(Object.keys(esm).sort()).toEqual(['default', ...Object.keys(engine)].sort());
  });
});

describe('published package contents', () => {
  test('npm pack ships the engine, data and notices only (no benchmark, Swiss Ephemeris or build tools)', () => {
    const windows = process.platform === 'win32';
    const [report] = JSON.parse(execFileSync(windows ? 'npm.cmd' : 'npm', ['pack', '--dry-run', '--json', '--ignore-scripts'], { cwd: ROOT, encoding: 'utf8', shell: windows }));
    const files = report.files.map((f) => f.path).sort();
    for (const required of ['index.js', 'index.mjs', 'index.d.ts', 'agent.cjs', 'cli.cjs', 'chebyshev.js', 'houses.js', 'time.js', 'deltaTTable.js', 'data/manifest.json', 'LICENSE.txt', 'SOURCES.md', 'README.md']) {
      expect(files).toContain(required);
    }
    expect(files.filter((f) => /benchmark|sweph|\.se1$|build\/|test\//.test(f))).toEqual([]);
    expect(report.version).toBe(engine.info().version);
  });
});
