# API reference

```js
const eph = require('zodiacally-ephemeris');                     // CommonJS
import eph, { positionTT, houses } from 'zodiacally-ephemeris';  // ES modules (same instance)
const { calculate } = require('zodiacally-ephemeris/agent');
```

The ES module entry (`index.mjs`) loads the CommonJS engine, so both styles share one instance
and one copy of the tables. TypeScript declarations are included (`index.d.ts`, `agent.d.ts`).
In TypeScript with `"module": "commonjs"` and without `esModuleInterop` (strictly: when neither
`esModuleInterop` nor `allowSyntheticDefaultImports` is in effect), the default import fails
with TS1192; use `import * as eph from 'zodiacally-ephemeris'` there, which works in every
configuration. With `esModuleInterop`, or with `node16`, `nodenext` or `bundler` resolution, the
default import shown above works.

All angles are degrees. Longitudes are in [0, 360). Speeds are degrees per day. Geographic
latitude is north positive, geographic longitude east positive.

## Time

### `utcToJd({ year, month, day, hour = 0, minute = 0, second = 0 })` → `{ jdTT, jdUT1 }`

Converts a UTC reading to Julian days in Terrestrial Time (for positions) and UT1 (for houses).
`year`, `month`, `day`, `hour` and `minute` must be integer numbers; `second` may be fractional
and may be 60.x in the last minute of a leap-second day. Before 1972 the reading is treated as
UT1. For future dates TAI − UTC stays at its current 37 s (no further leap second has been
announced), so TT = UTC + 69.184 s, and UT1 follows the ΔT prediction.

Throws `EPHEMERIS_TIME_OUT_OF_RANGE` for an invalid reading (a non-integer or out-of-range
field, for example 30 February, hour 24, or second 60 on a day without a leap second) or outside
the ΔT table. That table covers UT1 from 1898-10-31 09:00 to 2101-03-03 15:00 (JD 2414593.875
to 2488496.125). Because a reading before 1972 is taken as UT1, and UT1 runs about 36 s behind
UTC by 2101 in the engine's ΔT model, `utcToJd` accepts readings from 1898-10-31 09:00:00 to
about 2101-03-03 15:00:35.7 UTC.

Positions and houses cover less: from 1899-01-01 00:00:04 UTC to 2101-01-13 23:58:50 UTC
(exact bounds in `info().coverage`: `1899-01-01T00:00:03.019Z` to `2101-01-13T23:58:50.815Z`).
Outside it they throw `EPHEMERIS_RANGE`; for example `utcToJd({ year: 1899, month: 1, day: 1 })`
succeeds, but a position or house call at the returned Julian day throws.

The engine does not convert local civil time or time zones; pass UTC.

### `jdUT1ToUtc(jdUT1)` → `{ year, month, day, hour, minute, second }`

Inverse of `utcToJd`. A Julian day stored as a double resolves about 40 µs, so a
UTC → Julian day → UTC round trip returns the reading to within about 20 µs.

### `deltaTSeconds(jdUT1)` → `number`

