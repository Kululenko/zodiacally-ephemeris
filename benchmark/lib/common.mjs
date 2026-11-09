// Shared helpers for the benchmark scripts. Dev-only: this directory installs the Swiss
// Ephemeris (npm package `sweph`) purely as an external reference. Nothing here is imported by
// the zodiacally-ephemeris package, and no Swiss Ephemeris output enters its tables; three
// discrete modelling conventions were, however, chosen by comparing residuals against Swiss
// Ephemeris output (see benchmark/studies/README.md).
import { createRequire } from 'node:module';
import { cpus, platform, arch, release, totalmem } from 'node:os';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
export const BENCH_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const REPO_ROOT = resolve(BENCH_DIR, '..');
export const EPHE_DIR = join(BENCH_DIR, 'ephe');

export function option(name, fallback) {
  const index = process.argv.indexOf(name);
  return index < 0 ? fallback : process.argv[index + 1];
}
export const flag = (name) => process.argv.includes(name);

/** The engine under test: the repository root by default, or --engine <path>. */
export function loadEngine() {
  const path = resolve(option('--engine', REPO_ROOT));
  const engine = require(path);
  return { engine, path, info: engine.info() };
}

/** sweph with the Swiss Ephemeris SE1 files (or a JPL file with --jpl) from ./ephe. */
export function loadSwiss({ jplFile = null } = {}) {
  const swe = require('sweph');
  const pkg = JSON.parse(readFileSync(join(dirname(require.resolve('sweph')), 'package.json'), 'utf8'));
  const c = swe.constants;
  if (!existsSync(join(EPHE_DIR, 'sepl_18.se1'))) {
    throw new Error('Swiss Ephemeris data files missing: run `npm run fetch-swiss` first.');
  }
  swe.set_ephe_path(EPHE_DIR);
  // The SE1 header states the JPL ephemeris the files were built from (e.g. "... based on JPL Ephemeris DE441").
  const header = readFileSync(join(EPHE_DIR, 'sepl_18.se1')).subarray(0, 400).toString('latin1')
    .match(/Created for[^\r\n]*/)?.[0].trim() ?? 'unknown';
  let flags = c.SEFLG_SWIEPH | c.SEFLG_SPEED;
  let source = `SE1 files (sepl_18, semo_18, seas_18): "${header}"`;
  if (jplFile) {
    swe.set_jpl_file(jplFile);
    flags = c.SEFLG_JPLEPH | c.SEFLG_SPEED;
    source = `JPL file ${jplFile}`;
  }
  return { swe, c, flags, source, se1Header: header, packageVersion: pkg.version, swissVersion: swe.version() };
}

/** Engine body name -> Swiss Ephemeris body id. */
export function bodyPairs(engine, c) {
  const ids = {
    sun: c.SE_SUN, moon: c.SE_MOON, mercury: c.SE_MERCURY, venus: c.SE_VENUS, mars: c.SE_MARS,
    jupiter: c.SE_JUPITER, saturn: c.SE_SATURN, uranus: c.SE_URANUS, neptune: c.SE_NEPTUNE,
    pluto: c.SE_PLUTO, chiron: c.SE_CHIRON, trueNode: c.SE_TRUE_NODE,
  };
  return Object.values(engine.BODIES).map((body) => [body, ids[body]]);
}

/** Calls swe.calc / calc_ut and fails loudly on an error or on a silent data-source fallback. */
export function swissCalc(swiss, fn, jd, id, { requireSource = true } = {}) {
  const result = swiss.swe[fn](jd, id, swiss.flags);
  if (result.error) throw new Error(`Swiss Ephemeris error for body ${id} at JD ${jd}: ${result.error}`);
  const wanted = swiss.flags & (swiss.c.SEFLG_JPLEPH | swiss.c.SEFLG_SWIEPH);
  if (requireSource && id !== swiss.c.SE_TRUE_NODE && !(result.flag & wanted)) {
    throw new Error(`Swiss Ephemeris fell back to another data source for body ${id} at JD ${jd}`);
  }
  return result.data;
}

/** Deterministic PRNG (mulberry32) so that every run uses identical inputs. */
export function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Signed difference a - b of two angles in degrees, as arcseconds in [-648000, 648000). */
export const arcsec = (a, b) => (((((a - b) % 360) + 540) % 360) - 180) * 3600;

export function stats(values) {
  const finite = values.filter(Number.isFinite);
  if (finite.length !== values.length) throw new Error('Non-finite value in statistics input');
  const abs = finite.map(Math.abs).sort((x, y) => x - y);
  const n = abs.length;
  const at = (q) => abs[Math.floor(q * (n - 1))];
  return {
    n,
    max: abs[n - 1],
    p99: at(0.99),
    median: at(0.5),
    mean: abs.reduce((s, x) => s + x, 0) / n,
    bias: finite.reduce((s, x) => s + x, 0) / n,
  };
}

export function machine() {
  const cpu = cpus();
  return {
    cpu: cpu[0]?.model?.trim(),
    logicalCores: cpu.length,
    memoryGB: Math.round(totalmem() / 2 ** 30),
    platform: platform(),
    osRelease: release(),
    arch: arch(),
    node: process.version,
  };
}

/** results/<YYYY-MM-DD>-<platform>-<arch>/<name>.json (override with --out-dir). */
export function writeResult(name, data) {
  const day = new Date().toISOString().slice(0, 10);
  const dir = resolve(option('--out-dir', join(BENCH_DIR, 'results', `${day}-${platform()}-${arch()}`)));
  mkdirSync(dir, { recursive: true });
  const file = join(dir, `${name}.json`);
  writeFileSync(file, JSON.stringify(data, null, 2) + '\n');
  return file;
}

export const round = (x, digits = 4) => Number.parseFloat(x.toPrecision(digits));
