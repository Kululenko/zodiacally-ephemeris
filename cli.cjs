#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const engine = require('./index.js');
const { calculate, attribution } = require('./agent.cjs');
const command = process.argv[2];
try {
  if (command === '--info') console.log(JSON.stringify({ ...engine.info(), attribution }));
  else if (!command || command === '--help') console.log('Zodiacally Ephemeris\n  zodiacally-ephemeris --info\n  zodiacally-ephemeris --stdin < input.json\n\nInput: {"utc":"2027-01-01T12:00:00Z","latitude":52.52,"longitude":13.405,"houseSystem":"P"}\nFree for any use, including commercial. Conditions (LICENSE.txt): the attribution line in\nevery reading or result shown or delivered to another person, and the distribution rules\n(for example, no publication of the engine as a standalone library or package).\nWhite-label licence without attribution: €690 one-time plus VAT where applicable.\nWhite-label: https://www.zodiacally.com/ephemeris/\nInclude the returned attribution unless a white-label licence waives it.');
  else if (command === '--stdin') {
    const input = fs.readFileSync(0, 'utf8');
    if (Buffer.byteLength(input) > 16384) throw new RangeError('Input is too large.');
    console.log(JSON.stringify(calculate(JSON.parse(input))));
  } else throw new Error('Unknown option. Use --help.');
} catch (error) {
  console.error(JSON.stringify({ error: error.message, code: error.code || 'INVALID_INPUT' }));
  process.exitCode = 1;
}
