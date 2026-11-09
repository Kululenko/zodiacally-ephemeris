# Zodiacally Ephemeris compared with the Swiss Ephemeris

The [Swiss Ephemeris](https://www.astro.com/swisseph/) has been used by astrology software for
decades and covers far more than Zodiacally Ephemeris does. This page sets out what each library
offers, what we measured, and where the measurements stop, so you can decide which one fits your
project. The Swiss Ephemeris is developed by Astrodienst AG, which has not reviewed or endorsed
this comparison.

**Short version.** If your application runs in Node.js and needs only the usual chart set (Sun
to Pluto, Chiron, the true node, Placidus or whole-sign houses, 1899–2101), Zodiacally Ephemeris
agrees with the Swiss Ephemeris at the same instant (same TT) to a few milliarcseconds for the
positions of the Sun, the Moon and planets away from the Sun. The largest same-instant
differences in positions we have observed are 0.26″ for the true node, 0.55″ for a planet right
next to the Sun and 0.93″ for Chiron. Houses at the same UT1 agree to 0.027″ before 2050 at
latitudes up to 66° (up to 0.67″ right next to the polar circle). From 2050 the MC differs by an
almost constant 1.87″, because the Swiss Ephemeris changes its sidereal-time model there; the
Ascendant and cusps amplify that step to up to 30″ at latitudes up to 66° and up to about 20′
right next to the polar circle (see [Measured agreement](#measured-agreement)). Starting from a
UTC reading, the two libraries' different time models add to this. The MC differs by up to
about 1″ for 1972–2022 and up to about 8″ for 2023–2026. For future dates the Moon differs by up
to 3.4″ by 2049 and 15.6″ by 2100, and the Ascendant (at latitudes up to 66°) by up to about 7′
by 2049 and more than 1° after 2050 (see
[What to expect after switching](#what-to-expect-after-switching)).

In our warm, single-thread Node.js measurements on two machines Zodiacally Ephemeris computed a
full chart 14–24 times faster; it evaluates precomputed longitudes, while the Swiss Ephemeris
computes positions with latitude and distance at run time. Zodiacally Ephemeris starts more
slowly: loading the library and computing the first chart in a fresh process (Node.js start-up
excluded) takes 19.2 ms against 10.4 ms, so it is ahead in total time only after about 124
charts in one process. It is pure JavaScript with the data bundled and checksum-verified, built
on JPL DE440. If you need anything beyond that list (sidereal zodiacs, asteroids, fixed stars,
other house systems, latitude and distance, dates outside 1899–2101, eclipses, rise and set
times, or a runtime other than Node.js), use the Swiss Ephemeris. The two licences differ as
well; see [Licensing](#licensing).

## Features

| | Zodiacally Ephemeris 1.1.1 | Swiss Ephemeris 2.10 |
| --- | --- | --- |
| Planetary data | JPL DE440, via its subset DE440s | default SE1 files built from JPL DE441; can also read JPL files such as DE440 directly |
| Chiron | JPL orbit solution JPL#171, the one JPL Horizons serves | asteroid file `seas_18.se1`, based on a different orbit solution |
| Bodies | Sun, Moon, Mercury–Pluto (Mars–Pluto as system barycentres), Chiron, true node | all planets, nodes, apsides, Lilith, hundreds of thousands of asteroids, fixed stars, hypothetical bodies |
| Output | apparent geocentric ecliptic longitude of date and its speed; no latitude, no distance | longitude, latitude, distance and their speeds; equatorial, heliocentric, barycentric, topocentric, J2000 and sidereal (many ayanamsas) |
| Houses | Placidus, whole sign | more than 20 systems |
| Dates | 1899-01-01 00:00:04 UTC to 2101-01-13 23:58:50 UTC (exact bounds in `info().coverage`) | 13,201 BC to AD 17,191, one data file per 600 years (the `_18` files used here cover 1800–2400) |
| Other functions | UTC ↔ TT/UT1 with leap seconds, ΔT | eclipses, rise and set, heliacal events, crossings and more |
| Languages | JavaScript for Node.js ≥ 22.12 (CommonJS and ES modules, TypeScript types); reads its data with `fs`, so not in a browser | C library with bindings for many languages |
| Deployment | no native code; 8 MB of data inside the package, SHA-256 verified on first use | native code (in Node.js through an addon such as `sweph`); the SE1 files must be deployed and their path set, otherwise it falls back to its built-in, less precise Moshier ephemeris |
| Licence | source-available, not open source: free for any use, including commercial, with the attribution line in every reading or result shown or delivered to others; white-label without attribution €690 one-time plus VAT where applicable; see [Licensing](#licensing) | AGPL-3.0 or the Swiss Ephemeris Professional License |

**About the data.** Zodiacally Ephemeris is built on DE440, the JPL ephemeris recommended for
modern dates; the Swiss Ephemeris' current files are built from the long-span companion DE441.
The SE1 files used in our benchmark (official repository, revision `3fd0f956`, dated 2026-05-26)
say so in their header. DE440 and DE441 come from the same JPL release (Park et al. 2021, AJ
161:105) and are fitted to the same observations; DE441 omits the lunar core–mantle damping so
that it can be integrated over a much longer span (−13,200 to +17,191). According to
[JPL](https://ssd.jpl.nasa.gov/doc/de440_de441.html) the planetary orbits of the two differ by
less than 1 m over 1550–2650 and the Moon by less than 2 m over 1970–2020. A difference of a few
metres at most is irrelevant for astrology.

## Measured speed

Node.js APIs, warm, single thread, median of 7 alternating rounds, over 1,024 reproducible
inputs (seed 20261104: dates 1900–2026, latitudes ±65°, longitudes ±180°) that are the same for
both libraries. Apple M1, macOS, Node v25.8.2, `sweph` 2.10.3-7 (Swiss Ephemeris 2.10.03),
8 November 2026 ([report](../benchmark/results/2026-11-08-darwin-arm64/README.md),
[raw data](../benchmark/results/2026-11-08-darwin-arm64/speed.json)):

| workload | Zodiacally | Swiss (`sweph`) | ratio |
| --- | ---: | ---: | --- |
| full chart: 12 longitudes with speeds + Placidus houses | 5.497 µs | 77.048 µs | 14.0× faster |
| 12 longitudes with speeds at the same date, no houses | 1.512 µs | 69.119 µs | 45.7× faster |
| one longitude with speed, a new date on every call | 0.121 µs | 17.318 µs | 143× faster (most favourable case for Zodiacally) |
| Placidus houses only | 3.568 µs | 9.507 µs | 2.7× faster |
| cold start: loading the library and computing the first chart in a fresh process, Node.js start-up excluded (median of 15) | 19.20 ms | 10.39 ms | Swiss 1.8× faster |

- **The full chart is the representative row.** Inside a chart each body costs 0.126 µs
  against 5.760 µs. The single-call row gives the Swiss Ephemeris a new date every time, so it
  cannot reuse any per-date work; treat that figure as the most favourable case for
  Zodiacally Ephemeris, not as a typical one.
- **Cold start.** The Swiss Ephemeris starts faster, because Zodiacally Ephemeris loads Node's
  crypto module and reads and verifies the SHA-256 of its 8 MB of tables on first use. Counting
  start-up, Zodiacally Ephemeris is ahead in total time after about 124 charts in one process.
  For a short-lived process that computes one chart, the Swiss Ephemeris is faster.
- **Second machine.** On an AMD Ryzen 5 5600G under Windows x64 (Node 22.14.0) the full chart
  took 7.540 µs against 177.526 µs. That measurement was made on 4 November 2026 with an earlier
  single-workload script: same chart workload, rounds and seed number, but a different random
  generator, so different inputs from the same ranges; 23.5× is the ratio of the two medians
  (per-round ratios 19.8–25.7×, median 24.1×)
  ([report](../benchmark/results/2026-11-04-win32-x64/README.md),
  [raw data](../benchmark/results/2026-11-04-win32-x64/speed-release.json)).
- **The work is not the same.** Zodiacally Ephemeris evaluates precomputed apparent longitudes
  (one polynomial per body). The Swiss Ephemeris computes positions from its data at run time
  and returns longitude, latitude, distance and their speeds; as the timings show, it reuses
  per-date work when several bodies share a date (5.760 µs per body inside a chart against
  17.318 µs with a new date). Its calls also go through the `sweph` native binding; a C program
  calling the Swiss Ephemeris directly was not measured.

## Measured agreement

At the same instant (same TT for positions, same UT1 for houses), 20,000 TT epochs 1900–2100
(seed 20261108), against the Swiss Ephemeris with its default SE1 files, run on 8 November 2026
([report](../benchmark/results/2026-11-08-darwin-arm64/README.md),
[raw data](../benchmark/results/2026-11-08-darwin-arm64/agreement.json)). Figures marked
"October" come from the October internal report reproduced in [accuracy.md](accuracy.md): two
runs that Zodiacally made on 3 October 2026 with its internal comparison harness, the first over
24,523 instants and a second internal run (different generator and seed) over 55,205 UTC and
28,602 TT instants. That harness is not part of this repository, so those figures cannot be
rerun from it. 1 mas = 0.001″; the arcminute that a chart displays is 60,000 mas.

| quantity | difference |
| --- | --- |
| Sun | max 3.0 mas (3.4 mas in October) |
| Moon | max 8.7 mas (8.9 mas in October) |
| Mercury–Pluto, more than 1° from the Sun | p99 1.6–4.4 mas, max 9.0 mas (9.1 mas in October) |
| Mercury–Pluto, within 1° of the Sun (next to or behind the solar disc) | up to 0.27″ (0.55″ in October: Jupiter, Uranus) |
| True node | p99 0.025″, max 0.18″ (0.26″ in October) |
| Chiron | up to 0.93″ |
| Placidus houses, \|latitude\| ≤ 66°, 1900–2049 | max 0.027″; p99 0.003″ (Ascendant), 0.001″ (MC), 0.002″ (all cusps) |
| Placidus houses, \|latitude\| ≤ 66°, 2050–2099 | MC: almost constant 1.87″ (max 2.08″); Ascendant: p99 4.8″, up to 30″ (35.6″ in the first October run); all cusps: p99 3.6″, up to 30″ |
| Ascendant right next to the polar circle (\|latitude\| ≈ 66.5°) | before 2050: up to 0.67″ (October; 0.66″ for Placidus); from 2050: up to about 20′ (1,188″, October) |

Where the larger differences come from:

- **Near the Sun** the two libraries model the Sun's light deflection differently for a planet
  next to or behind the solar disc, where it cannot be seen anyway.
- **True node**: the cause is not fully established. The referee run
  ([below](#same-jpl-file-different-code)) locates it for the 8 November samples: with both
  libraries computing from DE440, the true nodes differ by at most 7.4 mas (p99 5.7 mas), while
  the Swiss Ephemeris on its SE1 files and the Swiss Ephemeris on DE440 differ by up to 0.18″
  (p99 24 mas). Almost all of the difference therefore appears when the Swiss Ephemeris switches
  from DE440 to its SE1 files, not between the two codes; whether it lies in DE441 itself or in
  the way the SE1 files represent it is not established. The choice between node definitions
  does not explain it either: the largest residual is about 0.18″ for both leading definitions
  in the [true-node study](../benchmark/studies/README.md#study-3-definition-of-the-true-lunar-node).
  The October maximum of 0.26″ was measured without a referee.
- **Chiron**: the two libraries use different orbit solutions.
- **Near the polar circles** (|latitude| ≈ 66.5°) the Ascendant is singular and amplifies tiny
  differences: up to 0.67″ before 2050 (October internal report; 0.66″ for Placidus).
- **Houses from 2050**: the MC differs by an almost constant 1.87″, because the Swiss Ephemeris
  changes its sidereal-time model there (seen from outside as a step in ARMC); Zodiacally
  Ephemeris keeps IAU 2006 sidereal time throughout. The Ascendant and cusps amplify that step:
  up to 30″ at latitudes up to 66° (largest above 60°) in the 8 November run, and up to about
  20′ (1,188″) right next to the polar circle in the October internal report.

At the same instant and outside these cases the differences are a few mas, thousands of times
smaller than the displayed arcminute.

**Signs and displayed minutes.** At the same instant the zodiac sign differed in 0 of 240,000
positions. That is only a check for gross errors: at the same instant a sign can differ only
when a body is closer to a sign boundary than the difference itself, which is a few mas for
most bodies, a few tenths of an arcsecond for the true node and for planets right next to the
Sun, and up to 0.93″ for Chiron. The displayed whole arcminute (rounded down) differed in 61
of the 240,000 positions, 58 of them for Chiron. End to end from a UTC reading (October internal
report, 55,205 instants 1899–2101, each library with its own time model), 4 body positions fell
in a different sign: three from November 2049 on (Mercury 2049-11-11, Moon 2054-03-27 and
2066-04-21), where the two libraries map a future UTC to TT differently, and one Jupiter position
on 2021-05-13 that lay within 0.001″ of the 330° boundary. The Ascendant fell in a different sign
at 41 instants, all from 2044 on (the raw report counts 77 because it counts the Placidus and
whole-sign runs separately); dates and distinct-instant counts are from a November 2026 rerun
of the same internal harness and seed. The rerun and the end-to-end tables are documented in
[accuracy.md](accuracy.md); how often the displayed minute differs end to end is estimated under
[What to expect after switching](#what-to-expect-after-switching).

**Partly by construction.** No Swiss Ephemeris source code was read, no coefficient or
continuous parameter was fitted to its output, and the tables are computed only from JPL data.
But three discrete choices between published conventions were made by comparing residuals
against Swiss Ephemeris output: light deflection by the Sun only (JPL Horizons also uses
Sun-only deflection), the n = 3 polytrope enclosed-mass model for rays behind the solar disc,
and the light-time-retarded osculating node as the true node. For these conventions the
agreement above is partly by construction, which is why the comparison with JPL Horizons below
is reported as well. The alternatives and their residuals are in [conventions.md](conventions.md),
the study scripts in [`benchmark/studies/`](../benchmark/studies/).

### Same JPL file, different code

The Swiss Ephemeris can read JPL's DE440 file directly. Running it that way separates code from
data (p99, planets more than 1° from the Sun):

- Zodiacally Ephemeris − Swiss Ephemeris on DE440, the difference between the two codes:
  1.5 mas for Sun to Pluto, 2.7 mas for the Moon, 5.7 mas for the true node.
- Swiss Ephemeris on its SE1 files − Swiss Ephemeris on DE440, the difference between the data
  sets: Sun 1.5, Moon 5.6, Mercury 1.8, Venus 4.3, Mars 2.6, Jupiter to Pluto 0.4–0.9, true node
  24 mas.

The second list combines the DE441–DE440 difference with the way the SE1 files represent DE441,
so it is not a pure DE440/DE441 difference; for the planets it is far larger than the sub-metre
orbit difference that JPL gives. The comparison shows that both libraries implement the apparent
place consistently at the milliarcsecond level. It does not rank them: Zodiacally Ephemeris is
built from DE440, so it is naturally closer to a DE440 computation than files built from DE441
are. If you want the Swiss Ephemeris itself to compute from DE440, the ephemeris JPL recommends
for modern dates, point it at the DE440 file (`set_jpl_file` with `SEFLG_JPLEPH`), as
`node agreement.mjs --jpl` in the benchmark does.

### NASA/JPL Horizons

At 200 epochs 1900–2100 (observer quantity 31, apparent ecliptic longitude of date), both
libraries differ from Horizons by up to 0.245″ (mean 0.08″) for Sun to Pluto, and from each
other by at most 0.0073″ at the same epochs. The shared term comes from the frame: JPL documents
quantity 31 in the IAU 1976/1980 precession-nutation frame, while both libraries use IAU
2006/2000 models. Horizons therefore cannot rank the two libraries either. Horizons itself
currently computes from DE441 (shown in its output header), so this comparison does not favour
the DE440 build either; the shared frame term dominates.

Chiron follows JPL's current orbit solution #171 (the one JPL Horizons serves); the Swiss
Ephemeris asteroid file uses a different solution and differs from it by up to about 0.69″.
Because the Chiron table was built from that same solution, its 0.242″ from Horizons is only the
shared frame term; this is a consistency check, not an independent accuracy result.

## Migrating from `sweph`

Install from GitHub (the npm release is pending):
`npm install github:Kululenko/zodiacally-ephemeris`.

```js
// Before (sweph)
const swe = require('sweph');
swe.set_ephe_path('./ephe');
const { data: [jdET, jdUT] } = swe.utc_to_jd(1990, 7, 14, 6, 30, 0, swe.constants.SE_GREG_CAL);
const sun = swe.calc_ut(jdUT, swe.constants.SE_SUN, swe.constants.SEFLG_SWIEPH | swe.constants.SEFLG_SPEED);
const h = swe.houses(jdUT, 48.1374, 11.5755, 'P');
console.log(sun.data[0], sun.data[3], h.data.houses, h.data.points[0], h.data.points[1]);

// After (Zodiacally Ephemeris)
const eph = require('zodiacally-ephemeris');
const { jdTT, jdUT1 } = eph.utcToJd({ year: 1990, month: 7, day: 14, hour: 6, minute: 30 });
const sun2 = eph.positionTT(jdTT, 'sun');
const h2 = eph.houses(jdUT1, 48.1374, 11.5755, 'P');
console.log(sun2.longitude, sun2.speed, h2.cusps, h2.ascendant, h2.mc);
```

Both halves were last run on 9 November 2026 with `sweph` 2.10.3-7 and the SE1 files from the
benchmark. For this chart (Munich, 14 July 1990, 06:30 UTC) the Sun differs by 0.0004″, the
Ascendant by 0.19″ and the MC by 0.26″. The house differences come from UT1: for this UTC reading
the two libraries' UT1 differs by 17 ms (see below). Given the same UT1, the two libraries'
Ascendant and MC for this chart agree to 0.0004″.

| `sweph` | `zodiacally-ephemeris` |
| --- | --- |
| `utc_to_jd(y, m, d, h, min, s, SE_GREG_CAL)` → `.data[0]` (ET = TT), `.data[1]` (UT1) | `utcToJd({ year, month, day, hour, minute, second })` → `.jdTT`, `.jdUT1` |
| `SE_SUN … SE_PLUTO`, `SE_CHIRON`, `SE_TRUE_NODE` | `'sun' … 'pluto'`, `'chiron'`, `'trueNode'` |
| `calc_ut(jdUT, body, SEFLG_SWIEPH \| SEFLG_SPEED)` | `position(jdUT1, body)` |
| `calc(jdET, …)` | `positionTT(jdTT, …)` |
| `.data[0]`, `.data[3]` | `.longitude`, `.speed` |
| `.data[1]`, `.data[2]` (latitude, distance) | not available |
| `houses(jdUT, lat, lon, 'P' \| 'W')` | `houses(jdUT1, lat, lon, 'P' \| 'W')` |
| `.data.houses[0..11]` | `.cusps[0..11]` |
| `.data.points[0]`, `[1]`, `[2]` | `.ascendant`, `.mc`, `.armc` |
| `deltat(jdUT)` (days) | `deltaTSeconds(jdUT1)` (seconds) |
| error in `.error` and a negative `.flag` | thrown error: with `.code` for date range, time, body and data errors; a plain `RangeError` without code for a latitude outside −90…90 or NaN, a non-finite longitude or an unsupported house system ([API](api.md#errors)) |
| Placidus inside the polar circles: `houses` returns flag −1 and Porphyry cusps | `cusps: null`, `error: 'PLACIDUS_POLAR'`; `ascendant`, `mc` and `armc` are still returned |

### What to expect after switching

Your application starts from a UTC reading, so it sees the end-to-end differences: the
same-instant differences above plus the effect of the two libraries' different time models.
The figures below come from the October internal report in [accuracy.md](accuracy.md), whose
runs converted every UTC reading with each library's own function (`utcToJd` and `utc_to_jd`);
they are maxima unless marked as means.

- **Positions.** From 1972 to 2026 both libraries map a UTC reading to the same TT (to within
  0.04 ms), so positions differ only as much as at the same instant. Before 1972 both read the
  civil time as UT1 but add different ΔT values to reach TT (up to 0.13 s apart); that moves the
  Moon by up to 0.08″. For future dates the two map UTC to TT differently: Zodiacally Ephemeris
  keeps TAI − UTC at its current 37 s, because no further leap second has been announced, while
  the Swiss Ephemeris maps a future UTC reading to TT through its own ΔT prediction. The two TTs
  then differ by up to about 5.4 s by 2049 and 24.5 s by 2100, so positions differ end to end:
  the Moon, the fastest body, by up to 3.4″ by 2049 and 15.6″ by 2100, the other bodies by up to
  about 2″ (Mercury) by 2100.
- **Houses** depend on UT1, which the two libraries derive differently. Before 1972 both treat
  the reading as UT1, so the houses agree as closely as at the same instant. From 1972
  Zodiacally Ephemeris takes UT1 from the IERS observations of the Earth's rotation (EOP 20 C04),
  then from IERS Bulletin A predictions (to September 2027) and a long-term ΔT model; the Swiss
  Ephemeris uses its own ΔT. The two UT1 values differ by up to 0.07 s for 1972–2022 (MC up to
  about 1″) and by up to 0.5 s for 2023–2026 (MC up to about 8″). For future dates both
  libraries have to predict the Earth's rotation, and the predictions drift apart; one second of
  UT1 moves the MC by about 15″. Maxima in the first October run (its random set of UTC
  instants, Placidus, |latitude| ≤ 66°):

  | UTC reading | UT1 difference | MC | Ascendant |
  | --- | ---: | ---: | ---: |
  | 1899–1971 | 0 | 0.002″ | 0.011″ |
  | 1972–2022 | up to 0.07 s | 1.1″ | 5.2″ |
  | 2023–2026 | up to 0.5 s | 7.9″ | 19″ |
  | 2027–2049 | up to 5.2 s | 84″ (1.4′) | 422″ (7.0′) |
  | 2050–2100 | up to 35.5 s | 580″ (9.7′) | 4,131″ (1.15°) |

  Right next to the polar circles, where the Ascendant is singular, it differs by much more: in
  the second October run, at about 66.5° latitude, by up to 28″ in 1972–2022, 12.6′ in 2027–2049
  and 43° in 2077.
- **Signs** almost always match, but not always: end to end, the October internal report found
  4 body positions and 41 Ascendant instants in a different sign (details under
  [Measured agreement](#measured-agreement)).
- **Displayed minutes** were not counted end to end. A difference of d arcseconds (below 60″)
  changes a value's displayed, rounded-down minute in about d/60 of all cases, so the mean house
  differences of the first October run give an estimate per house value, not a count. The MC
  and the Ascendant each differ on average by about 0.2″ in 1972–2022 and 2.6″ in 2023–2026, so
  the displayed minute of each differs in under 1 % and about 4 % of cases. They differ on
  average by about 32″ in 2027–2049, so the minute differs in roughly half of all cases, and by
  about 4.5′ in 2050–2100, so it almost always differs. These shares are per house value; a
  chart has six independent house values (Ascendant, MC and cusps 2, 3, 11 and 12; the other
  cusps lie opposite them), so the share of charts with at least one differing value is higher.
  For the Moon the share is at most about 6 % by 2049 (differences up to 3.4″) and at most about
  a quarter by 2100 (up to 15.6″).
- **To compare the two libraries without their time models**, pass the same TT to `positionTT`
  and the same UT1 to `houses`, as the benchmark does.

## Licensing

Zodiacally Ephemeris is source-available and free to use, also commercially, with attribution.
Businesses, client work, paid readings, public services, apps and agents may use it free of
charge. The conditions are the attribution line given in [LICENSE.txt](../LICENSE.txt), in every
reading or result shown or delivered to another person (in short formats such as push
notifications or voice output, a clearly labelled credit reachable from the output is enough;
results passed on through an API must carry the line too), and the distribution rules: the
engine may be distributed as part of the distributor's own application or service, but not
published or distributed as a standalone library, package, port or ephemeris data product. Use
without the attribution needs a white-label licence: €690 one-time plus VAT where applicable,
granted individually on request (support@zodiacally.com), for the licensee's own products and
client projects and for the version current at purchase and every release published within
12 months after it. It is not an OSI open-source licence, because the attribution is required
and standalone distribution is restricted. The binding terms are in
[LICENSE.txt](../LICENSE.txt).

The Swiss Ephemeris is available under AGPL-3.0 or the Swiss Ephemeris Professional License; see
[astro.com/swisseph](https://www.astro.com/swisseph/) for the current terms.

The benchmark scripts in [`benchmark/`](../benchmark/README.md) are MIT-licensed. `sweph`
(AGPL-3.0/LGPL-3.0) and the Swiss Ephemeris data files are installed or downloaded separately
into that directory and are never distributed with the `zodiacally-ephemeris` package.

Nothing on this page is legal advice; read both licences for your own case.