ΔT = TT − UT1 in seconds, interpolated from the table described in
[conventions.md](conventions.md#time-scales). Throws `EPHEMERIS_TIME_OUT_OF_RANGE` outside the
table.

## Positions

### `positionTT(jdTT, body)` → `{ longitude, speed }`

Apparent geocentric ecliptic longitude of date (tropical, true equinox) at a Julian day TT, and
its rate. Latitude and distance are not available.

### `position(jdUT1, body)` → `{ longitude, speed }`

The same at a Julian day UT1 (TT = UT1 + ΔT). For the same UTC reading,
`position(utcToJd(x).jdUT1, b)` and `positionTT(utcToJd(x).jdTT, b)` return exactly the same
values.

`body` is one of `eph.BODIES`: `sun`, `moon`, `mercury`, `venus`, `mars`, `jupiter`, `saturn`,
`uranus`, `neptune`, `pluto`, `chiron`, `trueNode` (Mars to Pluto are system barycentres). A
negative `speed` means retrograde motion. The lunar south node is `trueNode + 180°`.

## Houses

### `houses(jdUT1, latitude, longitudeEast, system)` → `{ cusps, ascendant, mc, armc, error }`

- `system`: `'P'` (Placidus) or `'W'` (whole sign).
- `latitude`: pass a number from −90 to 90; it is range-checked but not type-checked (see
  [Errors](#errors)). `longitudeEast`: any finite number; values outside ±180 are accepted and
  normalised. It is checked with `Number.isFinite`, so a numeric string throws.
- `cusps`: 12 longitudes, `cusps[0]` = cusp 1. For Placidus `cusps[0]` is the Ascendant and
  `cusps[9]` the MC; for whole sign `cusps[0]` is 0° of the Ascendant's sign.
- `armc`: right ascension of the meridian (local apparent sidereal time) in degrees.
- Inside the polar circles (|latitude| ≥ 90° − true obliquity, about 66.56°) Placidus is
  undefined: `cusps: null`, `error: 'PLACIDUS_POLAR'`; `ascendant`, `mc` and `armc` are still
  returned. Decide explicitly what your application shows then (for example whole sign).

## Identification

### `info()` → `{ engine, version, dataVersion, manifestSha256, coverage, sources }`

`coverage.fromUtc` / `coverage.toUtc` are the exact ISO bounds; `coverage.jdTT` / `jdUT1` the
bounds as Julian days. The returned object is frozen. Store `version` and `dataVersion` with
cached results so you can tell when to recalculate.

## Errors

Errors about dates, times, bodies and data carry a `code`:

| code | thrown by | meaning |
| --- | --- | --- |
| `EPHEMERIS_RANGE` (`RangeError`) | `position`, `positionTT`, `houses` | date outside the table coverage (nothing is extrapolated) |
| `EPHEMERIS_TIME_OUT_OF_RANGE` (`RangeError`) | `utcToJd`, `jdUT1ToUtc`, `deltaTSeconds` | outside the ΔT table, or an invalid UTC reading or Julian day |
| `EPHEMERIS_UNKNOWN_BODY` (`TypeError`) | `position`, `positionTT` | body name not in `BODIES` |
| `EPHEMERIS_DATA_INVALID` (`Error`) | `position`, `positionTT`, `houses` (the tables are checked on first use); `info()` reads only the manifest and reports only an unsupported format | the manifest has an unsupported format or a missing or inconsistent table entry, or a file's size or SHA-256 does not match the manifest |

Invalid arguments to `houses()` throw a plain `RangeError` **without** `code`: a latitude outside
−90…90 or one that converts to `NaN` (for example `undefined` or `'abc'`), a longitude that is
not a finite number, or a house system other than `'P'` or `'W'`. The latitude is not
type-checked: a value that JavaScript converts to a number in range is accepted, so `null`, `''`
or `false` give the houses for latitude 0, `true` those for 1° and `'50'` those for 50°.
Validate the type yourself (the agent wrapper below does). `houses()` checks the longitude
first, then the Julian day, then the house system and the latitude; so a date outside the
coverage throws `EPHEMERIS_RANGE` even if the latitude or house system is invalid as well, while
an invalid longitude is reported before the date.

A data file that is missing from disk surfaces as Node's own file-system error
(`code: 'ENOENT'`), and a manifest that is not valid JSON as a `SyntaxError`; calling `utcToJd()`
without an object throws JavaScript's own `TypeError`. Check `error.code` and treat a missing
code from `houses()` as invalid input.

## Agent wrapper and CLI

`calculate({ utc, latitude, longitude, houseSystem = 'P' })` validates its input and returns
`{ schema, utc, positions, houses, conventions, provenance, attribution, licence }`:

- `utc`: an ISO timestamp in UTC with seconds and `Z`, optionally with one to three decimals
  (`2027-01-01T12:00:00Z`, `2027-01-01T12:00:00.250Z`), for a date that exists. The wrapper
  parses it with JavaScript's `Date`, so it does **not** accept a leap second (`23:59:60`); call
  `utcToJd()` directly for a reading inside a leap second.
- `latitude`: a finite number of type `number` with |latitude| < 90 (the poles are rejected);
  `longitude`: a finite number of type `number` within ±180.
- `houseSystem`: `'P'` (the default, also for `null`) or `'W'`.

A polar Placidus request returns whole-sign houses with `usedSystem: 'W'` and
`fallbackReason: 'PLACIDUS_POLAR'`. Invalid input throws a `TypeError` or `RangeError` without
`code`; errors from the engine keep their codes, so a date outside the coverage throws
`EPHEMERIS_RANGE` or `EPHEMERIS_TIME_OUT_OF_RANGE`.

`attribution` (also exported as `require('zodiacally-ephemeris/agent').attribution`) holds the
line that every reading or result shown or delivered to another person must show under the
licence, in the language of that reading: `en` and `de` (the line in English and German), `url`
(the link target for "Zodiacally Ephemeris"), `required`, `exception` and `placement`. In short
formats where a full line is impractical, such as push notifications or voice output, a clearly
labelled credit reachable from the output is enough (see [LICENSE.txt](../LICENSE.txt),
section 3). `licence` states the terms in machine-readable form (since 1.1.1):

```js
licence: {
  defaultUse: 'free for any use, including commercial use, with the visible attribution line',
  attributionRequired: true,
  commercialUseRequiresSeparateLicence: false,
  whiteLabel: {
    currency: 'EUR', amount: 690, oneTime: true,
    waivesCustomerFacingAttribution: true, requiresSeparateGrant: true,
  },
  terms: 'https://www.zodiacally.com/assets/ephemeris/LICENSE.txt',
}
```

Both objects are the same for every call and every user. `amount` is the one-time fee in euros,
plus VAT where applicable. `whiteLabel` describes the offer, not a grant: the wrapper cannot tell
whether a white-label licence has been granted to you, so show the attribution unless you hold
one. If you pass the results on through an API, include the attribution in your response and
require the recipients to display it. See [AGENTS.md](../AGENTS.md) and
[LICENSE.txt](../LICENSE.txt).

The CLI is installed with the package (the npm release is pending; until then install with
`npm install github:Kululenko/zodiacally-ephemeris`). Run it from your project after installing:

```sh
npx --no-install zodiacally-ephemeris --info
npx --no-install zodiacally-ephemeris --stdin < input.json
# or directly:
node node_modules/zodiacally-ephemeris/cli.cjs --info
```

`--stdin` reads one JSON object of at most 16 KB with the same fields and rules as
`calculate()` (so no leap second either), for example
`{"utc":"2027-01-01T12:00:00Z","latitude":52.52,"longitude":13.405,"houseSystem":"P"}`.
On failure the CLI prints `{"error": …, "code": …}` to stderr and exits with status 1; `code` is
`INVALID_INPUT` when the error has none.

## Performance notes

- Requiring the engine loads Node's crypto module, and the first position or house call reads
  the manifest and the 14 tables (23 binary files; with the manifest, 24 files and 8 MB in
  `data/`) and verifies their SHA-256. Because of this, loading the library and computing the
  first chart in a fresh process (Node.js start-up excluded) took a median of 19.2 ms on an
  Apple M1, against 10.4 ms for the Swiss Ephemeris through `sweph`. After that, `position()`
  is a ΔT interpolation and one Chebyshev polynomial evaluation: about 0.12 µs per call on the
  same machine. See [the benchmark](../benchmark/README.md) for the method.
- The engine is synchronous and keeps no state besides the loaded tables and a few cached
  values, so it can be used from worker threads; each worker loads and verifies its own copy of
  the tables.
- It reads its data with `fs`, so it needs Node.js ≥ 22.12 and read access to its `data/`
  directory. It does not run in a browser.
