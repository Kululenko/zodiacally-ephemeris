// Downloads the reference data used by the comparison into ./ephe (git-ignored):
// - the Swiss Ephemeris SE1 files from the official Swiss Ephemeris repository published by
//   Astrodienst, pinned to one revision and verified by SHA-256, together with their licence
//   file (ephe/LICENSE);
// - with --jpl, NASA/JPL's DE440 binary (public domain, ~102 MB) so that the Swiss Ephemeris
//   can also be run on the same JPL data as Zodiacally Ephemeris (`agreement.mjs --jpl`).
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { EPHE_DIR, flag } from './lib/common.mjs';

// Raw-file base URL of the official Swiss Ephemeris repository, and the pinned revision.
const SWISS_REPOSITORY_RAW = 'https://raw.githubusercontent.com/aloistr/swisseph';
const REVISION = '3fd0f956d73898b91cc4f67cf18b21af656d1342';
const SWISS = {
  'sepl_18.se1': ['ephe/sepl_18.se1', 'ca1393ceab3a44fbc895887cf789c68819ae6a1cbc9b22225872dbe4ccd99a66'],
  'semo_18.se1': ['ephe/semo_18.se1', '1ca07bd67c24374d77226180c20a4f9996cba013697894810518e7eb582ca4f7'],
  'seas_18.se1': ['ephe/seas_18.se1', 'a2cd8fc33807c78ca9a700c91c2e042258b12fc4796519e00781440b5ad8b2e2'],
  LICENSE: ['LICENSE', 'b6345743292c516d07799dfad46f1a641e5270da2160cc4d6bd54594d6faa991'],
};
const JPL_URL = 'https://ssd.jpl.nasa.gov/ftp/eph/planets/Linux/de440/linux_p1550p2650.440';
const JPL_BYTES = 102272352;

const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');

async function download(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  return Buffer.from(await response.arrayBuffer());
}

mkdirSync(EPHE_DIR, { recursive: true });
for (const [name, [path, expected]] of Object.entries(SWISS)) {
  const target = join(EPHE_DIR, name);
  if (existsSync(target) && sha256(readFileSync(target)) === expected) {
    console.log(`ok       ${name}`);
    continue;
  }
  const bytes = await download(`${SWISS_REPOSITORY_RAW}/${REVISION}/${path}`);
  const actual = sha256(bytes);
  if (actual !== expected) throw new Error(`${name}: SHA-256 ${actual}, expected ${expected}`);
  writeFileSync(target, bytes);
  console.log(`fetched  ${name} (${bytes.length} bytes, sha256 verified)`);
}

if (flag('--jpl')) {
  const target = join(EPHE_DIR, 'de440.eph');
  if (existsSync(target) && readFileSync(target).length === JPL_BYTES) {
    console.log('ok       de440.eph');
  } else {
    console.log(`fetching ${JPL_URL} (~102 MB) ...`);
    const bytes = await download(JPL_URL);
    if (bytes.length !== JPL_BYTES) throw new Error(`de440.eph: ${bytes.length} bytes, expected ${JPL_BYTES}`);
    writeFileSync(target, bytes);
    console.log(`fetched  de440.eph (${bytes.length} bytes, sha256 ${sha256(bytes)})`);
  }
}
