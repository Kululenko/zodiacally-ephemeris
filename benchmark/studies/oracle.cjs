#!/usr/bin/env node
'use strict';
// DEV-ONLY black-box reference for the convention studies in this directory. Never imported
// by the zodiacally-ephemeris package or by build/tables/build.py.
// Calls the public sweph API (swe.calc, Terrestrial Time input) for a list of TT
// epochs and prints geocentric ecliptic longitude + longitude speed as JSON
// ("nutationLongitude"/"trueObliquity": delta-psi / true obliquity from SE_ECL_NUT, speed 0).
//
//   node benchmark/studies/oracle.cjs <request.json>   ->  JSON on stdout
//   request: { "jdTT": [..], "bodies": ["sun", ...], "extraFlags": ["SEFLG_NONUT", ...] }
//
// Needs `npm install` (sweph) and `node fetch-swiss-data.mjs` (SE1 files in ephe/), both run
// in benchmark/. The output is only used to measure residuals of our own reduction; it is
// never fed into table generation (see README.md in this directory).
// (.cjs because benchmark/package.json declares "type": "module".)
const fs = require('node:fs');
const path = require('node:path');
const swe = require(path.resolve(__dirname, '..', 'node_modules', 'sweph'));

const c = swe.constants;
const BODY_IDS = {
  sun: c.SE_SUN, moon: c.SE_MOON, mercury: c.SE_MERCURY, venus: c.SE_VENUS,
  mars: c.SE_MARS, jupiter: c.SE_JUPITER, saturn: c.SE_SATURN, uranus: c.SE_URANUS,
  neptune: c.SE_NEPTUNE, pluto: c.SE_PLUTO, chiron: c.SE_CHIRON, trueNode: c.SE_TRUE_NODE,
  nutationLongitude: c.SE_ECL_NUT, trueObliquity: c.SE_ECL_NUT,
};

const request = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
swe.set_ephe_path(path.resolve(__dirname, '..', 'ephe'));
let flags = c.SEFLG_SWIEPH | c.SEFLG_SPEED;
for (const name of request.extraFlags || []) {
  if (!(name in c)) throw new Error(`unknown flag ${name}`);
  flags |= c[name];
}

const out = { version: swe.version(), flags, bodies: {} };
for (const body of request.bodies) {
  const id = BODY_IDS[body];
  if (id === undefined) throw new Error(`unknown body ${body}`);
  const lon = new Array(request.jdTT.length);
  const speed = new Array(request.jdTT.length);
  request.jdTT.forEach((jd, i) => {
    if (id === c.SE_ECL_NUT) {
      const r = swe.calc(jd, id, 0);
      if (r.error) throw new Error(`oracle failed for ${body} at ${jd}: ${r.error}`);
      lon[i] = body === 'trueObliquity' ? r.data[0] : r.data[2];
      speed[i] = 0;
      return;
    }
    const r = swe.calc(jd, id, flags);
    // Refuse silent fallback to the analytical (Moshier) ephemeris.
    if (r.error || (r.flag & c.SEFLG_SWIEPH) === 0) {
      throw new Error(`oracle failed for ${body} at ${jd}: ${r.error} flag=${r.flag}`);
    }
    lon[i] = r.data[0];
    speed[i] = r.data[3];
  });
  out.bodies[body] = { lon, speed };
}
process.stdout.write(JSON.stringify(out));
