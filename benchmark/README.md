# Reproducible benchmark: Zodiacally Ephemeris, the Swiss Ephemeris and NASA/JPL Horizons

With the scripts in this directory anyone can rerun the measurements of the 8 November 2026 run
on their own machine in a few minutes. They compare Zodiacally Ephemeris 1.1.0 with

1. **the Swiss Ephemeris** 2.10.03 through the `sweph` 2.10.3-7 Node.js binding, using its default
   SE1 data files (`sepl_18`, `semo_18`, `seas_18`), downloaded from the official repository at
   revision 3fd0f956 and verified by SHA-256;
2. **the Swiss Ephemeris reading JPL's DE440 file directly** (optional, `--jpl`), a referee that
   separates differences in the code from differences in the data;
3. **NASA/JPL Horizons**, JPL's own online ephemeris service, which reports DE441 and, for Chiron,
   orbit solution JPL#171 as its sources.

The Swiss Ephemeris is developed by Astrodienst AG, which has not reviewed or endorsed this
comparison.

Results: [`results/2026-11-08-darwin-arm64/README.md`](results/2026-11-08-darwin-arm64/README.md)
(Apple M1, all measurements) and [`results/2026-11-04-win32-x64/README.md`](results/2026-11-04-win32-x64/README.md)
(AMD Ryzen 5 5600G, chart speed only, made with an earlier script on different inputs from the
same ranges; see the speed table below). The JSON files next to each report hold every raw value.
The 8 November report was regenerated on 9 November by `summary.mjs` from the same JSON files
with corrected wording (the description of the SE1 files, the cold-start label and cause, the
note on the sign check, the reading of the referee's data difference and a note that Horizons
computes from DE441) and with the method limitations in their current wording (the Swiss
Ephemeris reuses per-date work when several bodies share a date; see
[Method and fairness](#method-and-fairness)); no number changed. The `limitations` strings
inside `speed.json` keep the wording recorded on 8 November.

**Data basis.** Zodiacally Ephemeris is built on DE440 (through its subset DE440s), the JPL
ephemeris recommended for modern dates. The Swiss Ephemeris' current SE1 files state in their
header that they are "based on JPL Ephemeris DE441", the long-span companion from the same JPL
release (Park et al. 2021, AJ 161:105), fitted to the same data. According to
[JPL](https://ssd.jpl.nasa.gov/doc/de440_de441.html), the planetary orbits of the two differ by
less than 1 m over 1550–2650 and the Moon's orbit by less than 2 m over 1970–2020; for astrology
this is irrelevant. The data difference measured in the referee row below, Swiss(SE1) −
Swiss(DE440), is not a pure DE440/DE441 difference: it also contains the compression of DE441
into the SE1 files, and for the planets it is far larger than JPL's metre-level figures.

## What the measurements show

In short: a warm chart computation in Node.js is 14–24× faster on the two machines measured;
loading the library and computing the first chart in a fresh process (Node.js start-up
excluded) is slower (19.2 ms vs. 10.4 ms); and in the 8 November run the Sun, Moon and
planets agree with the Swiss Ephemeris at the same instant to within 9 mas (0.009″), except for
planets within 1° of the Sun. Chiron, the true node and the houses differ more and have their
own rows. Each row below gives the caveat that belongs to it.

**Speed** (Apple M1, macOS, Node v25.8.2, 8 November 2026 unless stated; Node.js API, warm,
single thread, the same 1,024 different inputs for both libraries, median of 7 alternating
rounds):

| measurement | result | read it with | script |
| --- | --- | --- | --- |
| **Full chart**: 12 longitudes with speeds + Placidus houses | 5.497 µs vs. 77.048 µs: **14.0×** on Apple M1. 7.540 µs vs. 177.526 µs: **23.5×** on AMD Ryzen 5 5600G (Windows x64, Node 22.14.0), made on 4 November 2026 with an earlier single-workload script: same chart workload, rounds and seed number, but a different random generator, so different inputs from the same ranges; 23.5× is the ratio of the two medians (per-round ratios 19.8–25.7×, median 24.1×); raw JSON in [`results/2026-11-04-win32-x64/`](results/2026-11-04-win32-x64/README.md) | Warm process; the cold start (last row) is slower. Zodiacally Ephemeris evaluates precomputed apparent longitudes; the Swiss Ephemeris computes positions from its data at run time and returns longitude, latitude, distance and their speeds (see [Method](#method-and-fairness)). | `speed.mjs` |
| 12 longitudes with speeds at the same date, no houses | 1.512 µs vs. 69.119 µs: 45.7×. Per body inside a chart: 0.126 µs vs. 5.760 µs | Same asymmetry; houses not included. Within one date the Swiss Ephemeris reuses per-date work, so a body costs it 5.76 µs here and 17.3 µs with a new date on every call. | `speed.mjs` |
| Placidus houses only | 3.568 µs vs. 9.507 µs: 2.7× | The smallest gap. Both compute sidereal time and the cusps on every call; Zodiacally Ephemeris takes the nutation in longitude and the true obliquity from precomputed tables, the Swiss Ephemeris computes them. | `speed.mjs` |
| One longitude, new date every call | 0.121 µs vs. 17.318 µs: 143× | The most favourable case for Zodiacally Ephemeris: with a new date on every call the Swiss Ephemeris cannot reuse per-date work. Not representative of a chart. | `speed.mjs` |
| Cold start: loading the library and computing the first chart in a fresh process, Node.js start-up excluded (median of 15) | 19.20 ms vs. 10.39 ms: **the Swiss Ephemeris starts faster** | Counting start-up, Zodiacally Ephemeris is ahead in total time after about 124 charts in one process. Cause: it loads Node's crypto module and reads and verifies the SHA-256 of its 8 MB of tables on first use. | `speed.mjs` |

**Agreement** (20,000 TT epochs 1900–2100, seed 20261108; apparent geocentric ecliptic longitude
of date at the same instant; houses at latitudes within ±66°). Figures labelled "October internal
report" come from Zodiacally's internal comparison harness, which is not part of this repository,
so these scripts cannot rerun them; they are documented in [`../docs/accuracy.md`](../docs/accuracy.md).

| measurement | result | read it with | script |
| --- | --- | --- | --- |
| Sun, Moon, planets, true node | Sun max 3.0 mas, Moon max 8.7 mas. Planets more than 1° from the Sun: p99 1.6–4.4 mas, max 9.0 mas. True node: p99 0.025″, max 0.18″ | Highest values in this run or in the October internal report ([`../docs/accuracy.md`](../docs/accuracy.md)): Sun 3.4 mas, Moon 8.9 mas, planets more than 1° from the Sun 9.1 mas, true node 0.26″. Within 1° of the Sun (next to or behind the solar disc) planets differ by up to 0.27″ in this run and up to 0.55″ in the October internal report (Jupiter, Uranus), because the libraries model light deflection differently there. Three conventions were chosen by comparison with Swiss Ephemeris output, so this agreement is partly by construction ([studies](studies/README.md)). | `agreement.mjs` (October figures: October internal report) |
| Chiron | up to 0.93″ | Different orbit solutions (see the Chiron row against Horizons). | `agreement.mjs` |
| Placidus houses at the same UT1 | Latitude within ±66°, 1900–2049: max 0.027″; p99 0.003″ (Ascendant), 0.001″ (MC), 0.002″ (all cusps) | Before 2050, right next to the polar circle (\|latitude\| ≈ 66.5°), where the Ascendant is singular: up to 0.67″ (October internal report; 0.66″ for Placidus). From 2050 the MC differs by an almost constant 1.87″ (max 2.08″), because the Swiss Ephemeris changes its sidereal-time model there. The Ascendant and cusps amplify that step: p99 4.8″ (Ascendant) and 3.6″ (cusps), up to 30″ at latitudes up to 66° (largest above 60°) in this run, and up to about 20′ (1,188″) right next to the polar circle in the October internal report. | `agreement.mjs` (\|latitude\| ≤ 66°; polar-circle figures: October internal report) |
| Zodiac sign | 0 of 240,000 positions differ at the same instant; the displayed whole arcminute differs in 61 (mostly Chiron) | A check for gross errors only. End to end from a UTC reading (October internal report, 55,205 instants 1899–2101, each library with its own time model), 4 body positions fell in a different sign: three from November 2049 on (Mercury 2049-11-11, Moon 2054-03-27 and 2066-04-21), where the two libraries map a future UTC to TT differently, and one Jupiter position on 2021-05-13 that lay within 0.001″ of the 330° boundary. The Ascendant fell in a different sign at 41 instants, all from 2044 on (the raw report counts 77 because it counts the Placidus and whole-sign runs separately); dates and distinct-instant counts from a November 2026 rerun of the same internal harness and seed, see [`../docs/accuracy.md`](../docs/accuracy.md). | `agreement.mjs` (same instant; end-to-end figures: October internal report) |

**Referee and NASA/JPL Horizons:**

| measurement | result | read it with | script |
| --- | --- | --- | --- |
| Swiss Ephemeris reading DE440 directly | Zodiacally − Swiss(DE440), the code difference, p99: 1.5 mas for the Sun and planets (more than 1° from the Sun), 2.7 mas Moon, 5.7 mas true node. Swiss(SE1) − Swiss(DE440), the data difference, p99: Moon 5.6, Venus 4.3, Mars 2.6, Mercury 1.8, Sun 1.5, Jupiter–Pluto 0.4–0.9, true node 24 mas | Shows that both libraries implement the apparent place consistently at the milliarcsecond level. It does **not** rank them: Zodiacally Ephemeris is built from DE440, so it is naturally closer to a DE440 computation than files built from DE441. The data difference also contains the compression of DE441 into the SE1 files, so it is not a pure DE440/DE441 difference (see *Data basis* above). | `agreement.mjs --jpl` |
| NASA/JPL Horizons, 200 epochs, quantity 31 | Sun to Pluto: both libraries differ from Horizons by up to 0.245″ (mean 0.08″) and from each other by at most 0.0073″ at the same epochs | The common term is JPL's IAU 1976/1980 frame for quantity 31 versus the IAU 2006/2000 models of both libraries. Horizons therefore cannot rank the two libraries. Horizons itself currently computes from DE441 (shown in the output headers in [`horizons-cache/`](horizons-cache/)), so this comparison does not favour the DE440 build either; the shared frame term dominates. | `horizons.mjs` |
| Chiron against Horizons | Zodiacally 0.242″ (the shared frame term only), Swiss 0.688″ | Chiron follows JPL's current orbit solution #171 (the one JPL Horizons serves); the Swiss Ephemeris asteroid file uses a different solution and differs from it by up to about 0.69″. Because the Chiron table was built from that same solution, this is a consistency check, not an independent accuracy result. | `horizons.mjs` |

For the Sun, the Moon and planets more than 1° from the Sun, the differences are a few
milliarcseconds (at most 9 mas in this run, 9.1 mas in the October internal report; 1 mas =
0.001″), thousands of times smaller than the arcminute a chart displays (1′ = 60,000 mas). At
latitudes within ±66°, the houses before 2050 differ by at most 0.027″ (p99 at most 0.003″). The
larger differences are those in the rows above: Chiron (up to 0.93″), the true node (up to 0.18″
in this run, 0.26″ in the October internal report), planets within 1° of the Sun (up to 0.27″ in
this run, 0.55″ in the October internal report), the Ascendant right next to the polar circle
(up to 0.67″ before 2050, October internal report) and the houses from 2050 (the MC by an almost
constant 1.87″; the Ascendant and cusps by up to 30″ at latitudes up to 66° in this run and by
up to about 20′ right next to the polar circle in the October internal report). At the same
instant no zodiac sign of a body differed in this run. End to end from a UTC reading (October
internal report), three of the four body sign differences come from the time models for future
dates and one from a position within 0.001″ of a sign boundary; the Ascendant sign differences
all fall from 2044 on (see the zodiac-sign row). This benchmark does not show that either library
is more accurate in general.

## Method and fairness

- **Same inputs, same process.** Both libraries receive identical Julian days and coordinates,
  generated from fixed seeds. Speed: the same 1,024 different inputs for both libraries (seed
  20261104; JD UT1 1900–2026, latitude ±65°), 2,000 warm-up calls, then 7 rounds with the
  execution order alternating per round; the result is the median of the per-round means, single
  thread.
- **Not the same work per call.** Zodiacally Ephemeris evaluates precomputed apparent longitudes:
  one polynomial per body, with light time, light deflection, aberration, precession and nutation
  applied when the tables were built. The Swiss Ephemeris computes positions from its data at run
  time and returns longitude, latitude, distance and their three speeds; when several bodies
  share a date it reuses per-date work (5.76 µs per body inside a chart, 17.3 µs with a new date
  on every call). The speed rows therefore measure what an application that needs only
  longitudes and speeds pays for a chart, not the cost of identical computations. For the houses
  the gap in work is smaller: both compute sidereal time and the cusps on every call, and only
  the nutation and the true obliquity come from precomputed tables in Zodiacally Ephemeris.
- **Through the Node.js binding.** The Swiss Ephemeris is called through the `sweph` native addon,
  which adds a JavaScript-to-C call per function. A C program calling the Swiss Ephemeris
  directly is not measured.
- **Same instant.** Positions are compared at the same TT, houses at the same UT1, so the
  libraries' different Delta T predictions for future dates do not inflate the differences.
  End to end from a UTC reading the libraries differ more for future dates, because future Earth
  rotation is unknown; see [`../docs/accuracy.md`](../docs/accuracy.md).
- **No silent fallback.** Every Swiss Ephemeris position call in `agreement.mjs` and
  `horizons.mjs` verifies that the SE1 (or JPL) data were actually used and not the built-in
  analytical (Moshier) approximation; the true node is exempt from this check. `speed.mjs` checks
  the data source once for every body before timing; the timed calls themselves are not checked.
- **What is not measured.** The many Swiss Ephemeris features that Zodiacally Ephemeris does not
  have (asteroids, sidereal zodiacs, other house systems, dates outside 1899–2101, latitude and
  distance), and runtimes other than Node.js.
- **Clean room, and its limits.** No Swiss Ephemeris source code was read or used, no Swiss
  Ephemeris data files are shipped, and no coefficient or continuous parameter was fitted to
  Swiss Ephemeris output; the tables come only from JPL data via Skyfield. Three discrete
  modelling choices between published conventions were, however, selected by comparing residuals
  against Swiss Ephemeris output: light deflection by the Sun only (Skyfield's default adds
  Jupiter and Saturn; JPL Horizons also deflects by the Sun only, `Rel. light bend : Sun` in the
  headers in [`horizons-cache/`](horizons-cache/)), the enclosed mass of an n = 3 polytrope for
  rays behind the solar disc, and the light-time-retarded osculating node for the true node. The
  alternatives, the measured residuals and the scripts are in
  [`studies/README.md`](studies/README.md). For these conventions the agreement with the Swiss
  Ephemeris is partly by construction, which is why the Horizons comparison is reported too.

## Run it yourself

Requirements: Node.js ≥ 22.12 and network access for `npm install` and the downloads (under
10 MB, plus 102 MB for the optional DE440 file). The engine itself has no runtime dependencies,
so nothing needs to be installed at the repository root. `sweph` 2.10.3-7 ships prebuilt
binaries only for macOS arm64, Linux x64, Linux arm64 and Windows x64; on other platforms (Intel
macOS, for example) `npm install` compiles it with node-gyp, which needs a C/C++ toolchain and
Python.

```sh
git clone https://github.com/Kululenko/zodiacally-ephemeris.git
cd zodiacally-ephemeris/benchmark
npm install                          # sweph 2.10.3-7, into benchmark/node_modules/ only
node fetch-swiss-data.mjs            # SE1 files into benchmark/ephe/, SHA-256 verified
node fetch-swiss-data.mjs --jpl      # optional: NASA/JPL DE440 (102 MB, public domain)
node speed.mjs                       # about 20 s on an Apple M1
node agreement.mjs                   # about 2 s; add --jpl for the DE440 referee (about 25 s)
node horizons.mjs                    # offline from horizons-cache/; --refresh queries JPL again
node summary.mjs                     # writes README.md into the newest results/ folder
```

A quick check that leaves `results/` untouched takes a few seconds:

```sh
node agreement.mjs --samples 500 --out-dir /tmp/zeph-check
node horizons.mjs --out-dir /tmp/zeph-check
node summary.mjs --dir /tmp/zeph-check
```

Each script writes JSON to `results/<date>-<platform>-<arch>/` (or to `--out-dir <dir>`) with the
machine, library versions, seeds and method, and `summary.mjs` turns one such folder into a
`README.md` (`--dir <dir>`). Inputs are generated from fixed seeds, so every run of these
scripts uses the same inputs (the 4 November Windows run, made with an earlier script, did not;
see the speed table); your timings will differ with the machine and the Node.js version. To test
a different engine build, pass `--engine <path>`.

The convention studies (Python, using the table build's environment) are described, with their
run instructions, in [`studies/README.md`](studies/README.md).

Please share your results: open a [verification report](https://github.com/Kululenko/zodiacally-ephemeris/issues/new?template=verification-report.yml)
with the generated `README.md`, especially if your numbers differ from ours.

## Licences

The scripts in this directory, including `studies/`, are MIT-licensed (see `LICENSE`).
Zodiacally Ephemeris itself is source-available and free to use, also commercially, with
attribution, but it is not open source; see [`../LICENSE.txt`](../LICENSE.txt). `npm install`
fetches `sweph` (AGPL-3.0 / LGPL-3.0), and `fetch-swiss-data.mjs` downloads the Swiss Ephemeris
data files together with their licence file. The Swiss Ephemeris is available under AGPL-3.0 or
the Swiss Ephemeris Professional License (see [astro.com/swisseph](https://www.astro.com/swisseph/)
for current terms). `sweph` and the data files stay in this directory, are git-ignored and are
never part of the `zodiacally-ephemeris` package. NASA/JPL data are public domain.
