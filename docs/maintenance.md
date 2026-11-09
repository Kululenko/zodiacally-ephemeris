# Maintenance and release calendar

The position tables do not change until a new JPL ephemeris or a new Chiron orbit solution is
adopted. The **time data** do: leap seconds are announced by the IERS twice a year, and the
Earth's rotation (UT1, and therefore ΔT) is observed and predicted continuously. Not refreshing
is safe (the engine keeps working with the documented rules), but house cusps for recent and
future dates slowly lose accuracy: 1 second of UT1 moves the MC by about 15″.

## Calendar

| when | what |
| --- | --- |
| every release | `npm test` (checksums, coverage, reference values, NASA/JPL Horizons values) and the benchmark (`npm run bench`) |
| January and July (after IERS Bulletin C) | check for a new leap second; move `LEAP_TABLE_EXPIRES` in `time.js` (currently 2027-06-28) to the new expiry date |
| yearly, by June | rebuild `deltaTTable.js` with the newest IERS data (current IERS data end: `IERS_LAST_JD` = 2461673.5, i.e. 2027-09-25) |
| well before 2100 | rebuild the tables from a later JPL ephemeris (coverage ends 2101-01-13 23:58:50 UTC) |

## Leap seconds

Read the current IERS Bulletin C / `Leap_Second.dat`
(<https://hpiers.obspm.fr/iers/bul/bulc/>). Set `LEAP_TABLE_EXPIRES` in `time.js` (and the
comment above `LEAP_SECONDS`) to the file's new expiry date, and update the expected value in
`test/time.test.js`, which checks it.

If a leap second was announced, also append `[MJD, TAI−UTC]` to `LEAP_SECONDS` in `time.js`.
This changes TT for every UTC reading after the leap second by one second. Update the
expectations in `test/time.test.js` that describe the table and future dates: the last
`LEAP_SECONDS` entry (now `[57754, 37]`), the table length (now 28) and TT − UTC = 69.184 s for
future dates (the name of that test says 37 s as well). Update the texts that give 37 s or
69.184 s for future dates: the comments in `time.js`, [api.md](api.md#time),
[conventions.md](conventions.md#time-scales) and
[swiss-ephemeris-comparison.md](swiss-ephemeris-comparison.md#what-to-expect-after-switching).
Then rebuild the ΔT table with a `pyerfa` release that knows the new leap second (the builder
takes TAI − UTC from it), bump the version and note the change in the changelog.

## ΔT table

```sh
python3 -m venv /tmp/deltat && /tmp/deltat/bin/pip install numpy==2.5.3 skyfield==1.55 pyerfa==2.0.1.5 astropy-iers-data
/tmp/deltat/bin/python build/delta-t/build_delta_t.py > deltaTTable.js
```

The generated header records the data versions used. Record the `astropy-iers-data` version in
the script's usage comment as well, copy the new `IERS_LAST_JD` into the calendar above, run `npm test`,
bump the patch version (`version` in `package.json` and `ENGINE_VERSION` in `index.js`; a test
checks that they match), and note in the changelog how much ΔT changed and that houses for
recent and future dates shift accordingly (1 second of UT1 moves the MC by about 15″). Through
that version bump a ΔT refresh changes `info().version`, but not `info().dataVersion`, which
identifies the position tables only. Applications that cache charts
should store both and recalculate when either changes.

## New JPL ephemeris or Chiron orbit

`sh build/tables/build.sh` (see [build/README.md](../build/README.md)) after updating the source
file name, URL, size and SHA-256 in `build/tables/build.py` (`DE440S`), the download in
`build/tables/build.sh`, and the `de440s` prefix of `dataVersion` in `build.py`. Horizons always
serves its current Chiron solution; the committed responses in `build/tables/sources/horizons/`
keep JPL#171 and are downloaded again only if they are missing. Then run `npm test` and the
benchmark, update every text that names DE440 or JPL#171 (including the attribution line), and
publish the new accuracy figures with the release.
