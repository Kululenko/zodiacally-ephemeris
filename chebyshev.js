'use strict';

// Loader and evaluator for the Zodiacally ephemeris tables (data/ at the repository root).
//
// Format contract (formatVersion 2, written by build/tables/build.py):
// - manifest.json lists every table with file, sha256, bytes, jdStart, jdEnd (JD TT),
//   intervalDays, coefficients n and angle.
// - <name>.bin is a little-endian Float64Array of nRecords * n Chebyshev coefficients,
//   nRecords = (jdEnd - jdStart) / intervalDays. Record i covers
//   [jdStart + i * intervalDays, jdStart + (i + 1) * intervalDays]; a time on a record
//   boundary uses the later record, t == jdEnd the last record; nothing is extrapolated.
// - Refined records (new in format 2): a record that one polynomial cannot fit (next to a
//   superior solar conjunction, where the Sun's light deflection changes within hours) is
//   replaced by shorter sub-records. The table's optional refinedRecords entry (file, sha256,
//   bytes, count) names <name>.refined.bin: count rows of n + 2 little-endian float64,
//   [start, end, c_0 .. c_{n-1}], in time order. The sub-records of a refined record are
//   contiguous and cover it exactly; inside it the last sub-record that starts at or before t
//   is used, and its own start and length replace recordStart and intervalDays below.
// - With x = 2 (t - recordStart) / intervalDays - 1:
//     value(t) = sum_{k=0}^{n-1} c_k T_k(x)            (c_0 is not halved)
//     d value / dt = (2 / intervalDays) sum_k c_k T_k'(x)
//   Chebyshev recurrences (Abramowitz & Stegun 1964, eq. 22.7.4; derivative from
//   T_k = cos(k theta), x = cos(theta)):
//     T_{k+1} = 2x T_k - T_{k-1},   T_{k+1}' = 2 T_k + 2x T_k' - T_{k-1}'.
// - Angle tables are continuous (unwrapped) inside a record; values are reduced to [0, 360).
//
// The tables are read once per process, on first use. The manifest must list the 14 contract
// tables with their angle flag and the required coverage, and each file's size and sha256 are
// checked against it before use (EPHEMERIS_DATA_INVALID otherwise).

const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const DATA_DIR = path.join(__dirname, 'data');
const FORMAT_VERSION = 2;
// Format contract: the required tables with their angle flag, each covering at least
// JD TT 2414655.5 (1899-01-01) .. 2488434.5 (2101-01-01).
const REQUIRED_TABLES = Object.freeze({
  sun: true, moon: true, mercury: true, venus: true, mars: true, jupiter: true, saturn: true,
  uranus: true, neptune: true, pluto: true, chiron: true, trueNode: true,
  nutationLongitude: false, trueObliquity: false,
});
const REQUIRED_JD_TT = Object.freeze([2414655.5, 2488434.5]);

function dataError(message) {
  const error = new Error(message);
  error.code = 'EPHEMERIS_DATA_INVALID';
  return error;
}

function rangeError(message) {
  const error = new RangeError(message);
  error.code = 'EPHEMERIS_RANGE';
  return error;
}

const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');

let manifestState = null;
function loadManifest() {
  if (manifestState) return manifestState;
  const bytes = fs.readFileSync(path.join(DATA_DIR, 'manifest.json'));
  const manifest = JSON.parse(bytes.toString('utf8'));
  if (manifest.engine !== 'zodiacally-ephemeris' || manifest.formatVersion !== FORMAT_VERSION) {
    throw dataError(`Unsupported ephemeris data: ${manifest.engine} format ${manifest.formatVersion}.`);
  }
  manifestState = { manifest, sha256: sha256(bytes) };
  return manifestState;
}

// Float64 view of little-endian bytes (copied when unaligned or on a big-endian host).
function float64View(buffer) {
  const length = buffer.length / 8;
  if (os.endianness() === 'LE' && buffer.byteOffset % 8 === 0) {
    return new Float64Array(buffer.buffer, buffer.byteOffset, length);
  }
  const out = new Float64Array(length);
  for (let i = 0; i < length; i++) out[i] = buffer.readDoubleLE(i * 8);
  return out;
}

let tables = null;
function loadTables() {
  if (tables) return tables;
  const { manifest } = loadManifest();
  const loaded = new Map();
  for (const [name, angle] of Object.entries(REQUIRED_TABLES)) {
    const spec = manifest.tables?.[name];
    if (!spec || spec.angle !== angle || spec.unit !== 'deg'
        || !(spec.jdStart <= REQUIRED_JD_TT[0] && spec.jdEnd >= REQUIRED_JD_TT[1])) {
      throw dataError(`Ephemeris table ${name}: missing or outside the format contract.`);
    }
  }
  for (const [name, spec] of Object.entries(manifest.tables)) {
    const nRecords = (spec.jdEnd - spec.jdStart) / spec.intervalDays;
    const n = spec.coefficients;
    if (!Number.isInteger(nRecords) || nRecords < 1 || !Number.isInteger(n) || n < 2
        || spec.bytes !== nRecords * n * 8 || spec.timeScale !== 'TT') {
      throw dataError(`Ephemeris table ${name}: inconsistent manifest entry.`);
    }
    const buffer = fs.readFileSync(path.join(DATA_DIR, path.basename(spec.file)));
    if (buffer.length !== spec.bytes) {
      throw dataError(`Ephemeris table ${name}: ${buffer.length} bytes, manifest says ${spec.bytes}.`);
    }
    if (sha256(buffer) !== spec.sha256) throw dataError(`Ephemeris table ${name}: sha256 mismatch.`);
    const table = {
      name,
      coefficients: float64View(buffer),
      n,
      nRecords,
      jdStart: spec.jdStart,
      jdEnd: spec.jdEnd,
      intervalDays: spec.intervalDays,
      angle: spec.angle === true,
      refined: null,
    };
    if (spec.refinedRecords) table.refined = loadRefinedRecords(table, spec.refinedRecords);
    loaded.set(name, table);
  }
  tables = loaded;
  return tables;
}

