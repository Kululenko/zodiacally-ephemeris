# Accuracy

This page collects the accuracy evidence for Zodiacally Ephemeris 1.1.0. The numbers come from
two measurement harnesses:

1. **The public benchmark** in [`../benchmark/`](../benchmark/README.md), run on 8 November 2026:
   the Swiss Ephemeris 2.10.03 with its default SE1 files (which state that they are based on JPL
   DE441), the Swiss Ephemeris reading JPL DE440 directly as a referee, and NASA/JPL Horizons.
   Anyone can rerun it; the results are in
   [`../benchmark/results/2026-11-08-darwin-arm64/`](../benchmark/results/2026-11-08-darwin-arm64/README.md).
2. **The October 2026 internal report**, reproduced below: 24,523 instants, plus a second
   internal run (different generator and seed) over 55,205 UTC and 28,602 TT instants. Both runs
   were made by Zodiacally on 3 October 2026, when version 1.1.0 was finished, with its internal
   comparison harness, which is not part of this repository, so they cannot be rerun from here.
   The report also covers the end-to-end path from a UTC reading, leap seconds, the 1971/72
   transition, polar latitudes and Human Design gate and line boundaries.

All differences below are Zodiacally Ephemeris minus Swiss Ephemeris. 1 mas = 0.001″; one
arcminute, the precision a chart displays, is 60,000 mas.

## Summary

Same instant (positions at the same TT, houses at the same UT1). "Max observed" is the largest
value in any of the runs on this page (the November benchmark and both October runs); p99 is from
the 8 November run (20,000 epochs 1900–2100, seed 20261108) and is the better indication of
typical agreement.

| quantity | max observed | p99 | note |
| --- | ---: | ---: | --- |
| Sun | 3.4 mas | 2.1 mas | 3.0 mas max in the November run |
| Moon | 8.9 mas | 6.5 mas | 8.7 mas max in the November run |
| Mercury–Pluto, more than 1° from the Sun | 9.1 mas | 1.6–4.4 mas | 9.0 mas max in the November run |
| Mercury–Pluto, within 1° of the Sun | 0.55″ | – | Jupiter and Uranus in the second October run; 0.27″ in the November run. The planet is next to or behind the solar disc, where the two libraries model light deflection differently. |
| True node | 0.26″ | 0.025″ | 0.18″ max in the November run |
| Chiron | 0.93″ | 0.80″ | different orbit solutions (below) |
| Ascendant, MC, Placidus cusps, \|latitude\| ≤ 66°, 1900–2049 | 0.027″ | 0.003″ / 0.001″ / 0.002″ | p99 for Ascendant / MC / all cusps; November run |
| Ascendant right next to the polar circle (\|latitude\| ≈ 66.5°), before 2050 | 0.67″ | – | October internal report (0.66″ for Placidus); the Ascendant is singular there and amplifies tiny obliquity and sidereal-time differences |
| MC from 2050 | 2.08″ | 2.08″ | almost constant, mean 1.87″, because the Swiss Ephemeris changes its sidereal-time model at 2050 (observed from the outside as a step in sidereal time) |
| Ascendant and Placidus cusps from 2050 | 1,188″ (about 20′) | 4.8″ / 3.6″ | p99 for Ascendant / cusps, November run. The Ascendant and cusps amplify the MC step: up to 30″ at latitudes up to 66° in the November run (largest above 60°) and up to 35.6″ at those latitudes in the first October run, and up to about 20′ right next to the polar circle in the October internal report. |
| Zodiac sign | 0 of 240,000 positions differ | | a check for gross errors only (November run) |
| Displayed whole arcminute (floor) | 61 of 240,000 positions differ | | 58 of them Chiron (November run) |

These are differences of a few mas, i.e. thousands of times smaller than the arcminute a chart
displays, except where noted.

**End to end from a UTC reading**, the two libraries additionally differ by their time models.
Zodiacally Ephemeris uses observed UT1 (IERS EOP 20 C04) from 1962 to the last observation, IERS
Bulletin A predictions after that, and keeps TAI − UTC at its last value for future dates; the
Swiss Ephemeris uses its own ΔT. Before 1972 both read the civil time as UT1, and the houses agree
as at the same instant. From 1972 to 2022 the MC differs by up to about 1″ and the Ascendant by up
to about 5″ at latitudes up to 66° (more right next to the polar circle). For future dates every
ephemeris has to predict the Earth's rotation, and the predictions differ by seconds of time
after 2027 and tens of seconds by 2100 (one second of UT1 moves the MC by 15″). At latitudes up
to 66° the first October run found the MC up to 84″ and the Ascendant up to about 7′ apart for
2027–2049, and up to 580″ and about 69′ (over 1°) for 2050–2100. For future dates the libraries
also map UTC to TT differently, so positions differ end to end as well, for the Moon by up to
3.4″ by 2049 and 15.5″ by 2100 in the first October run (15.6″ in the second).

**Signs end to end.** From a UTC reading (October internal report, second run: 55,205 instants
1899–2101, each library with its own time model), **4 body positions** fell in a different sign: three from
November 2049 on (Mercury 2049-11-11, Moon 2054-03-27 and 2066-04-21), where the two libraries map
a future UTC to TT differently, and one Jupiter position on 2021-05-13 that lay within 0.001″ of
the 330° boundary (the two values were 0.0009″ apart). The **Ascendant** fell in a different sign
at **41 instants**, all from 2044 on and 40 of them from 2055; the raw report below counts 77
("end-to-end Asc 77" in R4) because it counts the Placidus and whole-sign runs separately. In the
24,523 instants of the first October run no body changed sign end to end. The report lists only
the largest case per body, and only if it exceeds 0.05″, so the Jupiter 2021 and Moon 2054 cases
and the count of distinct Ascendant instants do not appear in it. They come from rerunning the
same internal harness with the same seed in November 2026, against the same SE1 files as the
public benchmark and with every mismatch printed; that rerun reproduced every table of the second
run (R1–R6) exactly. The same rerun shows that the raw count "same-UT1 Asc 2" in R4 is a single
instant (2085-03-31, latitude 62.2°, the 2050 sidereal-time step), counted once for Placidus and
once for whole sign; it is also the single whole-sign cusp difference ("W 1").

