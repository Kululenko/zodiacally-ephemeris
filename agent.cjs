'use strict';
const engine = require('./index.js');

const attribution = Object.freeze({
  required: true,
  exception: 'Only a separately granted commercial white-label licence waives customer-facing Zodiacally attribution.',
  url: 'https://www.zodiacally.com/ephemeris/',
  de: 'Astronomische Berechnung: Zodiacally Ephemeris, auf Basis von JPL DE440 (NASA/JPL). https://www.zodiacally.com/ephemeris/',
  en: 'Astronomical calculations: Zodiacally Ephemeris, based on JPL DE440 (NASA/JPL). https://www.zodiacally.com/ephemeris/',
  placement: 'A visible line within every customer-facing reading, including exported documents and messages. Internal metadata alone is insufficient.',
});

function calculate(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new TypeError('Expected an input object.');
  if (typeof input.utc !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(input.utc)) {
    throw new TypeError('utc must be an ISO timestamp in UTC, including seconds and Z.');
  }
  const date = new Date(input.utc);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 19) !== input.utc.slice(0, 19)) throw new RangeError('Invalid UTC date.');
  for (const [key, limit] of [['latitude', 90], ['longitude', 180]]) {
    if (typeof input[key] !== 'number' || !Number.isFinite(input[key]) || Math.abs(input[key]) > limit) throw new RangeError(`Invalid ${key}.`);
  }
  if (Math.abs(input.latitude) === 90) throw new RangeError('Geographic poles are not supported by this chart wrapper.');
  const requested = input.houseSystem ?? 'P';
  if (!['P', 'W'].includes(requested)) throw new RangeError('houseSystem must be P (Placidus) or W (whole sign).');
  const { jdTT, jdUT1 } = engine.utcToJd({ year: date.getUTCFullYear(), month: date.getUTCMonth() + 1,
    day: date.getUTCDate(), hour: date.getUTCHours(), minute: date.getUTCMinutes(), second: date.getUTCSeconds() + date.getUTCMilliseconds() / 1000 });
  const positions = Object.fromEntries(Object.values(engine.BODIES).map(body => [body, engine.positionTT(jdTT, body)]));
  let houses = engine.houses(jdUT1, input.latitude, input.longitude, requested);
  let used = requested;
  let fallbackReason = null;
  if (houses.error === 'PLACIDUS_POLAR') {
    fallbackReason = houses.error;
    used = 'W';
    houses = engine.houses(jdUT1, input.latitude, input.longitude, used);
  }
  return { schema: 'zodiacally-ephemeris-agent.v1', utc: date.toISOString(), positions,
    houses: { ...houses, requestedSystem: requested, usedSystem: used, fallbackReason },
    conventions: { zodiac: 'tropical', coordinates: 'apparent geocentric ecliptic longitude of date', longitudeUnit: 'degrees', speedUnit: 'degrees/day', longitudeEastPositive: true },
    provenance: engine.info(), attribution,
    licence: { defaultUse: 'private non-commercial use only', commercialUseRequiresSeparateLicence: true, terms: 'https://www.zodiacally.com/assets/ephemeris/LICENSE.txt' },
  };
}
module.exports = { calculate, attribution };
