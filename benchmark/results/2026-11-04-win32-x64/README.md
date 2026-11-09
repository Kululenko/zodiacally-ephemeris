# Benchmark run 2026-11-04-win32-x64

First published speed measurement (AMD Ryzen 5 5600G, Windows x64, Node 22.14.0, sweph 2.10.3-7),
made on 4 November 2026 with an earlier single-workload script: the same chart workload as the
`chart` row of `speed.mjs`, 7 rounds of 5,000 charts after 2,000 warm-up calls and the same seed
number (20261104), but a different random generator, so 1,024 different inputs from the same ranges
(1900–2026, latitude ±65°). 23.5× is the ratio of the two libraries' medians; the per-round ratios
are 19.8–25.7× (median 24.1×).

| workload | Zodiacally Ephemeris | Swiss Ephemeris (sweph) | ratio |
| --- | ---: | ---: | ---: |
| full chart: 12 longitudes with speeds + Placidus houses | 7.540 µs | 177.526 µs | 23.5× faster |

Raw values: [`speed-release.json`](speed-release.json).