**What the comparisons can and cannot show.** Zodiacally Ephemeris is built on DE440, the JPL
ephemeris recommended for modern dates; the Swiss Ephemeris' current files are built from the
long-span companion DE441. JPL gives their differences as below 1 m for the planetary orbits over
1550–2650 and below 2 m for the Moon over 1970–2020
([JPL](https://ssd.jpl.nasa.gov/doc/de440_de441.html)), far below anything a chart can show.

- *Referee.* With the Swiss Ephemeris reading DE440 directly, Zodiacally − Swiss(DE440) isolates
  the difference between the two codes: p99 1.5 mas for the Sun to Pluto, 2.7 mas for the Moon
  and 5.7 mas for the true node, the same order as the data difference between the Swiss default
  files and DE440 (p99 0.4–5.6 mas, true node 24 mas). That data difference also includes the
  compressed representation of DE441 in the SE1 files, so it is not a pure DE440/DE441
  difference. The code difference shows that both libraries implement the apparent place
  consistently at the milliarcsecond level. This does not rank them: a library built from DE440
  is naturally closer to a DE440 computation.
- *NASA/JPL Horizons* (quantity 31, 200 epochs): both libraries differ from Horizons by up to
  0.245″ (mean 0.08″) for the Sun to Pluto, from each other by at most 0.0073″. The shared term is
  JPL's IAU 1976/1980 frame for this quantity versus the IAU 2006/2000 models of both libraries,
  so Horizons cannot rank them. Horizons itself currently computes from DE441 (shown in its
  output header), so this comparison does not favour the DE440 build either; the shared frame term
  dominates.
- *Chiron* follows JPL's current orbit solution #171 (the one JPL Horizons serves); the Swiss
  Ephemeris asteroid file uses a different solution and differs from Horizons by up to about
  0.69″. Because the Chiron table was built from that same solution #171, this is a consistency
  check, not an independent accuracy result.
- *By construction.* Three discrete conventions (light deflection by the Sun only, the polytrope
  model behind the solar disc, the true-node definition) were chosen by comparing residuals with
  Swiss Ephemeris output; see [conventions.md](conventions.md#how-the-swiss-ephemeris-was-used).
  Part of the agreement with the Swiss Ephemeris is therefore by construction.

We do not claim greater accuracy than the Swiss Ephemeris. At the same instant the differences
are far below what a chart displays; end to end, the time models matter for houses and for
future dates, as described above.

---

## Release report (October 2026)

Reproduced as generated on 3 October 2026. All measured values and tables are unchanged. In the
prose, internal references were replaced by neutral descriptions (in R6, the description of the
Human Design test, which referred to Zodiacally's own application and one of its source files,
now describes the gate/line mapping and its result in neutral terms), a few statements about the
Swiss Ephemeris were reworded to match this page (one vague statement, "up to degrees" in the
note under R4, was replaced by the measured 1,188″ from the R4 table), and the statement that the
oracle output was never used to build engine data was removed (see
[conventions.md](conventions.md#how-the-swiss-ephemeris-was-used)). The heading of the second
run was renamed to "Second internal run (review-engine.mjs)", because the title the harness
generated suggested an outside review: that run uses a different generator and seed, but it was
made by Zodiacally with the same internal tooling, not by a third party. Paths such as
`tools/swiss-oracle/` and `tools/ephemeris-build/` refer to Zodiacally's internal repository; the
table builder is published here as `build/tables/`, the convention studies as
`benchmark/studies/`, the public comparison as `benchmark/`. The harness scripts named below
(`compare-engine.mjs`, `review-engine.mjs`) are not published; `benchmark/agreement.mjs` makes
the same kind of same-instant comparison. Section 6 (performance) comes from the first run's
harness; its "position() per body" row is the one-longitude, new-date-every-call case, the most
favourable one for Zodiacally Ephemeris. The representative figure is the full chart: 14–24× in
the current warm measurements, with a slower cold start; their method is in the
[benchmark](../benchmark/README.md).

### Engine vs. Swiss Ephemeris oracle

Generated by `node tools/swiss-oracle/compare-engine.mjs 20000 20261003` on 2026-10-03 (Node v25.8.2, darwin/arm64). Dev-only black-box comparison through the public `sweph` API.

- Engine: zodiacally-ephemeris 1.1.0, data de440s-chironJPL#171-05b57b83e52c, manifest sha256 `dc4569769900b603...`, coverage 1899-01-01T00:00:03.019Z .. 2101-01-13T23:58:50.815Z
- Oracle: sweph 2.10.03, `swe.utc_to_jd` -> `swe.calc_ut(jdUT1, body, SEFLG_SWIEPH|SEFLG_SPEED)`, `swe.houses(jdUT1, lat, lon, 'P'|'W')`, files in tools/swiss-oracle/ephe
- Samples: 24523 instants (seed 20261003): random 20000, leapSecond 216, y1971_1972 307, polar 1000, polarCircle 1000, southern 2000. random = uniform UTC 1899-10-01 .. 2100-12-31, latitude +-66, any longitude; each instant is evaluated for 12 bodies + houses P and W.
- All differences are engine minus oracle. Longitudes in arcsec, speeds in arcsec/day, times in seconds. |x| statistics; "bias" is the signed mean.
- **same instant** = both sides at the oracle's own JD (TT for bodies, UT1 for houses): isolates the ephemeris. **end-to-end** = the same UTC through both stacks: adds the DeltaT/UT1 model difference.

### 1. Longitude, same instant (ephemeris only), all sample sets

|x| over all samples, then max |x| and the share of samples above 0.05" per true solar elongation bin (planets only; next to a superior conjunction the tables use refined sub-records (data format 2), so what remains within ~1 deg of the Sun is the difference between the two solar light-deflection models, largest behind the solar disc).

| body | n | max | p99 | mean | bias | 0-1 deg: max (>0.05" share, n) | 1-4 deg: max (>0.05" share, n) | 4-16 deg: max (>0.05" share, n) | 16-180 deg: max (>0.05" share, n) | speed max | speed p99 | speed mean |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| sun | 24523 | 3.4e-3 | 2.2e-3 | 6.5e-4 | 1.6e-4 | - | - | - | - | 3.3e-3 | 2.5e-3 | 1.3e-3 |
| moon | 24523 | 8.6e-3 | 6.3e-3 | 1.7e-3 | -1.2e-3 | - | - | - | - | 0.2763 | 0.2558 | 0.0995 |
| mercury | 24523 | 0.0922 | 2.4e-3 | 6.9e-4 | 1.6e-4 | 0.0922 (0.7%, 145) | 3.8e-3 (0.0%, 2098) | 3.9e-3 (0.0%, 10036) | 3.4e-3 (0.0%, 12244) | 4.6379 | 0.0291 | 7.3e-3 |
| venus | 24523 | 0.0733 | 4.3e-3 | 8.0e-4 | 1.5e-4 | 0.0733 (0.9%, 110) | 4.8e-3 (0.0%, 1190) | 9.1e-3 (0.0%, 4628) | 8.3e-3 (0.0%, 18595) | 0.3561 | 6.9e-3 | 3.2e-3 |
| mars | 24523 | 0.2477 | 2.8e-3 | 6.8e-4 | 1.5e-4 | 0.2477 (1.8%, 110) | 2.0e-3 (0.0%, 730) | 2.3e-3 (0.0%, 2720) | 5.2e-3 (0.0%, 20963) | 1.2393 | 3.3e-3 | 1.1e-3 |
| jupiter | 24523 | 0.0239 | 1.7e-3 | 5.1e-4 | 1.6e-4 | 0.0239 (0.0%, 89) | 2.3e-3 (0.0%, 535) | 2.5e-3 (0.0%, 1972) | 2.7e-3 (0.0%, 21927) | 0.4306 | 1.7e-3 | 4.6e-4 |
| saturn | 24523 | 0.0223 | 1.7e-3 | 5.1e-4 | 1.4e-4 | 0.0223 (0.0%, 34) | 2.2e-3 (0.0%, 522) | 2.3e-3 (0.0%, 1853) | 3.6e-3 (0.0%, 22114) | 0.4439 | 2.8e-3 | 7.2e-4 |
| uranus | 24523 | 0.1027 | 1.6e-3 | 4.9e-4 | 1.9e-4 | 0.1027 (0.8%, 119) | 1.9e-3 (0.0%, 451) | 2.2e-3 (0.0%, 1745) | 2.9e-3 (0.0%, 22208) | 3.7752 | 1.3e-3 | 5.3e-4 |
| neptune | 24523 | 0.0349 | 1.6e-3 | 4.8e-4 | 1.5e-4 | 0.0349 (0.0%, 50) | 1.8e-3 (0.0%, 484) | 2.6e-3 (0.0%, 1717) | 3.0e-3 (0.0%, 22272) | 0.2255 | 2.0e-3 | 5.7e-4 |
| pluto | 24523 | 2.6e-3 | 1.6e-3 | 4.8e-4 | 1.7e-4 | 1.2e-3 (0.0%, 5) | 1.8e-3 (0.0%, 90) | 2.5e-3 (0.0%, 1309) | 2.6e-3 (0.0%, 23119) | 0.0264 | 0.0194 | 4.4e-3 |
| chiron | 24523 | 0.9343 | 0.7696 | 0.1603 | 0.0159 | 0.3758 (75.0%, 12) | 0.7427 (83.7%, 208) | 0.7438 (76.3%, 1927) | 0.9343 (77.0%, 22376) | 0.0491 | 5.8e-3 | 1.4e-3 |
| trueNode | 24523 | 0.1550 | 0.0256 | 4.6e-3 | 1.7e-4 | - | - | - | - | 1.2061 | 0.1360 | 9.8e-3 |

### 2. Longitude, end-to-end from UTC, random set by era (max / p99, arcsec)

| body | 1899-1971 | 1972-2022 | 2023-2026 | 2027-2049 | 2050-2100 |
| --- | --- | --- | --- | --- | --- |
| sun | 6.4e-3 / 4.4e-3 | 3.3e-3 / 2.1e-3 | 2.1e-3 / 1.9e-3 | 0.2298 / 0.2179 | 1.0366 / 1.0039 |
| moon | 0.0773 / 0.0515 | 3.9e-3 / 3.1e-3 | 4.0e-3 / 3.3e-3 | 3.3666 / 3.0658 | 15.4512 / 14.3360 |
| mercury | 0.0149 / 6.2e-3 | 3.3e-3 / 2.3e-3 | 2.3e-3 / 2.2e-3 | 0.4770 / 0.4132 | 2.1406 / 1.8760 |
| venus | 9.2e-3 / 6.0e-3 | 7.9e-3 / 3.9e-3 | 0.0733 / 5.8e-3 | 0.2834 / 0.2721 | 1.2782 / 1.2258 |
| mars | 0.0645 / 3.2e-3 | 4.5e-3 / 2.8e-3 | 0.0156 / 1.9e-3 | 0.1586 / 0.1537 | 0.7171 / 0.6894 |
| jupiter | 9.4e-3 / 1.8e-3 | 0.0239 / 1.6e-3 | 1.9e-3 / 1.3e-3 | 0.0505 / 0.0478 | 0.2221 / 0.2120 |
| saturn | 0.0223 / 1.8e-3 | 2.8e-3 / 1.7e-3 | 1.8e-3 / 1.4e-3 | 0.0259 / 0.0236 | 0.1239 / 0.1175 |
| uranus | 2.8e-3 / 1.7e-3 | 0.1027 / 1.6e-3 | 1.6e-3 / 1.3e-3 | 0.0141 / 0.0126 | 0.0578 / 0.0527 |
| neptune | 3.0e-3 / 1.8e-3 | 0.0349 / 1.6e-3 | 1.7e-3 / 1.3e-3 | 8.6e-3 / 7.3e-3 | 0.0379 / 0.0343 |
| pluto | 2.6e-3 / 1.7e-3 | 2.4e-3 / 1.6e-3 | 1.8e-3 / 1.5e-3 | 6.2e-3 / 5.8e-3 | 0.0234 / 0.0211 |
| chiron | 0.6851 / 0.6010 | 0.0783 / 0.0756 | 0.0137 / 0.0135 | 0.4905 / 0.4762 | 0.8794 / 0.8696 |
| trueNode | 0.1519 / 0.0258 | 0.1550 / 0.0237 | 0.0829 / 0.0251 | 0.1666 / 0.0422 | 0.2394 / 0.1797 |

Speed, end-to-end, random set, max / p99 (arcsec/day):

| body | 1899-1971 | 1972-2022 | 2023-2026 | 2027-2049 | 2050-2100 |
| --- | --- | --- | --- | --- | --- |
| sun | 3.1e-3 / 2.5e-3 | 3.1e-3 / 2.6e-3 | 3.1e-3 / 2.7e-3 | 3.0e-3 / 2.5e-3 | 3.4e-3 / 2.7e-3 |
| moon | 0.2752 / 0.2558 | 0.2763 / 0.2568 | 0.2591 / 0.2543 | 0.3212 / 0.2745 | 0.6946 / 0.5718 |
| mercury | 0.1540 / 0.0292 | 0.0310 / 0.0288 | 0.0311 / 0.0300 | 4.6588 / 0.0312 | 0.1890 / 0.1391 |
| venus | 0.0111 / 6.9e-3 | 0.0102 / 6.8e-3 | 0.3561 / 7.9e-3 | 0.0584 / 8.3e-3 | 0.0474 / 0.0333 |
| mars | 0.4621 / 3.4e-3 | 7.6e-3 / 3.2e-3 | 0.0583 / 3.0e-3 | 6.1e-3 / 3.7e-3 | 1.2265 / 0.0114 |
| jupiter | 0.0795 / 1.7e-3 | 0.4306 / 1.7e-3 | 1.9e-3 / 1.5e-3 | 2.2e-3 / 1.8e-3 | 0.0219 / 3.4e-3 |
| saturn | 0.4436 / 2.8e-3 | 0.0752 / 2.6e-3 | 4.5e-3 / 3.6e-3 | 3.7e-3 / 2.8e-3 | 4.8e-3 / 3.4e-3 |
| uranus | 0.1489 / 1.3e-3 | 3.7752 / 1.3e-3 | 2.3e-3 / 1.1e-3 | 6.4e-3 / 1.3e-3 | 2.4e-3 / 1.5e-3 |
| neptune | 3.1e-3 / 2.2e-3 | 0.2255 / 1.4e-3 | 2.6e-3 / 2.4e-3 | 2.8e-3 / 2.2e-3 | 3.3e-3 / 1.5e-3 |
| pluto | 0.0240 / 0.0180 | 0.0251 / 0.0189 | 4.0e-3 / 3.6e-3 | 0.0182 / 0.0138 | 0.0262 / 0.0217 |
| chiron | 7.6e-3 / 5.7e-3 | 0.0491 / 5.8e-3 | 3.4e-3 / 2.1e-3 | 8.2e-3 / 5.8e-3 | 8.2e-3 / 6.2e-3 |
| trueNode | 1.1767 / 0.1418 | 1.2061 / 0.1097 | 0.7643 / 0.1099 | 0.8658 / 0.1461 | 1.0735 / 0.1342 |

### 3. Sign and Human Design line mismatches

Count of instants where the zodiac sign (30 deg) or the HD line (0.9375 deg, from 302 deg) differs. Expected count ~ n * 2|diff| / width.

| body | e2e sign (all sets) | e2e HD line 1899-1971 | e2e HD line 1972-2022 | e2e HD line 2023-2026 | e2e HD line 2027-2049 | e2e HD line 2050-2100 | e2e HD line edge sets | same-instant HD line (all sets) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| sun | 0 | 0 | 0 | 0 | 0 | 1 | 0 | 0 |
| moon | 0 | 0 | 0 | 0 | 1 | 12 | 1 | 0 |
| mercury | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| venus | 0 | 0 | 0 | 0 | 0 | 2 | 0 | 0 |
| mars | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| jupiter | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| saturn | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| uranus | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| neptune | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| pluto | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| chiron | 0 | 1 | 0 | 0 | 0 | 2 | 0 | 3 |
| trueNode | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |

Samples: 24523 (random by era: 1899-1971 7226, 1972-2022 5148, 2023-2026 431, 2027-2049 2246, 2050-2100 4949).

### 4. Houses

Asc / MC / worst of the 12 cusps (arcsec), max / p99 / mean.

| comparison | set | n | Asc | MC | cusps |
| --- | --- | --- | --- | --- | --- |
| same instant P | 1899-1971 | 7226 | 0.0112 / 2.2e-3 / 4.9e-4 | 2.2e-3 / 1.5e-3 / 4.3e-4 | 0.0112 / 2.7e-3 / 6.4e-4 |
| same instant P | 1972-2022 | 5148 | 0.0111 / 2.7e-3 / 5.1e-4 | 1.9e-3 / 1.4e-3 / 4.0e-4 | 0.0111 / 3.0e-3 / 6.7e-4 |
| same instant P | 2023-2026 | 431 | 4.5e-3 / 2.4e-3 / 4.8e-4 | 1.7e-3 / 1.4e-3 / 3.4e-4 | 4.5e-3 / 2.8e-3 / 6.3e-4 |
| same instant P | 2027-2049 | 2246 | 8.1e-3 / 3.2e-3 / 5.4e-4 | 2.0e-3 / 1.4e-3 / 4.1e-4 | 8.1e-3 / 3.4e-3 / 7.0e-4 |
| same instant P | 2050-2100 | 4949 | 35.5829 / 5.5459 / 1.8828 | 2.0812 / 2.0758 / 1.8698 | 35.5829 / 5.5459 / 2.3119 |
| same instant P | leapSecond | 216 | 5.9e-3 / 3.3e-3 / 5.8e-4 | 1.2e-3 / 1.0e-3 / 4.2e-4 | 5.9e-3 / 4.5e-3 / 7.2e-4 |
| same instant P | y1971_1972 | 307 | 3.6e-3 / 1.9e-3 / 2.7e-4 | 4.9e-4 / 4.7e-4 / 1.9e-4 | 3.6e-3 / 1.9e-3 / 3.6e-4 |
| same instant P | polarCircle | 492 | 0.0298 / 0.0159 / 1.2e-3 | 1.5e-3 / 1.3e-3 / 4.1e-4 | 0.0298 / 0.0159 / 2.2e-3 |
| same instant P | southern | 2000 | 4.2e-3 / 2.7e-3 / 5.0e-4 | 2.1e-3 / 1.4e-3 / 4.2e-4 | 4.2e-3 / 2.7e-3 / 6.5e-4 |
| same instant W | 1899-1971 | 7226 | 0.0112 / 2.2e-3 / 4.9e-4 | 2.2e-3 / 1.5e-3 / 4.3e-4 | 0 / 0 / 0 |
| same instant W | 1972-2022 | 5148 | 0.0111 / 2.7e-3 / 5.1e-4 | 1.9e-3 / 1.4e-3 / 4.0e-4 | 0 / 0 / 0 |
| same instant W | 2023-2026 | 431 | 4.5e-3 / 2.4e-3 / 4.8e-4 | 1.7e-3 / 1.4e-3 / 3.4e-4 | 0 / 0 / 0 |
| same instant W | 2027-2049 | 2246 | 8.1e-3 / 3.2e-3 / 5.4e-4 | 2.0e-3 / 1.4e-3 / 4.1e-4 | 0 / 0 / 0 |
| same instant W | 2050-2100 | 4949 | 35.5829 / 5.5459 / 1.8828 | 2.0812 / 2.0758 / 1.8698 | 0 / 0 / 0 |
| same instant W | leapSecond | 216 | 5.9e-3 / 3.3e-3 / 5.8e-4 | 1.2e-3 / 1.0e-3 / 4.2e-4 | 0 / 0 / 0 |
| same instant W | y1971_1972 | 307 | 3.6e-3 / 1.9e-3 / 2.7e-4 | 4.9e-4 / 4.7e-4 / 1.9e-4 | 0 / 0 / 0 |
| same instant W | polar | 1000 | 0.0318 / 4.4e-3 / 4.6e-4 | 1.6e-3 / 1.3e-3 / 4.1e-4 | 0 / 0 / 0 |
| same instant W | polarCircle | 1000 | 0.0532 / 0.0190 / 1.2e-3 | 2.1e-3 / 1.4e-3 / 4.1e-4 | 0 / 0 / 0 |
| same instant W | southern | 2000 | 4.2e-3 / 2.7e-3 / 5.0e-4 | 2.1e-3 / 1.4e-3 / 4.2e-4 | 0 / 0 / 0 |
| end-to-end P | 1899-1971 | 7226 | 0.0112 / 2.2e-3 / 4.9e-4 | 2.2e-3 / 1.5e-3 / 4.3e-4 | 0.0112 / 2.7e-3 / 6.4e-4 |
| end-to-end P | 1972-2022 | 5148 | 5.2363 / 1.0486 / 0.2309 | 1.0610 / 0.8990 / 0.2308 | 5.2363 / 1.2549 / 0.2842 |
| end-to-end P | 2023-2026 | 431 | 19.4215 / 9.7455 / 2.6301 | 7.9011 / 7.3518 / 2.6438 | 19.4215 / 11.9262 / 3.2725 |
| end-to-end P | 2027-2049 | 2246 | 421.5842 / 124.0614 / 31.7883 | 84.3581 / 78.8981 / 31.6284 | 421.5842 / 142.0164 / 39.4285 |
| end-to-end P | 2050-2100 | 4949 | 4130.6217 / 953.6200 / 270.2100 | 579.5054 / 549.3371 / 267.6491 | 4130.6217 / 1040.9500 / 330.9535 |
| end-to-end P | leapSecond | 216 | 1.9035 / 0.9751 / 0.1777 | 0.7746 / 0.7529 / 0.1687 | 1.9035 / 1.0590 / 0.2107 |
| end-to-end P | y1971_1972 | 307 | 0.0195 / 0.0153 / 3.9e-3 | 9.1e-3 / 8.6e-3 / 4.0e-3 | 0.0216 / 0.0189 / 4.8e-3 |
| end-to-end P | polarCircle | 492 | 266.6067 / 35.9235 / 2.8758 | 78.5822 / 68.3692 / 4.5185 | 266.6067 / 157.1390 / 8.2458 |
| end-to-end P | southern | 2000 | 256.2054 / 71.1516 / 5.1890 | 84.1609 / 70.6779 / 5.2976 | 256.2054 / 83.7887 / 6.4385 |
| end-to-end W | 1899-1971 | 7226 | 0.0112 / 2.2e-3 / 4.9e-4 | 2.2e-3 / 1.5e-3 / 4.3e-4 | 0 / 0 / 0 |
| end-to-end W | 1972-2022 | 5148 | 5.2363 / 1.0486 / 0.2309 | 1.0610 / 0.8990 / 0.2308 | 0 / 0 / 0 |
| end-to-end W | 2023-2026 | 431 | 19.4215 / 9.7455 / 2.6301 | 7.9011 / 7.3518 / 2.6438 | 0 / 0 / 0 |
| end-to-end W | 2027-2049 | 2246 | 421.5842 / 124.0614 / 31.7883 | 84.3581 / 78.8981 / 31.6284 | 0 / 0 / 0 |
| end-to-end W | 2050-2100 | 4949 | 4130.6217 / 953.6200 / 270.2100 | 579.5054 / 549.3371 / 267.6491 | 108000.0000 / 0 / 283.6937 |
| end-to-end W | leapSecond | 216 | 1.9035 / 0.9751 / 0.1777 | 0.7746 / 0.7529 / 0.1687 | 0 / 0 / 0 |
| end-to-end W | y1971_1972 | 307 | 0.0195 / 0.0153 / 3.9e-3 | 9.1e-3 / 8.6e-3 / 4.0e-3 | 0 / 0 / 0 |
| end-to-end W | polar | 1000 | 230.0409 / 35.3400 / 1.8498 | 84.8714 / 69.5711 / 4.7854 | 0 / 0 / 0 |
| end-to-end W | polarCircle | 1000 | 266.6067 / 34.2518 / 2.5238 | 78.5822 / 67.7455 / 4.4745 | 0 / 0 / 0 |
| end-to-end W | southern | 2000 | 256.2054 / 71.1516 / 5.1890 | 84.1609 / 70.6779 / 5.2976 | 0 / 0 / 0 |

Placidus failure flags (oracle flag ERR vs engine error PLACIDUS_POLAR):

| comparison | case | count |
| --- | --- | --- |
| end-to-end | 1899-1971 placidus: oracle OK / engine OK | 7226 |
| end-to-end | 1972-2022 placidus: oracle OK / engine OK | 5148 |
| end-to-end | 2023-2026 placidus: oracle OK / engine OK | 431 |
| end-to-end | 2027-2049 placidus: oracle OK / engine OK | 2246 |
| end-to-end | 2050-2100 placidus: oracle OK / engine OK | 4949 |
| end-to-end | leapSecond placidus: oracle OK / engine OK | 216 |
| end-to-end | polar placidus: oracle ERR / engine PLACIDUS_POLAR | 1000 |
| end-to-end | polarCircle placidus: oracle ERR / engine PLACIDUS_POLAR | 508 |
| end-to-end | polarCircle placidus: oracle OK / engine OK | 492 |
| end-to-end | southern placidus: oracle OK / engine OK | 2000 |
| end-to-end | y1971_1972 placidus: oracle OK / engine OK | 307 |
| same instant | 1899-1971 placidus: oracle OK / engine OK | 7226 |
| same instant | 1972-2022 placidus: oracle OK / engine OK | 5148 |
| same instant | 2023-2026 placidus: oracle OK / engine OK | 431 |
| same instant | 2027-2049 placidus: oracle OK / engine OK | 2246 |
| same instant | 2050-2100 placidus: oracle OK / engine OK | 4949 |
| same instant | leapSecond placidus: oracle OK / engine OK | 216 |
| same instant | polar placidus: oracle ERR / engine PLACIDUS_POLAR | 1000 |
| same instant | polarCircle placidus: oracle ERR / engine PLACIDUS_POLAR | 508 |
| same instant | polarCircle placidus: oracle OK / engine OK | 492 |
| same instant | southern placidus: oracle OK / engine OK | 2000 |
| same instant | y1971_1972 placidus: oracle OK / engine OK | 307 |

Placidus failure disagreements: **0**. Whole Sign cusp sign mismatches: 13.

### 5. Time conversion (utcToJd vs swe.utc_to_jd)

| set | n | jdUT1 max | jdUT1 p99 | jdUT1 mean | jdTT max | jdTT p99 | jdTT mean |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1899-1971 | 7226 | 0 | 0 | 0 | 0.1313 | 0.0945 | 0.0106 |
| 1972-2022 | 5148 | 0.0651 | 0.0583 | 0.0153 | 4.0e-5 | 4.0e-5 | 9.4e-6 |
| 2023-2026 | 431 | 0.4977 | 0.4848 | 0.1764 | 4.0e-5 | 4.0e-5 | 1.3e-5 |
| 2027-2049 | 2246 | 5.2269 | 5.1360 | 2.1103 | 5.3958 | 5.3181 | 2.1995 |
| 2050-2100 | 4949 | 35.5138 | 35.0549 | 17.9178 | 24.4486 | 24.1950 | 13.9855 |
| leapSecond | 216 | 0.0474 | 0.0474 | 0.0112 | 4.0e-5 | 4.0e-5 | 9.5e-6 |
| y1971_1972 | 307 | 5.6e-4 | 5.6e-4 | 2.6e-4 | 9.3e-4 | 8.9e-4 | 1.9e-4 |
| polar | 1000 | 5.1797 | 4.5573 | 0.3172 | 5.3558 | 4.8112 | 0.3221 |
| polarCircle | 1000 | 4.9072 | 4.3970 | 0.2963 | 5.1200 | 4.6680 | 0.3007 |
| southern | 2000 | 5.2085 | 4.7874 | 0.3541 | 5.3805 | 5.0151 | 0.3636 |

### 6. Performance (this machine, warm, single thread)

| operation | engine | sweph |
| --- | --- | --- |
| position() per body | 0.117 us (8.51 M/s) | 17.651 us (0.06 M/s) |
| positionTT() per body | 0.110 us (9.07 M/s) | - |
| houses P | 3.69 us | 10.07 us |
| full chart: 12 bodies + houses P | 5.52 us | 79.05 us |
| cold require (fresh process) | 9.4 ms | - |
| first evaluation: manifest + 14 tables + sha256 | 7.1 ms | - |

Comparison run: 3.9 s for 24523 instants.

*Note added for publication:* "position() per body" calls each library with a new date on every
call, the most favourable case for Zodiacally Ephemeris; the full-chart row is the representative
one. The cold-start rows measure only the engine; the current cold-start comparison, in which the
Swiss Ephemeris starts faster, is in the [benchmark](../benchmark/README.md).

### 7. Known causes of the larger differences

- **Superior solar conjunctions** (elongation columns of section 1): near the Sun the solar light deflection (up to 1.75" at the limb) changes within hours. Since data format 2 (engine 1.1.0) the builder replaces every 16-day record that one polynomial cannot fit to 0.5 mas by halved sub-records (tools/ephemeris-build/build.py `refine_solar_conjunctions`, `<name>.refined.bin`), so the tables follow the directly computed positions to about 0.5 mas there too (manifest `maxFitErrorArcsec`). What remains next to and behind the Sun is the difference between the two deflection models (the engine uses the enclosed mass of an n=3 polytrope for rays behind the solar disc).
- **End-to-end houses 1972-2022**: UT1 differs by up to 0.065 s (engine DeltaT from IERS EOP C04 vs the oracle's built-in DeltaT), i.e. ~1" of ARMC/MC and up to ~5" of Ascendant at high latitude; at the oracle's own UT1 the houses agree to 0.01".
- **Chiron**: the engine uses JPL orbit solution JPL#171 (Horizons), the oracle a different orbit solution; the difference grows from ~0.003" around 2019 to ~0.8" at the ends of the range.
- **End-to-end after 2023**: DeltaT models differ (engine: IERS EOP/Bulletin A then the Stephenson-Morrison-Hohenkerk 2016 parabola; oracle: its own extrapolation), up to ~0.5 s of UT1 in 2023-2026; houses depend on UT1. From 2027 the future UTC conventions differ as well: the engine keeps TAI-UTC = 37 s for all future dates (no further leap seconds; CGPM 2022 Resolution 4), so JD TT = UTC + 69.184 s and only UT1 follows the Delta T prediction, while the oracle maps future UTC to its own Delta T. Section 5 shows the result (several seconds by 2049, tens of seconds by 2100: Moon up to ~15", Ascendant up to arcminutes); a deliberate design decision of 2026-10-03.
- **Houses from 2050**: the oracle switches its sidereal-time model at JD 2469807.5 (2050-01-01), a jump of ~1.9" in ARMC; the engine stays with IAU 2006 GMST + IAU 2000A equation of the equinoxes.
- **Speeds**: the engine returns the exact derivative of the table polynomial; the oracle computes its speed differently (largest for the Moon and the true node).


<!-- review-engine.mjs -->
### Second internal run (review-engine.mjs)

Generated by `node tools/swiss-oracle/review-engine.mjs 50000 914 2000` on 2026-10-03 (Node v25.8.2). Different generator and seed from section 1-7, 55205 UTC instants (random 50000, design1899 2000, leapSecond 378, endOfDay 2000, y1971_1972 425, coverageUT1 402) and 28602 TT instants (boundary 28000, coverageTT 602); every instant: 12 bodies (longitude + speed) and, for UTC instants, houses P and W at a latitude mix of 70 % |lat| < 66, 10 % 66.4-66.6, 15 % polar, 5 % > 89.9. Runtime 14 s. Engine data de440s-chironJPL#171-05b57b83e52c.

### R1. Longitude, same instant (arcsec): max / p99, bias

| body | all sets | bias | record boundaries | coverage ends (TT) | elong 0-1 | 1-4 | 4-16 | 16-180 | speed max / p99 ("/d) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| sun | 3.4e-3 / 2.1e-3 | 1.5e-4 | 3.3e-3 / 2.2e-3 | 8.3e-4 / 5.8e-4 | - | - | - | - | 3.9e-3 / 2.5e-3 |
| moon | 8.9e-3 / 6.4e-3 | -1.5e-3 | 8.4e-3 / 6.4e-3 | 6.5e-3 / 6.5e-3 | - | - | - | - | 0.2777 / 0.2560 |
| mercury | 0.0772 / 2.4e-3 | 1.6e-4 | 5.9e-3 / 2.4e-3 | 9.4e-4 / 9.1e-4 | 0.0772 / 0.0105 | 4.2e-3 / 2.2e-3 | 3.8e-3 / 2.4e-3 | 3.4e-3 / 2.4e-3 | 2.5440 / 0.0291 |
| venus | 0.0131 / 4.2e-3 | 1.5e-4 | 8.3e-3 / 4.2e-3 | 2.4e-3 / 2.3e-3 | 0.0131 / 3.4e-3 | 5.8e-3 / 2.4e-3 | 9.1e-3 / 5.8e-3 | 8.3e-3 / 4.0e-3 | 0.0804 / 6.8e-3 |
| mars | 0.1709 / 2.8e-3 | 1.6e-4 | 5.1e-3 / 2.8e-3 | 8.5e-4 / 8.5e-4 | 0.1709 / 0.0236 | 2.3e-3 / 1.8e-3 | 3.3e-3 / 1.6e-3 | 5.2e-3 / 2.9e-3 | 0.5614 / 3.3e-3 |
| jupiter | 0.5535 / 1.6e-3 | 1.4e-4 | 2.3e-3 / 1.6e-3 | 1.5e-4 / 1.4e-4 | 0.5535 / 0.0310 | 3.2e-3 / 1.6e-3 | 2.5e-3 / 1.6e-3 | 2.9e-3 / 1.7e-3 | 7.0826 / 1.7e-3 |
| saturn | 0.0118 / 1.7e-3 | 1.3e-4 | 0.0118 / 1.7e-3 | 6.5e-4 / 6.4e-4 | 0.0118 / 0.0116 | 2.0e-3 / 1.5e-3 | 2.7e-3 / 1.8e-3 | 3.9e-3 / 1.7e-3 | 0.3227 / 2.8e-3 |
| uranus | 0.5480 / 1.6e-3 | 1.8e-4 | 2.8e-3 / 1.5e-3 | 5.7e-4 / 5.6e-4 | 0.5480 / 0.0418 | 1.8e-3 / 1.4e-3 | 2.2e-3 / 1.5e-3 | 3.2e-3 / 1.6e-3 | 9.7334 / 1.3e-3 |
| neptune | 0.0414 / 1.6e-3 | 1.4e-4 | 2.4e-3 / 1.6e-3 | 3.4e-4 / 3.3e-4 | 0.0414 / 0.0303 | 2.2e-3 / 1.5e-3 | 2.3e-3 / 1.7e-3 | 3.2e-3 / 1.6e-3 | 2.0658 / 2.0e-3 |
| pluto | 0.0164 / 1.6e-3 | 1.6e-4 | 2.8e-3 / 1.5e-3 | 4.2e-4 / 4.2e-4 | 0.0164 / 0.0164 | 1.8e-3 / 1.3e-3 | 2.8e-3 / 1.6e-3 | 2.9e-3 / 1.6e-3 | 0.3273 / 0.0200 |
| chiron | 0.9349 / 0.7830 | 0.0176 | 0.9337 / 0.7915 | 0.6603 / 0.6603 | 0.7224 / 0.7224 | 0.7427 / 0.7414 | 0.7449 / 0.7213 | 0.9349 / 0.7943 | 0.3698 / 5.9e-3 |
| trueNode | 0.2616 / 0.0254 | -2.5e-5 | 0.2151 / 0.0245 | 9.9e-3 / 9.8e-3 | - | - | - | - | 91.0598 / 0.1341 |

delta-psi at record boundaries: 2.1e-3 / 1.4e-3", true obliquity: 1.4e-3 / 9.1e-4" (max / p99, vs SE_ECL_NUT). Engine self-consistency across sampled record boundaries (value jump minus speed x 2^-30 d), max over bodies: 6.2e-9".

### R2. Longitude end-to-end from UTC (arcsec), max / p99

| body | 1899-1971 | 1972-2022 | 2023-2026 | 2027-2049 | 2050-2100 | design1899 | leapSecond | endOfDay | y1971_1972 | coverageUT1 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| sun | 6.5e-3 / 4.6e-3 | 2.9e-3 / 2.0e-3 | 2.7e-3 / 1.9e-3 | 0.2300 / 0.2186 | 1.0393 / 1.0073 | 1.8e-3 / 1.8e-3 | 2.0e-3 / 2.0e-3 | 0.2270 / 0.2094 | 1.5e-3 / 1.4e-3 | 1.0386 / 1.0386 |
| moon | 0.0776 / 0.0537 | 4.1e-3 / 3.1e-3 | 4.0e-3 / 3.4e-3 | 3.3538 / 3.1434 | 15.5813 / 14.3011 | 0.0199 / 0.0195 | 2.7e-3 / 2.7e-3 | 3.2748 / 2.7891 | 2.8e-3 / 2.5e-3 | 12.5949 / 12.5905 |
| mercury | 0.0521 / 6.1e-3 | 0.0772 / 2.3e-3 | 2.5e-3 / 2.1e-3 | 0.4774 / 0.4238 | 2.1408 / 1.9095 | 2.6e-3 / 2.5e-3 | 2.7e-3 / 2.7e-3 | 0.4768 / 0.3241 | 1.3e-3 / 1.3e-3 | 0.2096 / 0.2082 |
| venus | 9.1e-3 / 6.1e-3 | 0.0131 / 3.9e-3 | 7.8e-3 / 3.8e-3 | 0.2836 / 0.2744 | 1.2801 / 1.2268 | 1.9e-3 / 1.9e-3 | 4.0e-3 / 4.0e-3 | 0.2817 / 0.2437 | 8.9e-4 / 8.8e-4 | 1.2813 / 1.2813 |
| mars | 0.0152 / 3.2e-3 | 0.1709 / 3.0e-3 | 0.0189 / 1.9e-3 | 0.1593 / 0.1556 | 0.7239 / 0.6883 | 1.6e-3 / 1.6e-3 | 1.8e-3 / 1.8e-3 | 0.1580 / 0.1425 | 8.1e-4 / 8.0e-4 | 0.7340 / 0.7340 |
| jupiter | 0.0309 / 1.9e-3 | 2.9e-3 / 1.5e-3 | 2.0e-3 / 1.7e-3 | 0.5535 / 0.0482 | 0.2221 / 0.2130 | 1.5e-3 / 1.3e-3 | 1.3e-3 / 1.3e-3 | 0.0500 / 0.0391 | 8.5e-4 / 8.3e-4 | 0.1508 / 0.1508 |
| saturn | 4.0e-3 / 1.8e-3 | 2.7e-3 / 1.7e-3 | 2.0e-3 / 1.5e-3 | 0.0265 / 0.0238 | 0.1243 / 0.1174 | 1.5e-3 / 1.4e-3 | 1.4e-3 / 1.4e-3 | 0.0255 / 0.0191 | 9.2e-4 / 9.0e-4 | 0.0592 / 0.0591 |
| uranus | 0.0494 / 1.8e-3 | 2.6e-3 / 1.5e-3 | 8.8e-3 / 1.4e-3 | 0.0140 / 0.0128 | 0.5236 / 0.0523 | 0.0840 / 9.9e-4 | 1.2e-3 / 1.2e-3 | 0.0142 / 0.0101 | 8.3e-4 / 8.2e-4 | 0.0129 / 0.0129 |
| neptune | 0.0233 / 1.8e-3 | 0.0414 / 1.4e-3 | 1.8e-3 / 1.5e-3 | 8.8e-3 / 7.6e-3 | 0.0386 / 0.0345 | 1.3e-3 / 1.2e-3 | 1.1e-3 / 1.1e-3 | 8.4e-3 / 5.7e-3 | 9.0e-4 / 8.8e-4 | 0.0127 / 0.0126 |
| pluto | 2.9e-3 / 1.7e-3 | 0.0164 / 1.5e-3 | 1.8e-3 / 1.5e-3 | 7.3e-3 / 5.7e-3 | 0.0240 / 0.0211 | 1.0e-3 / 9.8e-4 | 1.6e-3 / 1.6e-3 | 6.6e-3 / 4.6e-3 | 7.5e-4 / 7.3e-4 | 1.2e-3 / 1.2e-3 |
| chiron | 0.6856 / 0.6100 | 0.0778 / 0.0753 | 0.0136 / 0.0134 | 0.4905 / 0.4809 | 0.8797 / 0.8708 | 0.6752 / 0.6742 | 0.0736 / 0.0736 | 0.6840 / 0.5497 | 0.0766 / 0.0765 | 0.6602 / 0.6602 |
| trueNode | 0.1439 / 0.0247 | 0.1612 / 0.0248 | 0.0825 / 0.0310 | 0.1189 / 0.0427 | 0.2523 / 0.1767 | 0.2616 / 0.0425 | 0.0325 / 0.0325 | 0.0690 / 0.0348 | 0.0304 / 0.0121 | 0.1278 / 0.1278 |

Sign mismatches end-to-end (all bodies, all UTC sets): 4.

### R3. Speed sign (retrograde flag)

| body | random-instant flag mismatches (e2e / same) | stations found | station time engine - oracle (s): max / p99 / median | flag mismatches within +-1 h of stations (oracle speed spikes) | max |speed| at a non-spike mismatch ("/d) |
| --- | --- | --- | --- | --- | --- |
| mercury | 0 / 0 | 1272 | 1.1861 / 0.9421 / 0.1226 | 0 of 5088 (0) | 0 |
| venus | 0 / 0 | 252 | 5.1997 / 3.9754 / 0.6865 | 0 of 1008 (0) | 0 |
| mars | 0 / 0 | 189 | 12.2634 / 11.6042 / 1.1983 | 0 of 756 (0) | 0 |
| jupiter | 0 / 0 | 370 | 17.0978 / 12.9605 / 2.4690 | 0 of 1480 (0) | 0 |
| saturn | 0 / 0 | 390 | 44.1641 / 39.9097 / 6.0990 | 0 of 1560 (0) | 0 |
| uranus | 0 / 0 | 400 | 46.5459 / 31.2959 / 7.5352 | 1 of 1600 (0) | 6.5e-4 |
| neptune | 0 / 0 | 402 | 104.0284 / 83.1477 / 14.7907 | 2 of 1608 (0) | 1.8e-3 |
| pluto | 0 / 0 | 402 | 1415.5861 / 1044.1409 / 136.4261 | 50 of 1608 (0) | 0.0164 |
| chiron | 0 / 0 | 396 | 172.7485 / 142.5647 / 19.4197 | 8 of 1584 (0) | 4.9e-3 |
| trueNode | 2 / 2 | 10700 (452 not bracketed by the oracle within +-0.5 d) | 5966.8685 / 321.3929 / 0.9608 | 126 of 40992 (0) | 0.5768 |

Random-instant mismatches are reported with the larger |speed| of the two sides in the worst-case list below. True node: the oracle's node has jumps of up to ~0.3" with speed spikes of up to ~1100"/d at isolated instants, observed from the outside (engine smooth, speed = its numeric derivative), which moves its stations by up to hours; mismatches there are counted as spikes.

### R4. Houses (arcsec), max / p99

| comparison | 1899-1971 | 1972-2022 | 2023-2026 | 2027-2049 | 2050-2100 | design1899 | leapSecond | endOfDay | y1971_1972 | coverageUT1 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| same UT1 P asc | 0.6595 / 3.4e-3 | 0.4329 / 3.9e-3 | 0.0251 / 4.5e-3 | 0.0712 / 5.1e-3 | 1187.5253 / 5.1117 | 0.0686 / 1.9e-3 | 7.8e-3 / 7.0e-3 | 0.0312 / 4.0e-3 | 0.1002 / 2.1e-3 | 7.5602 / 3.9001 |
| same UT1 P mc | 2.5e-3 / 1.5e-3 | 2.5e-3 / 1.3e-3 | 1.7e-3 / 1.5e-3 | 2.5e-3 / 1.4e-3 | 2.0815 / 2.0764 | 1.0e-3 / 8.5e-4 | 1.2e-3 / 1.2e-3 | 2.3e-3 / 1.4e-3 | 7.6e-4 / 6.2e-4 | 1.9472 / 1.9471 |
| same UT1 P cusps | 0.6595 / 5.3e-3 | 0.4329 / 5.9e-3 | 0.0251 / 4.8e-3 | 0.0712 / 7.3e-3 | 1187.5253 / 6.0436 | 0.0686 / 4.1e-3 | 7.9e-3 / 7.6e-3 | 0.0312 / 5.7e-3 | 0.1002 / 3.2e-3 | 7.5602 / 5.4723 |
| same UT1 W asc | 0.6595 / 3.6e-3 | 0.6729 / 4.2e-3 | 0.0542 / 4.5e-3 | 0.1389 / 5.1e-3 | 1187.5253 / 5.0538 | 0.0686 / 2.3e-3 | 7.8e-3 / 6.1e-3 | 0.0312 / 3.8e-3 | 0.1002 / 2.2e-3 | 7.5602 / 3.9001 |
| same UT1 W cusps | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 108000.0000 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 |
| end-to-end P asc | 0.6595 / 3.4e-3 | 27.7020 / 1.0243 | 90.0481 / 11.3701 | 754.8495 / 118.8470 | 154754.3773 / 902.2144 | 0.0686 / 1.9e-3 | 1.4276 / 1.0065 | 205.4940 / 81.9098 | 0.1002 / 0.0549 | 2418.4331 / 1162.3572 |
| end-to-end P mc | 2.5e-3 / 1.5e-3 | 1.0418 / 0.8796 | 8.2303 / 7.3892 | 85.3890 / 80.4898 | 580.4514 / 549.9782 | 1.0e-3 / 8.5e-4 | 0.7765 / 0.7679 | 81.4541 / 71.9954 | 0.0388 / 0.0360 | 581.0896 / 581.0681 |
| end-to-end P cusps | 0.6595 / 5.3e-3 | 27.7020 / 1.5004 | 90.0481 / 12.4644 | 754.8495 / 175.0656 | 154754.3773 / 1311.7356 | 0.0686 / 4.1e-3 | 1.5723 / 1.4276 | 245.9397 / 97.6603 | 0.1002 / 0.0554 | 2418.4331 / 1632.6890 |
| end-to-end W asc | 0.6595 / 3.6e-3 | 27.7020 / 1.0006 | 90.0481 / 11.3701 | 754.8495 / 117.5755 | 647999.9756 / 888.1738 | 0.0686 / 2.3e-3 | 1.4276 / 1.0004 | 205.4940 / 76.4490 | 0.1002 / 0.0472 | 2418.4331 / 1097.5164 |
| end-to-end W cusps | 0 / 0 | 0 / 0 | 0 / 0 | 108000.0000 / 0 | 648000.0000 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 |

Same-UT1 outliers above ~0.02" are at |latitude| within ~0.05 deg of 90 - obliquity, where the Ascendant is singular and amplifies the ~0.001" obliquity/ARMC differences; from 2050 (and in coverageUT1, 2101) the oracle switches its sidereal-time model (~1.9" in ARMC), which the same singularity amplifies to up to about 0.33° (1,188″). End-to-end differences after 1972 come from UT1 (see R5).

Placidus failure flags (same + e2e): both fail 24218, both succeed 86190, disagreements **0**. Sign mismatches: same-UT1 Asc 2, cusps P 3, W 1; end-to-end Asc 77, cusps P 165, W 41.

### R5. Time

| set | jdUT1 max / p99 (s) | jdTT max / p99 (s) | round trip UTC->JD->UTC max (s) | jdUT1ToUtc vs jdut1_to_utc at the oracle UT1 max / p99 (s) |
| --- | --- | --- | --- | --- |
| 1899-1971 | 0 / 0 | 0.1315 / 0.0982 | 2.1e-5 | 0 / 0 |
| 1972-2022 | 0.0652 / 0.0582 | 4.0e-5 / 4.0e-5 | 2.1e-5 | 0.0652 / 0.0582 |
| 2023-2026 | 0.5021 / 0.4941 | 4.0e-5 / 4.0e-5 | 2.0e-5 | 0.5021 / 0.4940 |
| 2027-2049 | 5.2263 / 5.1456 | 5.3953 / 5.3261 | 2.1e-5 | 5.2263 / 5.1456 |
| 2050-2100 | 35.5357 / 35.1107 | 24.4607 / 24.2258 | 2.1e-5 | 35.5357 / 35.1107 |
| design1899 | 0 / 0 | 0.0153 / 0.0153 | 2.1e-5 | 0 / 0 |
| leapSecond | 0.0474 / 0.0474 | 4.0e-5 / 4.0e-5 | 2.1e-5 | 0.0474 / 0.0474 |
| endOfDay | 5.2003 / 4.8984 | 5.3736 / 5.1121 | 2.0e-5 | 5.2003 / 4.8984 |
| y1971_1972 | 2.4e-3 / 2.3e-3 | 3.3e-3 / 3.3e-3 | 0.0456 | 0.0460 / 2.3e-3 |
| coverageUT1 | 35.5686 / 35.5685 | 24.4788 / 24.4788 | 2.0e-5 | 35.5686 / 35.5685 |

Oracle quirk not counted above: at the first instant of an inserted leap second, jdut1_to_utc reports the next day's 00:00:00 (4 cases; the engine reports 23:59:60.0). y1971_1972 round trip: UT1 steps back by ~0.0455 s at 1972-01-01 (UTC is UT1 before), so 1971-12-31 23:59:59.954..23:59:59.999 maps to UT1 instants that jdUT1ToUtc reports as 1972-01-01 00:00:00.000..0.045 (the oracle's jdut1_to_utc does the same).

| UTC input | engine | oracle |
| --- | --- | --- |
| 1898-11-01T00:00:0.0000 | jdUT1 2414594.50000000 position EPHEMERIS_RANGE | jdUT1 2414594.50000000 |
| 1899-01-01T00:00:0.0000 | jdUT1 2414655.50000000 position EPHEMERIS_RANGE | jdUT1 2414655.50000000 |
| 1899-01-01T00:00:3.5000 | jdUT1 2414655.50004051 position ok | jdUT1 2414655.50004051 |
| 1800-01-01T00:00:0.0000 | throws EPHEMERIS_TIME_OUT_OF_RANGE | jdUT1 2378496.50000000 |
| 2101-01-14T00:00:0.0000 | jdUT1 2488447.49958833 position EPHEMERIS_RANGE | jdUT1 2488447.50000000 |
| 2101-06-01T00:00:0.0000 | throws EPHEMERIS_TIME_OUT_OF_RANGE | jdUT1 2488585.50000000 |
| 2016-12-31T23:59:60.5000 | jdUT1 2457754.50000106 position ok | jdUT1 2457754.50000105 |
| 2015-12-31T23:59:60.0000 | throws EPHEMERIS_TIME_OUT_OF_RANGE | ERR invalid time (no leap second!): 23:59:60.00 |
| 2016-12-30T23:59:60.0000 | throws EPHEMERIS_TIME_OUT_OF_RANGE | ERR invalid time (no leap second!): 23:59:60.00 |
| 1971-12-31T23:59:60.0000 | throws EPHEMERIS_TIME_OUT_OF_RANGE | ERR invalid time: 23:59:60.00 |

### R6. Human Design emulation (2000 births 1900-01-01 .. 2026-09-30, minute precision, 26 activations each)

A Human Design gate/line mapping (gates from 302°) evaluated with both libraries: birth JD UT1 from UTC, design moment by Newton on the Sun longitude (88 deg, |residual| < 1e-9 deg), 13 bodies per side. "end-to-end" uses each library's own UTC->UT1; "same birth UT1" starts the engine from the oracle's birth JD UT1 (ephemeris and design search only).

| births with any activation differing at level | gate | line | color | tone | base |
| --- | --- | --- | --- | --- | --- |
| end-to-end | 0 | 0 | 0 | 0 | 1 |
| same birth UT1 | 0 | 0 | 0 | 0 | 2 |
| end-to-end, births 1900-1949 (787) | 0 | 0 | 0 | 0 | 0 |
| end-to-end, births 1950-1955 (106) | 0 | 0 | 0 | 0 | 0 |
| end-to-end, births 1956-1971 (287) | 0 | 0 | 0 | 0 | 0 |
| end-to-end, births 1972-2026 (820) | 0 | 0 | 0 | 0 | 1 |

Births whose Human Design result differs (gate.line of any of the 26 activations, or color/tone of the Sun/Earth/node variables): end-to-end 0, same birth UT1 0 of 2000.

Design moment engine - oracle (s): end-to-end 0.3303 / 0.1448, same birth UT1 0.1172 / 0.0786 (max / p99). Formatted design UTC (rounded to the second) differs in 35 of 2000 births. Design search failures: engine 0, oracle 0.

| activation (end-to-end) | first differs at gate | first differs at line | first differs at color | first differs at tone | first differs at base |
| --- | --- | --- | --- | --- | --- |
| design Moon | 0 | 0 | 0 | 0 | 1 |

Non-finite values, unexpected throws, longitudes outside [0, 360): none.

Worst cases:

- e2e 1899-1971 P asc: -0.6595 at random 1963-09-26T22:59:58.9608 lat -66.554 lon 100.013
- e2e 1899-1971 P cusps: 0.6595 at random 1963-09-26T22:59:58.9608 lat -66.554 lon 100.013
- e2e 1899-1971 W asc: -0.6595 at random 1963-09-26T22:59:58.9608 lat -66.554 lon 100.013
- e2e 1899-1971 chiron lon: 0.6856 at random 1900-06-14T06:11:27.4364 lat 82.857 lon -145.547
- e2e 1899-1971 mercury lon: 0.0521 at random 1954-05-08T21:29:20.1645 lat 12.957 lon -73.818
- e2e 1899-1971 moon lon: 0.0776 at random 1952-04-16T18:49:47.4847 lat -66.519 lon -55.447
- e2e 1899-1971 trueNode lon: 0.1439 at random 1954-10-14T00:34:13.4936 lat -84.663 lon -143.390
- e2e 1972-2022 P asc: 27.7020 at random 2017-09-18T15:12:24.0753 lat -66.519 lon -136.038
- e2e 1972-2022 P cusps: 27.7020 at random 2017-09-18T15:12:24.0753 lat -66.519 lon -136.038
- e2e 1972-2022 W asc: 27.7020 at random 2017-09-18T15:12:24.0753 lat -66.519 lon -136.038
- e2e 1972-2022 chiron lon: 0.0778 at random 1972-10-23T22:25:50.4205 lat -61.392 lon 149.092
- e2e 1972-2022 mars lon: -0.1709 at random 1998-05-12T15:49:38.6424 lat -62.389 lon 55.013
- e2e 1972-2022 mercury lon: 0.0772 at random 1989-11-10T15:56:41.3356 lat 66.468 lon 168.227
- e2e 1972-2022 trueNode lon: 0.1612 at random 2017-07-20T09:48:10.9746 lat 45.461 lon -135.994
- e2e 2023-2026 P asc: -90.0481 at random 2025-03-27T17:55:51.7565 lat -66.466 lon -3.804
- e2e 2023-2026 P cusps: 90.0481 at random 2025-03-27T17:55:51.7565 lat -66.466 lon -3.804
- e2e 2023-2026 W asc: -90.0481 at random 2025-03-27T17:55:51.7565 lat -66.466 lon -3.804
- e2e 2023-2026 trueNode lon: 0.0825 at random 2026-04-20T17:31:50.1922 lat -53.378 lon -167.542
- e2e 2027-2049 P asc: -754.8495 at random 2037-10-27T10:31:13.2955 lat 66.519 lon 76.558
- e2e 2027-2049 P cusps: 754.8495 at random 2037-10-27T10:31:13.2955 lat 66.519 lon 76.558
- e2e 2027-2049 W asc: -754.8495 at random 2037-10-27T10:31:13.2955 lat 66.519 lon 76.558
- e2e 2027-2049 W cusps: 108000.0000 at random 2044-07-11T21:05:45.1012 lat 46.921 lon -116.402
- e2e 2027-2049 chiron lon: -0.4905 at random 2046-03-26T10:32:49.3830 lat -8.403 lon 51.186
- e2e 2027-2049 jupiter lon: 0.5535 at random 2032-01-01T08:47:49.6126 lat 56.685 lon 136.484
- e2e 2027-2049 mars lon: -0.1593 at random 2049-01-02T08:47:57.6145 lat 12.885 lon -5.734
- e2e 2027-2049 mercury lon: -0.4774 at random 2049-07-04T08:11:29.5509 lat -81.698 lon -107.497
- e2e 2027-2049 moon lon: -3.3538 at random 2049-07-15T10:54:8.5927 lat 12.187 lon -70.920
- e2e 2027-2049 sun lon: -0.2300 at random 2049-12-23T09:05:42.5958 lat -27.421 lon 150.283
- e2e 2027-2049 trueNode lon: -0.1189 at random 2046-12-21T14:28:27.9156 lat 76.699 lon -128.089
- e2e 2027-2049 venus lon: -0.2836 at random 2049-12-28T10:27:39.2822 lat 39.214 lon 36.111
- e2e 2050-2100 P asc: -154754.3773 at random 2077-09-20T18:03:47.9289 lat -66.535 lon 178.845
- e2e 2050-2100 P cusps: 154754.3773 at random 2077-09-20T18:03:47.9289 lat -66.535 lon 178.845
- e2e 2050-2100 W asc: -647999.9756 at random 2099-03-23T23:31:7.3648 lat 88.221 lon -178.634
- e2e 2050-2100 W cusps: 648000.0000 at random 2082-10-31T08:02:52.2585 lat -70.531 lon -106.083
- e2e 2050-2100 chiron lon: -0.8797 at random 2096-10-02T14:49:28.4936 lat 81.502 lon -123.459
- e2e 2050-2100 jupiter lon: -0.2221 at random 2100-10-24T08:00:51.8694 lat -4.405 lon -17.393
- e2e 2050-2100 mars lon: -0.7239 at random 2100-12-30T21:17:12.8008 lat 20.629 lon -60.515
- e2e 2050-2100 mercury lon: -2.1408 at random 2099-05-07T01:59:25.5272 lat 26.824 lon 118.546
- e2e 2050-2100 moon lon: -15.5813 at random 2100-11-02T00:34:16.1895 lat 30.272 lon -153.924
- e2e 2050-2100 saturn lon: -0.1243 at random 2100-10-24T08:00:51.8694 lat -4.405 lon -17.393
- e2e 2050-2100 sun lon: -1.0393 at random 2100-12-30T21:17:12.8008 lat 20.629 lon -60.515
- e2e 2050-2100 trueNode lon: 0.2523 at random 2100-11-17T06:26:41.7789 lat 89.962 lon 146.160
- e2e 2050-2100 uranus lon: 0.5236 at random 2068-12-06T07:21:19.4989 lat 5.809 lon -26.985
- e2e 2050-2100 venus lon: -1.2801 at random 2100-12-28T14:42:31.5872 lat 54.588 lon -52.430
- e2e coverageUT1 P asc: -2418.4331 at coverageUT1 2101-01-13T20:54:55.3280 lat 66.490 lon -155.155
- e2e coverageUT1 P cusps: 2418.4331 at coverageUT1 2101-01-13T20:54:55.3280 lat 66.490 lon -155.155
- e2e coverageUT1 W asc: -2418.4331 at coverageUT1 2101-01-13T20:54:55.3280 lat 66.490 lon -155.155
- e2e coverageUT1 chiron lon: 0.6602 at coverageUT1 1899-01-01T23:40:53.4160 lat -47.777 lon -89.141
- e2e coverageUT1 jupiter lon: -0.1508 at coverageUT1 2101-01-13T00:01:12.9650 lat -61.227 lon 5.983
- e2e coverageUT1 mars lon: -0.7340 at coverageUT1 2101-01-13T23:58:50.8140 lat 10.000 lon 10.000
- e2e coverageUT1 mercury lon: -0.2096 at coverageUT1 2101-01-13T00:01:12.9650 lat -61.227 lon 5.983
- e2e coverageUT1 moon lon: -12.5949 at coverageUT1 2101-01-13T23:58:50.8140 lat 10.000 lon 10.000
- e2e coverageUT1 saturn lon: -0.0592 at coverageUT1 2101-01-13T00:01:12.9650 lat -61.227 lon 5.983
- e2e coverageUT1 sun lon: -1.0386 at coverageUT1 2101-01-13T00:12:32.7920 lat -66.486 lon 31.036
- e2e coverageUT1 trueNode lon: 0.1278 at coverageUT1 2101-01-13T00:01:12.9650 lat -61.227 lon 5.983
- e2e coverageUT1 venus lon: -1.2813 at coverageUT1 2101-01-13T23:58:50.8140 lat 10.000 lon 10.000
- e2e design1899 P asc: 0.0686 at design1899 1899-11-15T16:13:55.3796 lat 66.484 lon -27.944
- e2e design1899 P cusps: 0.0686 at design1899 1899-11-15T16:13:55.3796 lat 66.484 lon -27.944
- e2e design1899 W asc: 0.0686 at design1899 1899-11-15T16:13:55.3796 lat 66.484 lon -27.944
- e2e design1899 chiron lon: 0.6752 at design1899 1899-09-15T01:21:22.3285 lat -12.271 lon 13.390
- e2e design1899 trueNode lon: 0.2616 at design1899 1899-11-11T06:40:58.5114 lat -23.504 lon -179.137
- e2e design1899 uranus lon: 0.0840 at design1899 1899-11-30T17:29:5.1097 lat 89.975 lon 152.756
- e2e endOfDay P asc: -205.4940 at endOfDay 2042-11-22T23:59:59.9990 lat 60.216 lon -153.204
- e2e endOfDay P cusps: 245.9397 at endOfDay 2049-12-02T23:59:59.9990 lat -66.453 lon 55.214
- e2e endOfDay W asc: -205.4940 at endOfDay 2042-11-22T23:59:59.9990 lat 60.216 lon -153.204
- e2e endOfDay chiron lon: 0.6840 at endOfDay 1900-07-02T23:59:59.9990 lat -77.338 lon -118.842
- e2e endOfDay jupiter lon: -0.0500 at endOfDay 2049-07-04T23:59:59.9990 lat -66.550 lon -24.572
- e2e endOfDay mars lon: -0.1580 at endOfDay 2049-01-30T23:59:59.9990 lat 6.153 lon -150.729
- e2e endOfDay mercury lon: -0.4768 at endOfDay 2049-07-04T23:59:59.9990 lat -66.550 lon -24.572
- e2e endOfDay moon lon: -3.2748 at endOfDay 2049-06-15T23:59:59.9990 lat -54.119 lon 164.562
- e2e endOfDay sun lon: -0.2270 at endOfDay 2049-12-02T23:59:59.9990 lat -66.453 lon 55.214
- e2e endOfDay trueNode lon: -0.0690 at endOfDay 1900-10-07T23:59:59.9990 lat -15.919 lon -14.663
- e2e endOfDay venus lon: -0.2817 at endOfDay 2049-12-02T23:59:59.9990 lat -66.453 lon 55.214
- e2e leapSecond P asc: -1.4276 at leapSecond 1993-06-30T23:59:59.5000 lat 56.452 lon -4.529
- e2e leapSecond P cusps: 1.5723 at leapSecond 1981-06-30T23:59:60.5000 lat 66.541 lon -15.290
- e2e leapSecond W asc: -1.4276 at leapSecond 1993-06-30T23:59:59.5000 lat 56.452 lon -4.529
- e2e leapSecond chiron lon: 0.0736 at leapSecond 1972-12-31T23:59:59.5000 lat 89.915 lon -36.568
- e2e sign mismatch mercury: -0.3419 at random 2049-11-11T20:24:54.7230 lat 62.772 lon 0.616 engine 239.9999136 oracle 240.0000085
- e2e sign mismatch moon: -5.6717 at random 2066-04-21T18:39:49.1718 lat -12.933 lon 141.531 engine 359.9992420 oracle 0.0008175
- e2e y1971_1972 P asc: 0.1002 at y1971_1972 1971-12-22T02:26:13.9519 lat -66.495 lon -36.211
- e2e y1971_1972 P cusps: 0.1002 at y1971_1972 1971-12-22T02:26:13.9519 lat -66.495 lon -36.211
- e2e y1971_1972 W asc: 0.1002 at y1971_1972 1971-12-22T02:26:13.9519 lat -66.495 lon -36.211
- e2e y1971_1972 chiron lon: 0.0766 at y1971_1972 1971-12-03T01:47:57.5639 lat 34.874 lon 156.825
- jdut1_to_utc 1972-2022: 0.0652 at random 2020-06-02T13:40:31.0240 lat -78.852 lon 157.832
- jdut1_to_utc 2023-2026: 0.5021 at random 2026-12-30T23:23:7.2777 lat -25.478 lon -88.441
- jdut1_to_utc 2027-2049: 5.2263 at random 2049-12-30T04:59:7.7345 lat -66.413 lon -39.785
- jdut1_to_utc 2050-2100: 35.5357 at random 2100-12-30T21:17:12.8008 lat 20.629 lon -60.515
- jdut1_to_utc coverageUT1: 35.5686 at coverageUT1 2101-01-13T23:43:45.4240 lat -79.348 lon -3.826
- jdut1_to_utc endOfDay: 5.2003 at endOfDay 2049-12-02T23:59:59.9990 lat -66.453 lon 55.214
- jdut1_to_utc leapSecond: 0.0474 at leapSecond 1983-06-30T23:59:60.2500 lat -79.062 lon 84.952
- jdut1_to_utc y1971_1972: -0.0460 at y1971_1972 1972-01-01T00:00:0.0000 lat 51.500 lon -0.100
- roundtrip y1971_1972: 0.0456 at y1971_1972 1971-12-31T23:59:59.9600 lat 51.500 lon -0.100
- same 1899-1971 P asc: -0.6595 at random 1963-09-26T22:59:58.9608 lat -66.554 lon 100.013
- same 1899-1971 P cusps: 0.6595 at random 1963-09-26T22:59:58.9608 lat -66.554 lon 100.013
- same 1899-1971 W asc: -0.6595 at random 1963-09-26T22:59:58.9608 lat -66.554 lon 100.013
- same 1972-2022 P asc: 0.4329 at random 1986-08-30T02:13:3.1444 lat -66.552 lon 78.994
- same 1972-2022 P cusps: 0.4329 at random 1986-08-30T02:13:3.1444 lat -66.552 lon 78.994
- same 1972-2022 W asc: -0.6729 at random 1999-06-30T18:38:36.5000 lat -66.594 lon -108.117
- same 2023-2026 W asc: 0.0542 at random 2023-06-17T21:50:24.9112 lat -66.598 lon -141.865
- same 2027-2049 P asc: 0.0712 at random 2037-10-27T10:31:13.2955 lat 66.519 lon 76.558
- same 2027-2049 P cusps: 0.0712 at random 2037-10-27T10:31:13.2955 lat 66.519 lon 76.558
- same 2027-2049 W asc: 0.1389 at random 2040-01-26T17:06:37.8447 lat -66.584 lon 68.239
- same 2050-2100 P asc: 1187.5253 at random 2072-04-10T19:32:23.7897 lat -66.539 lon -42.964
- same 2050-2100 P cusps: 1187.5253 at random 2072-04-10T19:32:23.7897 lat -66.539 lon -42.964
- same 2050-2100 W asc: 1187.5253 at random 2072-04-10T19:32:23.7897 lat -66.539 lon -42.964
- same 2050-2100 W cusps: 108000.0000 at random 2085-03-31T19:25:47.5104 lat 62.172 lon 70.499
- same chiron lon: -0.9349 at TT 2487068.143919323
- same coverageUT1 P asc: 7.5602 at coverageUT1 2101-01-13T20:54:55.3280 lat 66.490 lon -155.155
- same coverageUT1 P cusps: 7.5602 at coverageUT1 2101-01-13T20:54:55.3280 lat 66.490 lon -155.155
- same coverageUT1 W asc: 7.5602 at coverageUT1 2101-01-13T20:54:55.3280 lat 66.490 lon -155.155
- same design1899 P asc: 0.0686 at design1899 1899-11-15T16:13:55.3796 lat 66.484 lon -27.944
- same design1899 P cusps: 0.0686 at design1899 1899-11-15T16:13:55.3796 lat 66.484 lon -27.944
- same design1899 W asc: 0.0686 at design1899 1899-11-15T16:13:55.3796 lat 66.484 lon -27.944
- same jupiter lon: 0.5535 at TT 2463232.867347183
- same mars lon: -0.1709 at TT 2450946.1602063244
- same mercury lon: 0.0772 at TT 2447841.165017588
- same trueNode lon: 0.2616 at TT 2414969.7784301364
- same uranus lon: 0.5480 at TT 2476721.8074089424
- same y1971_1972 P asc: 0.1002 at y1971_1972 1971-12-22T02:26:13.9519 lat -66.495 lon -36.211
- same y1971_1972 P cusps: 0.1002 at y1971_1972 1971-12-22T02:26:13.9519 lat -66.495 lon -36.211
- same y1971_1972 W asc: 0.1002 at y1971_1972 1971-12-22T02:26:13.9519 lat -66.495 lon -36.211
- station dt chiron: 172.7485 at TT 2455506.2800350077
- station dt neptune: -104.0284 at TT 2432932.8999355845
- station dt pluto: -1415.5861 at TT 2486087.836104203
- station dt trueNode: 5966.8685 at TT 2419681.5559292696
- time 1899-1971 jdTT: 0.1315 at random 1952-04-06T13:53:9.4957 lat -42.670 lon -73.259
- time 2027-2049 jdTT: -5.3953 at random 2049-12-30T04:59:7.7345 lat -66.413 lon -39.785
- time 2050-2100 jdTT: -24.4607 at random 2100-12-30T21:17:12.8008 lat 20.629 lon -60.515
- time coverageUT1 jdTT: -24.4788 at coverageUT1 2101-01-13T23:58:50.8140 lat 10.000 lon 10.000
- time design1899 jdTT: 0.0153 at design1899 1899-12-29T18:14:44.7024 lat -41.490 lon 35.619
- time endOfDay jdTT: -5.3736 at endOfDay 2049-12-02T23:59:59.9990 lat -66.453 lon 55.214

