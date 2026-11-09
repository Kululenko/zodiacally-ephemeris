# Zodiacally Ephemeris: a table-driven JPL DE440 ephemeris for astrological software, and its validation against the Swiss Ephemeris and NASA/JPL Horizons

Technical note, version 1.1.0, 9 November 2026 (benchmark run of 8 November 2026). Zodiacally
(https://www.zodiacally.com). Repository: https://github.com/Kululenko/zodiacally-ephemeris

## Abstract

Astrological software needs apparent geocentric ecliptic longitudes of the Sun, Moon, planets,
Chiron and the lunar node, plus house cusps, at arcminute display precision. The Swiss Ephemeris
is the established library for this task. We describe Zodiacally Ephemeris, a pure-JavaScript
engine that evaluates precomputed Chebyshev tables of exactly these quantities, derived from
NASA/JPL DE440s and JPL's orbit solution #171 for Chiron, and computes IAU 2006 sidereal time and
Placidus or whole-sign houses at run time (with nutation and true obliquity taken from tables).
The tables reproduce directly computed apparent places to about 0.5 mas (largest 0.5002 mas at
the check points); a rebuild from public JPL data reproduced them byte-identically on
macOS/arm64 and numerically equivalently (within 0.00000002″) on Linux x86-64.

Over 20,000 epochs between 1900 and 2100, at the same instant, the engine agrees with the Swiss
Ephemeris 2.10.03 and its default files (which are based on JPL DE441) to p99 1.6–4.4 mas for the
planets more than 1° from the Sun and at most 8.7 mas for the Moon. Within 1° of the Sun, where the
two libraries model light deflection differently, differences reach 0.27″ in the November 2026
benchmark and 0.55″ in Zodiacally's October 2026 internal report. No zodiac sign differed in
240,000 positions compared at the same instant, which is a check for gross errors only. End to
end from a UTC reading, where the libraries' time models differ, the second internal run of that
report (55,205 instants) found 4 body positions in a different sign: three from November 2049 on,
where the two libraries map a future UTC to TT differently, and one Jupiter position in 2021 that
lay within 0.001″ of a sign boundary. The Ascendant fell in a different sign at 41 instants, all
from 2044 on (dates and distinct-instant counts from a November 2026 rerun of the same internal
harness and seed, see [accuracy.md](accuracy.md)). Three discrete modelling conventions were
chosen by comparison with Swiss Ephemeris output, so part of this agreement is by construction.
For the Sun to Pluto, both libraries differ
from NASA/JPL Horizons by up to 0.245″ through a shared frame term, so Horizons cannot rank them.
Chiron is a separate case: its table follows a different orbit solution from the Swiss
Ephemeris asteroid file (differences up to 0.93″), and Horizons uses the very solution the table
was built from, so the Chiron comparison with Horizons is a consistency check only.

In Node.js, after warm-up, a complete chart is computed 14–24 times faster than with the Swiss
Ephemeris binding `sweph` on the two machines measured. Loading the library and computing the
first chart in a fresh process (Node.js start-up excluded) is slower with Zodiacally Ephemeris:
19.2 ms versus 10.4 ms. The workloads differ: Zodiacally Ephemeris evaluates precomputed
apparent longitudes, while the Swiss Ephemeris computes positions, including latitude and
distance, from its data at run time. The November
measurements are scripted and can be rerun from the repository; the October internal report was
made with Zodiacally's internal harness, which is not published.

## 1. Requirements

An astrological chart consists of the ecliptic longitudes of twelve bodies or points, their
direction of motion, and the angles and cusps of a house system. Displays round to whole
arcminutes; zodiac-sign and house boundaries, and in Human Design the 0.9375° line boundaries,
make positions near a boundary sensitive to errors of the order of an arcsecond. Typical birth
data range from about 1900 to the present, transits to the end of the century. The quantity
required is the apparent position (light time, aberration, deflection) referred to the true
equinox and ecliptic of date.

## 2. Data

- Sun, Moon, Mercury to Pluto (system barycentres for Mars to Pluto): JPL DE440s, the 1849–2150
  excerpt of DE440 (Park et al. 2021, AJ 161:105), SHA-256 verified. DE440 is the JPL ephemeris
  recommended for modern dates ([JPL](https://ssd.jpl.nasa.gov/doc/de440_de441.html)).
- Chiron: barycentric ICRF state vectors from JPL Horizons, orbit solution JPL#171, on a 4-day
  grid, committed as raw responses for reproducibility.
- Time: IERS leap-second table; ΔT from Morrison et al. (2021) up to 1950.0, a cubic Hermite
  blend 1950.0–1955.5, USNO historical values 1955.5–1962.0, IERS EOP 20 C04 from 1962 to the
  last observation, IERS Bulletin A predictions to 2027-09-25, and beyond that a cubic Hermite
  transition towards the parabola of Stephenson, Morrison & Hohenkerk (2016).

## 3. Reduction

Apparent places are computed offline with Skyfield 1.55: geocentric observer, iterated light
time, gravitational deflection by the Sun (with the enclosed-mass model of an n = 3 polytrope for
rays behind the solar disc), relativistic annual aberration, frame bias, IAU 2006 precession and
the full IAU 2000A nutation, then rotation by the true obliquity into the true ecliptic of date.
The true node is the osculating node of the geocentric lunar orbit, h = r × v at the
light-time-retarded epoch, on the mean ecliptic of date plus Δψ, i.e. the true ecliptic of date.

Where published conventions differ, three discrete choices were made by comparing residuals
against Swiss Ephemeris output:

1. light deflection by the Sun only, whereas Skyfield's default adds Jupiter and Saturn (JPL
   Horizons also uses Sun-only deflection; its output headers state `Rel. light bend : Sun`);
2. the n = 3 polytrope enclosed-mass model for rays behind the solar disc, instead of the
   point-mass formula or no deflection;
3. the light-time-retarded osculating node for the true node, instead of the geometric one or
   other reference planes.

No Swiss Ephemeris source code was read or used, no Swiss Ephemeris data files are shipped, and no
coefficient or continuous parameter was fitted to Swiss Ephemeris output; the tables are computed
only from JPL data via Skyfield. The alternatives and their residuals are documented in
[conventions.md](conventions.md#how-the-swiss-ephemeris-was-used), and the study scripts are
published in [`benchmark/studies/`](../benchmark/studies/). Because of these three choices, the
agreement with the Swiss Ephemeris in §6 is partly by construction; this is why the comparison
with NASA/JPL Horizons is reported as well.

## 4. Tables and evaluation

Each quantity is stored as consecutive Chebyshev records (16 or 32 days, 14–22 coefficients,
little-endian float64), interpolated at Chebyshev–Lobatto points with shared record ends and
verified at 24 points per record. Near a superior solar conjunction the deflection changes within
hours, and a single 16-day record would be off by up to about 7″ (Neptune 6.89″, recorded as
`maxArcsecBeforeRefinement` in the manifest's fit report). Such records are checked at 401 points
(about one hour apart) and, where needed, replaced by halved sub-records until each meets the
0.5 mas target at check points at least as dense. The fit error is therefore about 0.5 mas: the
largest error found at all check points is 0.5002 mas (Mercury, recorded as `maxFitErrorArcsec`
in the manifest), marginally above that target. It is a maximum found at these check points, not
a proven bound between them. Fourteen tables (twelve bodies, nutation in longitude, true
obliquity) plus nine files of refined sub-records, 23 files in all, total 7.78 MiB (8,153,312
bytes). The run-time evaluator (about 1,000 lines of JavaScript including the
generated ΔT table) verifies every table's size and SHA-256 against the manifest on first use,
then evaluates value and exact derivative by the Chebyshev recurrences. Dates outside the tables
are rejected.

Sidereal time follows IAU 2006 (IERS Conventions 2010, eqs. 5.15 and 5.32) with the equation of
the equinoxes including the IAU 2000 complementary terms, using Δψ and the true obliquity from the
nutation and obliquity tables; Placidus cusps are found by semi-arc trisection to below 10⁻⁶″.
Inside the polar circles, where Placidus is undefined, the engine returns an explicit error and
leaves the fallback to the application.

## 5. Reproducibility

`build/tables/build.sh` installs pinned packages, downloads DE440s and regenerates all tables,
the manifest and a fixture of directly computed reference values. A rebuild on 8 November 2026
on an Apple M1 (macOS, Python 3 from Homebrew) reproduced all 24 files in `data/` (23 table files
and `manifest.json`) and the reference fixture byte-identically to the committed October 2026
build. On Linux x86-64 (GitHub Actions, Ubuntu, Python 3.13) the rebuild is not bit-identical,
because floating-point results differ in the last bits between platforms, but the record layout is
identical and a strict bound from the coefficient differences (`build/compare-tables.mjs`) limits
the difference of any evaluated value to 0.000000016″; the directly computed reference values
differ by at most 0.0000217″. A monthly CI job (`.github/workflows/reproducible-build.yml`)
repeats this check.

The manifest's `createdBy` field reads `tools/ephemeris-build/build.py 1.1.0`, the builder's path
in Zodiacally's internal repository, where the October 2026 build was made. It is left unchanged
because editing it would change the published manifest SHA-256; `build.py` writes the same string.

## 6. Validation

The November 2026 comparisons are scripted in `benchmark/` with fixed seeds; the Swiss Ephemeris
is called only through its public API (the `sweph` binding), with checks that its file-based data
(not the Moshier fallback) were used. Figures from the October 2026 internal report, made with
Zodiacally's unpublished harness, are labelled as such.

**Data basis.** Zodiacally Ephemeris is built on DE440, the JPL ephemeris recommended for modern
dates. The Swiss Ephemeris' current default files (`sepl_18`, `semo_18`, `seas_18` from the
official repository, revision 3fd0f956) state in their header that they were created on
2026/05/26, "based on JPL Ephemeris DE441". DE440 and DE441 are companion ephemerides from the
same JPL release, fitted to the same data; DE441 omits the lunar core–mantle damping so that it
can be integrated over a much longer span (−13,200 to +17,191). JPL gives their differences as
below 1 m for the planetary orbits over 1550–2650 and below 2 m for the Moon over 1970–2020
([JPL](https://ssd.jpl.nasa.gov/doc/de440_de441.html)), far below anything a chart can show.

**Swiss Ephemeris 2.10.03 with its default SE1 files**, 20,000 uniformly distributed TT epochs
1900–2100 (seed 20261108), same instant: Sun max 3.0 mas; Moon max 8.7 mas; Mercury to Pluto more
than 1° from the Sun p99 1.6–4.4 mas, max 9.0 mas; within 1° of the Sun up to 0.27″, where the
planet is next to or behind the solar disc and the two libraries model light deflection
differently; true node p99 25 mas, max 0.18″; Chiron up to 0.93″ (different orbit solutions).
The October internal report ([accuracy.md](accuracy.md); Zodiacally's internal harness, other
generators and seeds) observed larger maxima: Sun 3.4 mas, Moon 8.9 mas, planets more than 1°
from the Sun 9.1 mas, up to 0.55″ within 1° of the Sun (Jupiter, Uranus) and 0.26″ for the true
node. Placidus Ascendant, MC and cusps at the same UT1, |latitude| ≤ 66°, 1900–2049: max 0.027″;
p99 0.003″ (Ascendant), 0.001″ (MC), 0.002″ (all cusps). Right next to the polar circle
(|latitude| ≈ 66.5°), where the Ascendant is singular, differences of up to 0.67″ were observed
before 2050 (October internal report; 0.66″ for Placidus). From 2050 the MC differs by an almost
constant 1.87″, because the Swiss Ephemeris changes its sidereal-time model there. The Ascendant
and cusps amplify that step: up to 30″ at latitudes up to 66° in the 8 November run (largest
above 60°; p99 4.8″ for the Ascendant, 3.6″ for the cusps) and up to 35.6″ at those latitudes in
the first October run, and up to about 20′ (1,188″) right next to the polar circle in the October
internal report. At the same instant the zodiac sign differed in 0 of 240,000 positions; this is
a check for gross errors only. The displayed whole arcminute (floor) differed in 61 of 240,000,
58 of them for Chiron.

**Swiss Ephemeris reading DE440 directly** as a referee (JPL file `linux_p1550p2650.440`):
Zodiacally − Swiss(DE440) isolates the difference between the two codes, Swiss(SE1) −
Swiss(DE440) the difference between the two data sets. The code difference has p99 1.5 mas for
the Sun to Pluto (planets more than 1° from the Sun), 2.7 mas for the Moon and 5.7 mas for the
true node. The data difference has p99 1.5 mas for the Sun, 5.6 mas for the Moon, 1.8, 4.3 and
2.6 mas for Mercury, Venus and Mars, 0.4–0.9 mas for Jupiter to Pluto and 24 mas for the true
node. That data difference also includes the compressed representation of DE441 in the SE1
files, so it is not a pure DE440/DE441 difference. The code difference shows that both libraries
implement the apparent place consistently at the milliarcsecond level. It does not rank them:
Zodiacally Ephemeris is built from DE440, so it is naturally closer to a DE440 computation than
files based on DE441 are.

**NASA/JPL Horizons**, observer quantity 31 (apparent ecliptic longitude of date), 200 epochs
(seed 20261109); Horizons reports JPL#171 as its source for Chiron. Horizons itself currently
computes from DE441 (shown in its output header), so this comparison does not favour the DE440
build either; the shared frame term dominates. Both libraries differ from Horizons by up to
0.245″ (mean 0.08″) for the Sun to Pluto, and from each other by at most 0.0073″ at the same
epochs. The shared term corresponds to the IAU 1976/1980 frame in which JPL documents quantity 31,
versus the IAU 2006/2000 models of both libraries; it hides any difference between the libraries,
so Horizons cannot rank them. For Chiron, Zodiacally
Ephemeris differs from Horizons by up to 0.242″ (the shared term only), the Swiss Ephemeris by up
to 0.688″. Horizons computes Chiron from orbit solution JPL#171, and because the Chiron table was
built from that same solution, this is a consistency check, not an independent accuracy result;
it shows only that the Swiss Ephemeris asteroid file uses a different Chiron orbit solution.

**End to end from UTC.** The October 2026 internal report ([accuracy.md](accuracy.md)) has two
runs: 24,523 instants including leap seconds, the 1971/72 transition and polar latitudes, and a
second internal run (different generator and seed) over 55,205 UTC instants 1899–2101. Both
evaluate the same UTC reading through both libraries, each with its own time model, and both were
made by Zodiacally with its internal comparison harness, which is not published. Remaining
differences in houses are caused by the UT1 models: observed UT1 in this engine versus the Swiss
Ephemeris' own ΔT, and diverging predictions for future dates. At latitudes up to 66° the first
run found the MC up to about 1″ and the Ascendant up to about 5″ apart for 1972–2022, up to 84″
and about 7′ for 2027–2049, and up to 580″ and about 69′ (over 1°) for 2050–2100. For future dates
the libraries also map UTC to TT differently, by up to about 5.4 s by 2049 and 24.5 s by 2100,
so positions differ end to end as well (the Moon by up to 3.4″ by 2049 and 15.5″ by 2100; 15.6″
in the second run). In the second run, 4 body positions fell in a different zodiac sign: three from
November 2049 on (Mercury 2049-11-11, Moon 2054-03-27 and 2066-04-21), where the two libraries
map a future UTC to TT differently, and one Jupiter position on 2021-05-13 that lay within
0.001″ of the 330° boundary (the two values were 0.0009″ apart). The Ascendant fell in a different sign at 41
instants, all from 2044 on and 40 of them from 2055; the raw report counts 77 because it counts
the Placidus and whole-sign runs separately. The printed report lists only the largest case per
body, so the Jupiter and 2054 Moon dates and the count of distinct instants come from rerunning
the same harness with the same seed (see [accuracy.md](accuracy.md)). In the first run no body
changed sign end to end.

## 7. Performance

Node.js API, warm, single thread, the same 1,024 different inputs for both libraries (seed
20261104; dates 1900–2026, latitudes ±65°), seven alternating rounds after 2,000 warm-up calls,
median of the per-round means. Apple M1, macOS, Node 25.8.2, `sweph` 2.10.3-7 (Swiss Ephemeris
2.10.03), 8 November 2026:

- full chart (12 longitudes with speeds + Placidus): 5.497 µs vs. 77.048 µs (14.0×);
- 12 longitudes with speeds at the same date, no houses: 1.512 µs vs. 69.119 µs (45.7×), i.e.
  0.126 µs vs. 5.760 µs per body inside a chart;
- Placidus houses only: 3.568 µs vs. 9.507 µs (2.7×);
- one longitude with speed, new date every call: 0.121 µs vs. 17.318 µs (143×). This is the most
  favourable case for Zodiacally Ephemeris, because the Swiss Ephemeris cannot reuse per-date
  work; the chart rows are the representative ones.

AMD Ryzen 5 5600G, Windows x64, Node 22.14.0, full chart: 7.540 µs vs. 177.526 µs (23.5×). This
measurement was made on 4 November 2026 with an earlier single-workload script: same chart
workload, rounds and seed number, but a different random generator, so different inputs from
the same ranges; 23.5× is the ratio of the two medians (per-round ratios 19.8–25.7×, median
24.1×). Raw values are in
[`benchmark/results/2026-11-04-win32-x64/`](../benchmark/results/2026-11-04-win32-x64/README.md).

Cold start favours the Swiss Ephemeris: loading the library and computing the first chart in a
fresh process (Node.js start-up excluded) takes 19.20 ms vs. 10.39 ms (median of 15 runs),
because Zodiacally Ephemeris loads Node's crypto module and reads and verifies the SHA-256 of its
8 MB of tables on first use. Counting start-up, Zodiacally Ephemeris is ahead in total time after
about 124 charts in one process.

The workloads are not symmetric. Zodiacally Ephemeris evaluates precomputed apparent longitudes,
one polynomial per body; the Swiss Ephemeris computes positions from its data at run time and
returns longitude, latitude, distance and their speeds, reusing per-date work when several bodies
share a date (5.76 µs per body inside a chart against 17.3 µs with a new date on every call). The
Swiss Ephemeris is called through the `sweph` native binding; a C program calling it directly is
not measured.

## 8. Limitations

Twelve bodies, two house systems, tropical apparent geocentric longitude and speed only (no
latitude or distance), from 1899-01-01 00:00:04 UTC to 2101-01-13 23:58:50 UTC (exact bounds in
`info().coverage`), Node.js ≥ 22.12 with file-system access (not in a browser).
Time data require periodic updates. The engine computes astronomical quantities; it makes no
statement about the validity of astrological interpretation.

## 9. Availability

Source and data: https://github.com/Kululenko/zodiacally-ephemeris (public repository since
9 November 2026). The engine is source-available, not open source. It is free only for private,
personal, non-commercial use, not for businesses, client work, paid readings or public services,
even free ones; free use also requires the attribution line in every generated reading.
Commercial licences are one-time and perpetual for the licensed version: €500
with visible attribution in every customer-facing reading, or €2,000 white-label; contact
support@zodiacally.com. The binding terms are in [LICENSE.txt](../LICENSE.txt). Used by
Zodiacally since October 2026.

The benchmark scripts in `benchmark/` are MIT-licensed. `sweph` (AGPL-3.0/LGPL-3.0) and the Swiss
Ephemeris data files are installed or downloaded separately and are never distributed with the
package. The Swiss Ephemeris itself is available under the AGPL-3.0 or the Swiss Ephemeris
Professional License (see astro.com/swisseph for current terms). The data sources are public
domain (NASA/JPL); no NASA or JPL endorsement is implied. The Swiss Ephemeris is developed by
Astrodienst AG, which has not reviewed or endorsed this comparison.

## References

- Park, R. S., Folkner, W. M., Williams, J. G., Boggs, D. H. (2021). The JPL Planetary and Lunar
  Ephemerides DE440 and DE441. *The Astronomical Journal* 161:105.
- JPL Solar System Dynamics. DE440 and DE441 (description, differences and recommended use).
  https://ssd.jpl.nasa.gov/doc/de440_de441.html
- JPL Horizons System. https://ssd.jpl.nasa.gov/horizons/
- Petit, G., Luzum, B. (eds.) (2010). *IERS Conventions (2010)*. IERS Technical Note 36.
- Kaplan, G. H. (2005). *The IAU Resolutions on Astronomical Reference Systems, Time Scales, and
  Earth Rotation Models*. USNO Circular 179.
- Rhodes, B. (2019). Skyfield: High precision research-grade positions for planets and Earth
  satellites generator. Astrophysics Source Code Library, ascl:1907.024.
- Morrison, L. V., Stephenson, F. R., Hohenkerk, C. Y., Zawilski, M. (2021). Addendum 2020 to
  "Measurement of the Earth's rotation: 720 BC to AD 2015". *Proc. R. Soc. A* 477:20200776.
- Stephenson, F. R., Morrison, L. V., Hohenkerk, C. Y. (2016). Measurement of the Earth's rotation:
  720 BC to AD 2015. *Proc. R. Soc. A* 472:20160404.
- Schneider, P., Ehlers, J., Falco, E. E. (1992). *Gravitational Lenses*. Springer.
- Abramowitz, M., Stegun, I. A. (1964). *Handbook of Mathematical Functions*, eq. 22.7.4.
- *Swiss Ephemeris* 2.10.03. https://www.astro.com/swisseph/
