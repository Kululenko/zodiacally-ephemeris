# Verify Zodiacally Ephemeris yourself

We would rather be checked than believed. Each step below takes minutes and needs no account,
API key or contact with us. Whether your result confirms or contradicts our numbers, please open
a [verification report](https://github.com/Kululenko/zodiacally-ephemeris/issues/new?template=verification-report.yml).
We will link independent reports here as they arrive; there are none yet.

## 1. The package is what we say it is (1 minute)

```sh
git clone https://github.com/Kululenko/zodiacally-ephemeris.git && cd zodiacally-ephemeris
npm ci && npm test        # 137 tests: data checksums, NASA/JPL Horizons values, time, houses, CLI
node -e "console.log(require('./').info())"
```

`info().manifestSha256` must be `dc4569769900b60381b5bbcd74efdae06713d1a14bbe4e84371b319477219c35`
for version 1.1.0. The manifest lists the size and SHA-256 of every table, and the engine refuses
to compute (`EPHEMERIS_DATA_INVALID`) if a table does not match it.

## 2. Positions match NASA/JPL Horizons (2 minutes)

Pick any date and body, ask JPL Horizons, and compare. Example: the Moon at maximum of the total
solar eclipse of 8 April 2024 (18:17 UTC). The first command converts the UTC reading to a Julian
day TT, rounded to the six decimals that are sent to Horizons; the second evaluates the Moon at
exactly that rounded value, so both sides use the same instant:

```sh
node -e "
const eph = require('./');
console.log(eph.utcToJd({ year: 2024, month: 4, day: 8, hour: 18, minute: 17 }).jdTT.toFixed(6));
console.log(eph.positionTT(2460409.262606, 'moon').longitude.toFixed(7));"
# 2460409.262606
# 19.3602520

curl -s "https://ssd.jpl.nasa.gov/api/horizons.api?format=text&COMMAND='301'&OBJ_DATA='NO'&EPHEM_TYPE='OBSERVER'&CENTER='500@399'&QUANTITIES='31'&TLIST_TYPE='JD'&TIME_TYPE='TT'&TLIST='2460409.262606'&EXTRA_PREC='YES'&ANG_FORMAT='DEG'&CSV_FORMAT='YES'" \
  | sed -n '/SOE/,/EOE/p'
# 2024-Apr-08 18:18:09.158, , ,  19.3602394,  0.3456094,
```

(Horizons labels the instant in TT, which ran 69.184 s ahead of UTC in 2024; rounding the
Julian day to six decimals moves it by another 26 ms. The first number after the time is the
ecliptic longitude.) The difference here is 0.045″. Passing the unrounded `jdTT` instead would
add 0.016″, the Moon's motion in those 26 ms. Between 1900 and 2100 the difference from Horizons
stays below about 0.25″, and at a given date it is nearly the same for every body, because
Horizons gives this output quantity (31) in the IAU 1976/1980 frame while the engine uses IAU
2006/2000A. The Swiss Ephemeris shows the same shared offset from Horizons, so this comparison
checks the engine against JPL but cannot rank the two libraries. Horizons itself currently
computes from DE441 (shown in its output header as `{source: DE441}`), so this comparison does
not favour the DE440 build either; the shared frame term dominates. The header also lists
`Rel. light bend : Sun`: Horizons, like this engine, applies light deflection by the Sun only.

Use `COMMAND='10'` for the Sun, `'199'` and `'299'` for Mercury and Venus, `'4'` … `'9'` for
the Mars to Pluto barycentres and `'2060;'` for Chiron. `test/package.test.js` checks 200 such
epochs for 11 bodies. For Chiron the agreement is a consistency check, not independent evidence:
Horizons computes Chiron from orbit solution JPL#171, the same solution the engine's Chiron
table was built from.

## 3. Compare with the Swiss Ephemeris (5 minutes)

```sh
cd benchmark && npm install        # installs sweph in benchmark/ only
node fetch-swiss-data.mjs          # official Swiss Ephemeris files, SHA-256 verified
node speed.mjs && node agreement.mjs && node horizons.mjs && node summary.mjs
```

`sweph` 2.10.3-7 ships prebuilt binaries for macOS arm64, Linux arm64 and x64, and Windows x64;
on other platforms `npm install` needs a C toolchain. Your results land in
`benchmark/results/<date>-<platform>-<arch>/README.md`; compare them with
[ours](../benchmark/results/2026-11-08-darwin-arm64/README.md). `speed.mjs` also measures the
cold start, where the Swiss Ephemeris is faster. The October 2026 figures quoted in
[accuracy.md](accuracy.md), including the end-to-end comparison from UTC readings, come from
Zodiacally's internal harness, which is not in this repository; the benchmark here makes the
same kind of same-instant comparison, but not the end-to-end one.

Optional referee: `node fetch-swiss-data.mjs --jpl && node agreement.mjs --jpl` (102 MB
download) lets the Swiss Ephemeris compute from JPL's DE440 file itself. That separates the
difference between the two codes from the difference between the data sets (DE440 versus the
DE441-based SE1 files). It does not rank the libraries: Zodiacally Ephemeris is built from DE440,
so it is naturally closer to a DE440 computation.

Part of the agreement with the Swiss Ephemeris is by construction. Three discrete choices between
published conventions (light deflection by the Sun only, the n = 3 polytrope model for rays
behind the solar disc, and the light-time-retarded osculating true node) were made by comparing
residuals against Swiss Ephemeris output. The study scripts are in
[`benchmark/studies/`](../benchmark/studies/); the alternatives and their residuals are in
[conventions.md](conventions.md).

## 4. Rebuild the tables from NASA/JPL data (about 5 minutes)

```sh
ZODIACALLY_EPHEMERIS_OUT_DIR=/tmp/zeph/data ZODIACALLY_EPHEMERIS_FIXTURE=/tmp/zeph/reference.json \
  sh build/tables/build.sh
for f in data/*; do cmp "$f" "/tmp/zeph/$f" || echo "DIFFERENT $f"; done
cmp test/fixtures/reference.json /tmp/zeph/reference.json || echo "DIFFERENT fixture"
```

The builder needs Python 3 and downloads DE440s (31 MiB) from JPL. It uses Skyfield, NumPy and
the committed JPL Horizons Chiron responses; it does not import or call the Swiss Ephemeris, and
no coefficient is fitted to its output. On macOS/arm64 every file should be byte-identical. On
other platforms floating-point results differ in the last bits; check numerical equivalence
instead (strict bound on the difference of any evaluated value):

```sh
node build/compare-tables.mjs data /tmp/zeph/data     # passes if every table is within 0.000001″
```

We have verified this on one platform so far: on 8 November 2026 a rebuild on an Apple M1
(macOS, Homebrew Python 3) reproduced all 24 files in `data/` (23 table files and the manifest)
and the reference fixture byte-identically to the committed October 2026 build. On Linux x86-64
(GitHub Actions, 9 November 2026) the rebuild was not bit-identical but numerically equivalent:
identical record layout, evaluated values within 0.000000016″, reference values within
0.0000217″. A monthly CI job ([`reproducible-build.yml`](../.github/workflows/reproducible-build.yml))
repeats this check. Please report your platform and Python version either way.

`data/manifest.json` records `"createdBy": "tools/ephemeris-build/build.py 1.1.0"`, the
builder's path in the original internal build. It stays as it is, because changing it would
change the published manifest SHA-256.

## 5. Read the code

The engine is about 1,000 lines (including a generated ΔT table) in five files:
[`index.js`](../index.js) (API), [`chebyshev.js`](../chebyshev.js) (table loading, checksum and
evaluation, with the binary format at the top), [`time.js`](../time.js) (UTC, TT, UT1),
[`houses.js`](../houses.js) (sidereal time, Ascendant, MC, Placidus, whole sign) and
[`deltaTTable.js`](../deltaTTable.js) (the generated ΔT table). Every formula cites its source.

## What we would like reviewers to look at

- Whether the apparent-place reduction (light time, solar deflection, aberration, IAU 2006/2000A)
  in `build/tables/reduction.py` matches its description in [conventions.md](conventions.md).
- The three convention choices that were made by comparing against Swiss Ephemeris output, and
  whether the documented alternatives would be the better choice.
- Time scales around 1972 and leap seconds, and the ΔT model for future dates.
- Placidus near the polar circles and the polar convention.
- Whether the benchmark is fair to the Swiss Ephemeris (inputs, flags, the cold-start number).