// Reads <name>.refined.bin and indexes it by main record: first[i] is the first sub-record of
// record i (or -1), last[i] its last one. Every refined record must be covered exactly by
// contiguous sub-records; the boundaries are exact binary fractions, so equality is exact.
function loadRefinedRecords(table, spec) {
  const { name, n, nRecords, jdStart, intervalDays } = table;
  const stride = n + 2;
  if (!Number.isInteger(spec.count) || spec.count < 1 || spec.bytes !== spec.count * stride * 8) {
    throw dataError(`Ephemeris table ${name}: inconsistent refinedRecords entry.`);
  }
  const buffer = fs.readFileSync(path.join(DATA_DIR, path.basename(spec.file)));
  if (buffer.length !== spec.bytes) {
    throw dataError(`Ephemeris table ${name}: refined records have ${buffer.length} bytes, manifest says ${spec.bytes}.`);
  }
  if (sha256(buffer) !== spec.sha256) throw dataError(`Ephemeris table ${name}: refined records sha256 mismatch.`);
  const rows = float64View(buffer);
  const first = new Int32Array(nRecords).fill(-1);
  const last = new Int32Array(nRecords).fill(-1);
  const broken = (j) => dataError(`Ephemeris table ${name}: refined record ${j} breaks the layout.`);
  let record = -1;
  let next = null; // start of the next sub-record while a refined record is still open
  for (let j = 0; j < spec.count; j++) {
    const start = rows[j * stride];
    const end = rows[j * stride + 1];
    if (next === null) {
      const opened = Math.round((start - jdStart) / intervalDays);
      if (!(opened > record && opened < nRecords && start === jdStart + opened * intervalDays)) throw broken(j);
      record = opened;
      first[record] = j;
    } else if (start !== next) {
      throw broken(j);
    }
    const recordEnd = jdStart + (record + 1) * intervalDays;
    if (!(end > start && end <= recordEnd)) throw broken(j);
    last[record] = j;
    next = end === recordEnd ? null : end;
  }
  if (next !== null) throw broken(spec.count - 1);
  return { rows, stride, first, last };
}

function getTable(name) {
  const table = loadTables().get(name);
  if (!table) throw new TypeError(`Unknown ephemeris table: ${name}`);
  return table;
}

/**
 * Value (deg) and rate (deg/day) of table `name` at Julian Day TT `jdTT`.
 * Angle tables return the value reduced to [0, 360).
 */
function evaluate(name, jdTT) {
  const table = getTable(name);
  const { jdStart, jdEnd, intervalDays, n } = table;
  if (!(jdTT >= jdStart && jdTT <= jdEnd)) {
    throw rangeError(`Ephemeris table ${name} covers JD TT ${jdStart}..${jdEnd} (got ${jdTT}).`);
  }
  const record = Math.min(Math.floor((jdTT - jdStart) / intervalDays), table.nRecords - 1);
  let start = jdStart + record * intervalDays;
  let length = intervalDays;
  let base = record * n;
  let coefficients = table.coefficients;
  const refined = table.refined;
  if (refined && refined.first[record] >= 0) {
    let j = refined.first[record];
    while (j < refined.last[record] && refined.rows[(j + 1) * refined.stride] <= jdTT) j++;
    start = refined.rows[j * refined.stride];
    length = refined.rows[j * refined.stride + 1] - start;
    base = j * refined.stride + 2;
    coefficients = refined.rows;
  }
  const x = (2 * (jdTT - start)) / length - 1;

  // T_0 = 1, T_1 = x, T_0' = 0, T_1' = 1.
  let tPrev = 1;
  let t = x;
  let dPrev = 0;
  let d = 1;
  let value = coefficients[base] + coefficients[base + 1] * x;
  let rate = coefficients[base + 1];
  for (let k = 2; k < n; k++) {
    const tNext = 2 * x * t - tPrev;
    const dNext = 2 * t + 2 * x * d - dPrev;
    const c = coefficients[base + k];
    value += c * tNext;
    rate += c * dNext;
    tPrev = t;
    t = tNext;
    dPrev = d;
    d = dNext;
  }
  rate *= 2 / length;
  if (table.angle) {
    value %= 360;
    if (value < 0) {
      value += 360;
      if (value >= 360) value = 0; // a tiny negative rounds up to 360
    }
  }
  return { value, rate };
}

module.exports = { evaluate, getTable, loadManifest, loadTables, DATA_DIR, FORMAT_VERSION };
