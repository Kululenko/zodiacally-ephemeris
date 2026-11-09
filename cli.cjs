#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const engine = require('./index.js');
const { calculate, attribution } = require('./agent.cjs');
const command = process.argv[2];
try {
  if (command === '--info') console.log(JSON.stringify({ ...engine.info(), attribution }));
  else if (!command || command === '--help') console.log('Zodiacally Ephemeris\n  zodiacally-ephemeris --info\n  zodiacally-ephemeris --stdin < input.json\n\nInput: {"utc":"2027-01-01T12:00:00Z","latitude":52.52,"longitude":13.405,"houseSystem":"P"}\nFree only for private, personal, non-commercial use - not for businesses, client work,\npaid readings or public services, even free ones; free use also requires the attribution\nline in every generated reading. Commercial licences: https://www.zodiacally.com/ephemeris/\nInclude the returned attribution in every reading unless a white-label licence waives it.');
  else if (command === '--stdin') {
    const input = fs.readFileSync(0, 'utf8');
    if (Buffer.byteLength(input) > 16384) throw new RangeError('Input is too large.');
    console.log(JSON.stringify(calculate(JSON.parse(input))));
  } else throw new Error('Unknown option. Use --help.');
} catch (error) {
  console.error(JSON.stringify({ error: error.message, code: error.code || 'INVALID_INPUT' }));
  process.exitCode = 1;
}
