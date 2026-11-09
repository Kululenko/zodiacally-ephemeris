# Zodiacally Ephemeris

**An ephemeris for astrology software in pure JavaScript, built on NASA/JPL DE440.**
Apparent geocentric ecliptic longitudes and speeds of the Sun, Moon, Mercury to Pluto, Chiron and
the true lunar node, plus Placidus and whole-sign houses, for 1899–2101. No native code, no
data-path setup, and no Swiss Ephemeris code or data.

[![CI](https://github.com/Kululenko/zodiacally-ephemeris/actions/workflows/ci.yml/badge.svg)](https://github.com/Kululenko/zodiacally-ephemeris/actions/workflows/ci.yml)
[![Benchmark](https://img.shields.io/badge/benchmark-reproducible-2ea44f)](benchmark/README.md)
[![Data](https://img.shields.io/badge/data-JPL%20DE440-0b3d91)](SOURCES.md)

```js
const eph = require('zodiacally-ephemeris');

const { jdTT, jdUT1 } = eph.utcToJd({ year: 2000, month: 1, day: 1, hour: 12 }); // UTC
eph.positionTT(jdTT, 'sun');              // { longitude: 280.3689…, speed: 1.0194… } → 10°22′ Capricorn
eph.houses(jdUT1, 51.4769, -0.0005, 'P'); // Placidus for Greenwich: ascendant 24°16′ Aries, MC 9°36′ Capricorn
```

Install from GitHub (npm release: pending; see [Install](#install)):

```sh
npm install github:Kululenko/zodiacally-ephemeris
```

Used by [Zodiacally](https://www.zodiacally.com) since October 2026.

## Compared with the Swiss Ephemeris

| | Zodiacally Ephemeris 1.1.0 | Swiss Ephemeris 2.10.03 via `sweph` |
| --- | --- | --- |
| Data | JPL DE440 (its DE440s subset); Chiron from JPL orbit solution #171 | SE1 files dated 2026-05-26, built from JPL DE441, the long-span companion of DE440 |
| Full chart: 12 longitudes with speeds + Placidus | 5.5 µs | 77.0 µs |
| 12 longitudes with speeds at the same date, no houses | 1.5 µs | 69.1 µs |
| Placidus houses only | 3.6 µs | 9.5 µs |
| One longitude, new date on every call (the most favourable case for Zodiacally) | 0.12 µs | 17.3 µs |
| Cold start: loading the library and computing the first chart in a fresh process (Node.js start-up excluded) | 19.2 ms | 10.4 ms |
| Output per call | ecliptic longitude of date and its speed | longitude, latitude, distance and their speeds |
| Scope | Sun, Moon, Mercury–Pluto, Chiron, true node; Placidus and whole sign; 1899–2101 | many more bodies, points, frames and house systems; a date range of thousands of years |
| Runtime | Node.js ≥ 22.12 with file access (not in a browser); pure JavaScript, no dependencies, data bundled | native addon; data files downloaded separately |
| Licence | source-available, not open source: free for any use, including commercial, with the attribution line in every reading or result shown or delivered to others; white-label licence without attribution €690 one-time plus VAT where applicable (see [Licence](#licence)) | AGPL-3.0 or the Swiss Ephemeris Professional License (see [astro.com/swisseph](https://www.astro.com/swisseph/) for current terms) |

**Speed.** Measured on 8 November 2026 on an Apple M1 (macOS, Node v25.8.2) against Swiss
Ephemeris 2.10.03 through `sweph` 2.10.3-7: median of 7 alternating rounds, warm, single thread,
with the same 1,024 reproducible inputs (dates 1900–2026, latitudes ±65°) for both libraries.
A full chart takes 14.0× less time. An earlier run on an AMD Ryzen 5 5600G (Windows x64, Node
22.14.0, 4 November 2026) gave 23.5× for the same chart workload (earlier script, different
inputs from the same ranges; per-round ratios 19.8–25.7×). Once warm, Zodiacally Ephemeris is
therefore about 14–24× faster per chart in Node.js. It starts more slowly: loading the library
and computing the first chart in a fresh process (Node.js start-up excluded) takes 19.2 ms vs
10.4 ms, because it loads Node's crypto module and reads and verifies the SHA-256 of its 8 MB of
tables on first use. Counting start-up, it is ahead in total time only after about 124 charts in
one process. These measurements were made with version 1.1.0; version 1.1.1 changes only the
licence terms, the agent wrapper's licence and attribution texts and the command-line help text,
so its calculations and data are identical.

The comparison is not like for like. Zodiacally Ephemeris evaluates precomputed apparent
longitudes, while the Swiss Ephemeris computes positions, including latitude, distance and their
speeds, from its data at run time. It reuses per-date work within one date: inside a chart it
takes 5.760 µs per body (Zodiacally Ephemeris 0.126 µs), and 17.3 µs when every call has a new
date.
The Swiss Ephemeris is called through the `sweph` native binding here; a C program calling it
directly is not measured. The raw results and the generated report of the 8 November run are in
[benchmark/results/2026-11-08-darwin-arm64](benchmark/results/2026-11-08-darwin-arm64/README.md),
those of the Windows run in
[benchmark/results/2026-11-04-win32-x64](benchmark/results/2026-11-04-win32-x64/README.md). The
[benchmark](benchmark/README.md) reproduces the current workloads on your machine.

The Swiss Ephemeris is developed by Astrodienst AG, which has not reviewed or endorsed this
comparison.

### Data and precision

Zodiacally Ephemeris is built on DE440, the JPL ephemeris
[recommended by JPL for modern dates](https://ssd.jpl.nasa.gov/doc/de440_de441.html); the Swiss
Ephemeris' current files are built from the long-span companion DE441. Both come from the same
2021 JPL release and are fitted to the same observations; JPL gives their differences as under
1 m for the planetary orbits over 1550–2650 and under 2 m for the Moon over 1970–2020, which is
irrelevant for astrology.

Compared at the same instant, the two libraries differ by a few milliarcseconds (mas), thousands
of times smaller than the arcminute a chart displays. Unless marked otherwise, the figures below
come from the 8 November run of this repository's benchmark (20,000 epochs 1900–2100, seed
20261108). Figures marked "October" come from the October internal report,
[docs/accuracy.md](docs/accuracy.md): two runs that Zodiacally made on 3 October 2026, the second
with a different generator and seed, using its internal comparison harness. That harness is not
part of this repository, so these figures cannot be rerun from it. "Across runs" means the
largest value in any of these three runs. For the sign differences below, the case dates and
distinct-instant counts are from a November 2026 rerun of the same internal harness and seed,
see [docs/accuracy.md](docs/accuracy.md).

In the 8 November run the Sun differs by at most 3.0 mas, the Moon by at most 8.7 mas, and the
planets more than 1° from the Sun by p99 1.6–4.4 mas and at most 9.0 mas (across runs: Sun
3.4 mas, Moon 8.9 mas, planets 9.1 mas). The larger differences each have a known cause:

- **Planets within 1° of the Sun** (next to or behind the solar disc): up to 0.27″ in this run and
  up to 0.55″ in the October internal report (Jupiter, Uranus), because the two libraries model
  light deflection differently there.
- **True node:** p99 0.025″; at most 0.18″ in this run and 0.26″ across runs.
- **Chiron:** up to 0.93″, because the libraries use different orbit solutions. Zodiacally
  Ephemeris follows JPL's current orbit solution #171 (the one JPL Horizons serves); the Swiss
  Ephemeris asteroid file uses a different solution and differs from it by up to about 0.69″ at
  the 200 Horizons epochs (a smaller sample than the 20,000 above, and one that contains the
  Horizons frame term described below). Because the Chiron table was built from that same
  solution, this is a consistency check, not an independent accuracy result.
- **Houses before 2050** (Placidus, same UT1): at |latitude| ≤ 66°, 1900–2049, at most 0.027″,
  with p99 0.003″ (Ascendant), 0.001″ (MC) and 0.002″ (all cusps). Right next to the polar circle
  (|latitude| ≈ 66.5°) the Ascendant is singular and differs by up to 0.67″ (October internal
  report; 0.66″ for Placidus).
- **Houses from 2050** (same UT1): the MC differs by an almost constant 1.87″ (at most 2.08″),
  because the Swiss Ephemeris changes its sidereal-time model there. The Ascendant and cusps
  amplify that step: up to 30″ at latitudes up to 66° (largest above 60°; p99 4.8″ for the
  Ascendant, 3.6″ for the cusps) in the 8 November run, and up to about 20′ (1,188″) right next
  to the polar circle in the October internal report.

At the same instant, the zodiac sign differs in 0 of 240,000 body positions (12 bodies at 20,000
epochs), and the displayed whole arcminute (floor) in 61, mostly for Chiron. The sign count is
only a check for gross errors: a sign can differ there only for a body that is closer to a sign
boundary than the two libraries differ, which is a few mas for most positions and up to 0.93″
(Chiron) in the special cases listed above. The October internal report found the Ascendant in
a different sign at the same UT1 at one instant (2085, latitude 62°), caused by the 2050
sidereal-time step; its raw count is 2 because, as in the end-to-end count below, it counts the
Placidus and whole-sign runs separately.

End to end from a UTC reading (October internal report, 55,205 instants 1899–2101, each library
with its own time model), 4 body positions fell in a different sign: three from November 2049 on
(Mercury 2049-11-11, Moon 2054-03-27 and 2066-04-21), where the two libraries map a future UTC to
TT differently, and one Jupiter position on 2021-05-13 that lay within 0.001″ of the 330°
boundary. The Ascendant fell in a different sign at 41 instants, all from 2044 on (the raw report
counts 77 because it counts the Placidus and whole-sign runs separately).

Against NASA/JPL Horizons (200 epochs, observer quantity 31), both libraries differ from Horizons
by up to 0.245″ for the Sun to Pluto, but from each other by at most 0.0073″ at those epochs. That
shared term comes from the IAU 1976/1980 frame JPL uses for this Horizons quantity, while both
libraries use the IAU 2006/2000 models, so Horizons cannot rank the two. Horizons itself currently
computes from DE441 (shown in its output header), so this comparison does not favour the DE440
build either; the shared frame term dominates. The
[benchmark report](benchmark/results/2026-11-08-darwin-arm64/README.md) lists every body and case.

## Install

Node.js 22.12 or later, with file access: the engine reads its 8 MB of checksummed data tables
with `fs`, so it runs in Node.js, not in a browser. No native build, no network access and no
environment variables are needed at runtime.

npm release: pending. Until then, install from GitHub:

```sh
npm install github:Kululenko/zodiacally-ephemeris
```

The release history is in [CHANGELOG.md](CHANGELOG.md).

## Usage

```js
const eph = require('zodiacally-ephemeris');

// 1. Time: a UTC reading → Julian days in TT (positions) and UT1 (houses).
//    Leap seconds and Delta T are handled for you; 23:59:60 is accepted on leap-second days.
const { jdTT, jdUT1 } = eph.utcToJd({ year: 1990, month: 7, day: 14, hour: 6, minute: 30 });

// 2. Positions: apparent geocentric ecliptic longitude of date (tropical) in degrees, speed in deg/day.
for (const body of Object.values(eph.BODIES)) {
  const { longitude, speed } = eph.positionTT(jdTT, body);
  console.log(body, longitude.toFixed(4), speed < 0 ? 'retrograde' : '');
}

// 3. Houses: latitude north +, longitude east +; 'P' = Placidus, 'W' = whole sign.
let h = eph.houses(jdUT1, 48.1374, 11.5755, 'P');
if (h.error === 'PLACIDUS_POLAR') {
  // Placidus is undefined inside the polar circles: fall back explicitly.
  h = eph.houses(jdUT1, 48.1374, 11.5755, 'W');
}
console.log(h.ascendant, h.mc, h.cusps);
```

ES modules work too: `import eph, { positionTT } from 'zodiacally-ephemeris'`. TypeScript
declarations are included; with `"module": "commonjs"` and without `esModuleInterop`, use
`import * as eph from 'zodiacally-ephemeris'`, otherwise the default import works.

Bodies: `sun`, `moon`, `mercury`, `venus`, `mars`, `jupiter`, `saturn`, `uranus`, `neptune`,
`pluto`, `chiron`, `trueNode` (Mars to Pluto are system barycentres, as in DE440).

| Function | Returns |
| --- | --- |
| `utcToJd({ year, month, day, hour, minute, second })` | `{ jdTT, jdUT1 }` |
| `jdUT1ToUtc(jdUT1)` | `{ year, month, day, hour, minute, second }` |
| `deltaTSeconds(jdUT1)` | ΔT = TT − UT1 in seconds |
| `positionTT(jdTT, body)` / `position(jdUT1, body)` | `{ longitude, speed }` (identical for the same UTC reading) |
| `houses(jdUT1, latitude, longitudeEast, 'P' \| 'W')` | `{ cusps, ascendant, mc, armc, error }` |
| `info()` | version, data version, manifest SHA-256, exact coverage, sources |

Errors about dates, times, bodies and data carry a `code`: `EPHEMERIS_RANGE`,
`EPHEMERIS_TIME_OUT_OF_RANGE`, `EPHEMERIS_UNKNOWN_BODY`, `EPHEMERIS_DATA_INVALID`. In `houses()`,
a latitude that is `NaN`, `undefined` or outside −90…90, a non-finite longitude, or an
unsupported house system throws a plain `RangeError` without a `code`; the latitude is not
type-checked (`null` counts as 0), and longitudes outside ±180 are accepted (normalised). Dates
outside the tables are rejected, never extrapolated. Full reference: [docs/api.md](docs/api.md)
(see [Errors](docs/api.md#errors)).

### Command line and AI agents

After installing, run the command-line tool from your project. `--no-install` makes `npx` use the
installed copy instead of fetching a package from the registry.

```sh
npx --no-install zodiacally-ephemeris --info
echo '{"utc":"2027-01-01T12:00:00Z","latitude":52.52,"longitude":13.405,"houseSystem":"P"}' \
  | npx --no-install zodiacally-ephemeris --stdin

# the same without npx
node node_modules/zodiacally-ephemeris/cli.cjs --info
```

`--info` prints one JSON object of about 6 KB (including the fit report). To read a single
field, parse the complete output: read standard input to the end, because a pipe can deliver the
output in several chunks.

```sh
npx --no-install zodiacally-ephemeris --info \
  | node -p "JSON.parse(require('fs').readFileSync(0, 'utf8')).version"
```

`require('zodiacally-ephemeris/agent').calculate(input)` returns positions, houses (with an
explicit polar fallback), conventions, provenance and the attribution line in one JSON object.
The wrapper and the CLI take an ISO UTC timestamp with seconds and `Z`; they do not accept a leap
second (23:59:60), so use `utcToJd()` directly for that. See [AGENTS.md](AGENTS.md).

### Coming from the Swiss Ephemeris

| Swiss Ephemeris (`sweph`) | Zodiacally Ephemeris |
| --- | --- |
| `swe.utc_to_jd(...)` | `eph.utcToJd({ ... })` |
| `swe.calc_ut(jdUT, SE_SUN, SEFLG_SWIEPH \| SEFLG_SPEED).data[0]` / `[3]` | `eph.position(jdUT1, 'sun').longitude` / `.speed` |
| `swe.calc(jdET, ...)` | `eph.positionTT(jdTT, ...)` |
| `SE_TRUE_NODE`, `SE_CHIRON` | `'trueNode'`, `'chiron'` |
| `swe.houses(jdUT, lat, lon, 'P')` → `data.houses`, `data.points[0..2]` | `eph.houses(jdUT1, lat, lon, 'P')` → `cusps`, `ascendant`, `mc`, `armc` |
| `swe.set_ephe_path(...)` | not needed |

Not available: ecliptic latitude, distance, sidereal zodiacs, topocentric or heliocentric
positions, asteroids other than Chiron, the mean node and Lilith, fixed stars, house systems
other than Placidus and whole sign, dates outside 1899–2101, and use in a browser. More in
[docs/swiss-ephemeris-comparison.md](docs/swiss-ephemeris-comparison.md).

## How it works

The tables are Chebyshev polynomials fitted offline to apparent places computed with
[Skyfield](https://rhodesmill.org/skyfield/) from JPL DE440s: light time, light deflection by the
Sun, annual aberration, IAU 2006 precession and the full IAU 2000A nutation, referred to the true
ecliptic and equinox of date. Each record is checked against directly computed positions at dense
check points (24 per record, 401 for each record near the Sun). The build refines records
towards a fit limit of 0.5 mas; the largest error found at the check points is 0.5002 mas
(Mercury). That is a verified result at those points, not a proven mathematical bound.

Sidereal time follows IAU 2006 (IERS Conventions 2010). ΔT comes from Morrison et al. (2021) up
to 1950, USNO historic values from 1955.5 (with a smooth blend in between), IERS EOP 20 C04
observations from 1962, IERS Bulletin A predictions to 25 September 2027, and after that a smooth
transition towards the Stephenson–Morrison–Hohenkerk (2016) parabola. Leap seconds come from IERS
Bulletin C.

`build/tables/build.sh` downloads DE440s from JPL and regenerates the tables; their SHA-256
checksums are recorded in `data/manifest.json`, and before first use the engine verifies every
table against them. To check the manifest itself, compare `info().manifestSha256`
with the value published in this README:
`dc4569769900b60381b5bbcd74efdae06713d1a14bbe4e84371b319477219c35`. A rebuild on 8 November
2026 reproduced all 24 files in `data/` (23 table files and the manifest) and the reference
fixture byte-identically on macOS/arm64. On Linux x86-64 (GitHub Actions) the rebuild is not
bit-identical, because floating-point results differ in the last bits between platforms, but it
is numerically equivalent: with an identical record layout, no evaluated value can differ by more
than 0.00000002″ (a strict bound from the Chebyshev coefficients, `build/compare-tables.mjs`), and
the directly computed reference values differ by at most 0.00002″. A monthly CI job repeats that
check. Details:
[build/README.md](build/README.md), [docs/conventions.md](docs/conventions.md) and
[docs/accuracy.md](docs/accuracy.md).

The Swiss Ephemeris served as an external reference, through its public API, for measuring
differences. No Swiss Ephemeris source code was read or used, no Swiss Ephemeris data files are
shipped, and no coefficient or continuous parameter was fitted to its output; the tables come only
from JPL data via Skyfield. Three discrete modelling choices between published conventions were,
however, selected by comparing residuals against Swiss Ephemeris output:

1. light deflection by the Sun only (Skyfield's default adds Jupiter and Saturn; JPL Horizons
   also uses Sun-only deflection, "Rel. light bend: Sun" in its headers);
2. the n=3 polytrope enclosed-mass model for rays passing behind the solar disc;
3. the light-time-retarded osculating node as the definition of the true node.

For these conventions the agreement with the Swiss Ephemeris is therefore partly by construction,
which is why the comparison with JPL Horizons is reported as well. The alternatives and their
residuals are documented in [docs/conventions.md](docs/conventions.md), and the study scripts are
published in [benchmark/studies/](benchmark/studies/).

## Coverage and limits

- Dates from 1899-01-01 00:00:04 UTC to 2101-01-13 23:58:50 UTC (exact bounds in
  `info().coverage`). The nominal first and last day are therefore not fully covered: midnight
  on 1 January 1899, for example, throws `EPHEMERIS_RANGE`.
- Future dates: positions for a future UTC reading depend only on TT (the last TAI−UTC offset is
  kept); houses depend on the predicted rotation of the Earth (ΔT). Every ephemeris has to
  predict ΔT, and the predictions of different libraries diverge the further ahead the date is.
- Inside the polar circles Placidus is undefined; the engine says so (`PLACIDUS_POLAR`) instead
  of silently switching systems.
- Time data (leap seconds, ΔT) need a yearly refresh; see [docs/maintenance.md](docs/maintenance.md).

## Licence

Zodiacally Ephemeris is **source-available and free to use, also commercially, with
attribution**. It is not under an OSI open-source licence: readings and results shown or
delivered to others must carry the attribution line, and the engine may not be published or
distributed as a standalone library. [LICENSE.txt](LICENSE.txt) holds the binding terms
(version 2, 9 November 2026); in short:

- **Free for any use, including commercial**: businesses, client work, paid readings, public
  services, apps, agents and APIs. The permission is worldwide and non-exclusive. No
  registration, separate agreement or licence fee is needed; by using, copying or distributing
  the engine you accept the terms.
- **Two conditions: the attribution and the distribution rules.** If you do not meet them, your
  rights end automatically; they are restored if you remedy the breach within 30 days of
  becoming aware of it or of being notified by Zodiacally. Apart from that, the permission is
  irrevocable for every copy you have received.
- **The attribution line** appears visibly in every reading or result produced with the engine that
  is shown or delivered to another person, whether or not that person pays, in the language of that
  reading:
  *"Astronomical calculations: Zodiacally Ephemeris, based on JPL DE440 (NASA/JPL).
  https://www.zodiacally.com/ephemeris/"*
  (German: *"Astronomische Berechnung: Zodiacally Ephemeris, auf Basis von JPL DE440
  (NASA/JPL). https://www.zodiacally.com/ephemeris/"*). A readable line at the end of the reading is
  enough; link "Zodiacally Ephemeris" where links are supported, and keep the line in exported PDFs,
  reports, emails and chat answers. In short formats where a full line is impractical, such as push
  notifications, widgets, social media posts, calendar entries or voice output, a clearly labelled
  credit reachable from the output (for example a linked caption or a credits page linked from it)
  is enough. A hidden metadata field, internal log, system prompt or general legal notice alone is
  not. If you use agents or other tools, make sure the line reaches the final output. If you provide
  results to others through an API, include the line in the response and require the recipients to
  display it. Results you use only yourself need no attribution.
- **Distribution:** you may distribute the engine as part of your own application or service,
  together with LICENSE.txt and the source and data notices. Recipients receive it under these
  terms, including the attribution requirement, which you cannot waive for them. The engine or
  an adaptation of it may not be published, distributed, sold, rented or sublicensed as a
  standalone library, package, port or ephemeris data product, whether free of charge or for a
  fee. Forks of this repository for proposing changes are permitted.
- **White-label licence without attribution: €690 one-time, plus VAT where applicable**, granted
  individually on request ([support@zodiacally.com](mailto:support@zodiacally.com)). It covers
  the licensee (one person or legal entity) with all of its own products and services and the
  client projects it builds, for the version current at purchase and every release published
  within 12 months after the purchase, and it is perpetual for those releases. All other terms
  still apply. It does not promise hosting, support, maintenance or future releases; their
  provision, if any, is agreed separately. Downloading the package or entering a licence tier in
  software grants no white-label licence.
- **Warranty and liability:** free use is provided "as is", without warranty to the extent permitted
  by law, and Zodiacally is liable only for intent and gross negligence. For a white-label licence
  the statutory rules apply unless the individual agreement provides otherwise. Mandatory statutory
  liability remains unaffected in both cases.

Version 2 applies to every copy of the engine, including copies obtained under version 1 of
4 November 2026. Holders of a commercial licence granted under version 1 may rely on that
licence or on version 2, whichever they choose (see [CHANGELOG.md](CHANGELOG.md)).

[LICENSE.txt](LICENSE.txt) covers everything in this repository except `benchmark/` (MIT, see
[benchmark/LICENSE](benchmark/LICENSE)) and the third-party data and tools listed in
[SOURCES.md](SOURCES.md). `sweph` (AGPL-3.0/LGPL-3.0) and the Swiss Ephemeris data files are
installed or downloaded separately when you run the benchmark and are never distributed with this
package. NASA/JPL data are public domain; see [SOURCES.md](SOURCES.md). No NASA or JPL
endorsement is implied.

## Verify, cite, contribute

- **Verify** our numbers on your machine: [docs/verify.md](docs/verify.md). Results that differ
  from ours are especially welcome as a
  [verification report](https://github.com/Kululenko/zodiacally-ephemeris/issues/new?template=verification-report.yml).
- **Cite**: see [CITATION.cff](CITATION.cff) (GitHub shows "Cite this repository").
- **Technical note**: [docs/technical-note.md](docs/technical-note.md) describes data,
  reduction, tables and validation.
- **Contribute**: see [CONTRIBUTING.md](CONTRIBUTING.md). Bugs and questions:
  [issues](https://github.com/Kululenko/zodiacally-ephemeris/issues).
