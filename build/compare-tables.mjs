// Compares two builds of the data tables (for example the committed data/ and a rebuild on another
// platform) and prints a strict upper bound of the difference they can make to any evaluated value.
//
// For a Chebyshev record value(x) = sum c_k T_k(x) with |T_k(x)| <= 1 on [-1, 1], the difference
// between two records with the same layout is at most sum |c_k - c'_k|. The bound below is the
// maximum of that sum over all records of a table, converted from degrees to arcseconds.
// Records must have identical boundaries; a different refinement layout is reported as such.
//
// Usage: node build/compare-tables.mjs <dataDirA> <dataDirB> [--max-arcsec 1e-6]
// Exit code 0 if every table is byte-identical or within --max-arcsec, 1 otherwise.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const [dirA, dirB] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const limitIndex = process.argv.indexOf('--max-arcsec');
const MAX_ARCSEC = limitIndex < 0 ? 1e-6 : Number(process.argv[limitIndex + 1]);
if (!dirA || !dirB) throw new Error('Usage: node build/compare-tables.mjs <dataDirA> <dataDirB> [--max-arcsec 1e-6]');

const manifestA = JSON.parse(readFileSync(join(dirA, 'manifest.json'), 'utf8'));
const manifestB = JSON.parse(readFileSync(join(dirB, 'manifest.json'), 'utf8'));
const floats = (dir, file) => {
  const bytes = readFileSync(join(dir, file));
  return { bytes, values: new Float64Array(bytes.buffer, bytes.byteOffset, bytes.length / 8) };
};

let ok = true;
const rows = [];
for (const [name, spec] of Object.entries(manifestA.tables)) {
  const specB = manifestB.tables[name];
  if (!specB) { rows.push([name, 'missing in B']); ok = false; continue; }
  if (specB.coefficients !== spec.coefficients || specB.intervalDays !== spec.intervalDays || specB.jdStart !== spec.jdStart) {
    rows.push([name, 'different record layout']); ok = false; continue;
  }
  const n = spec.coefficients;
  const check = (fileA, fileB, rowLength, offset) => {
    const a = floats(dirA, fileA); const b = floats(dirB, fileB);
    if (a.bytes.equals(b.bytes)) return { identical: true, bound: 0 };
    if (a.values.length !== b.values.length) return { layout: true };
    let bound = 0; let boundaryMismatch = false;
    for (let r = 0; r < a.values.length; r += rowLength) {
      for (let k = 0; k < offset; k++) if (a.values[r + k] !== b.values[r + k]) boundaryMismatch = true;
      let sum = 0;
      for (let k = offset; k < rowLength; k++) sum += Math.abs(a.values[r + k] - b.values[r + k]);
      bound = Math.max(bound, sum);
    }
    return { identical: false, bound: bound * 3600, boundaryMismatch };
  };
  const main = check(spec.file, specB.file, n, 0);
  const results = [['main', main]];
  if (spec.refinedRecords || specB.refinedRecords) {
    if (!spec.refinedRecords || !specB.refinedRecords || spec.refinedRecords.count !== specB.refinedRecords.count) {
      results.push(['refined', { layout: true }]);
    } else {
      results.push(['refined', check(spec.refinedRecords.file, specB.refinedRecords.file, n + 2, 2)]);
    }
  }
  for (const [part, r] of results) {
    if (r.layout || r.boundaryMismatch) { rows.push([`${name} (${part})`, 'different record layout']); ok = false; continue; }
    if (r.identical) { rows.push([`${name} (${part})`, 'byte-identical']); continue; }
    const pass = r.bound <= MAX_ARCSEC;
    if (!pass) ok = false;
    rows.push([`${name} (${part})`, `differs; |value difference| <= ${r.bound.toExponential(2)}″ ${pass ? '(within limit)' : '(ABOVE LIMIT)'}`]);
  }
}
for (const [name, text] of rows) console.log(`${name.padEnd(28)} ${text}`);
console.log(ok ? `OK: every table is byte-identical or within ${MAX_ARCSEC}″.` : `FAIL: a table differs by more than ${MAX_ARCSEC}″ or in layout.`);
process.exitCode = ok ? 0 : 1;
