# Changelog

## 1.1.0

- Finished on 3 October 2026 and used by Zodiacally since then. Offered as a download for private
  use on zodiacally.com from 4 November 2026; public repository since 9 November 2026. Not yet
  published on npm.
- Data format 2: records next to a superior solar conjunction are replaced by refined
  sub-records, so the tables follow the directly computed DE440 positions to about 0.5 mas at
  the check points (24 per record, 401 for each record near the Sun; largest error found
  0.5002 mas, for Mercury). In the internal version 1.0.0, single 16-day records within about 1°
  of the Sun were off by up to about 7″ (6.89″ for Neptune, recorded as
  `maxArcsecBeforeRefinement` in `data/manifest.json`).
- The engine logic and the data are unchanged from the 4 November download; documentation and
  packaging were revised for the public repository. The data tables and `data/manifest.json`
  (SHA-256 `dc4569769900b60381b5bbcd74efdae06713d1a14bbe4e84371b319477219c35`) are
  byte-identical. The manifest's `createdBy` field still names the build script's original
  internal path, because changing it would change the published checksum. The download on
  zodiacally.com is rebuilt from this repository (same engine version and data).
- Added with the public repository: an ES module entry point (`index.mjs`) with the matching
  `exports` in `package.json`, TypeScript declarations (`index.d.ts`, `agent.d.ts`), this
  changelog, a standalone test suite, the reproducible benchmark against the Swiss Ephemeris and
  NASA/JPL Horizons (`benchmark/`, including the convention studies in `benchmark/studies/`), the
  table build tools (`build/`), documentation (`docs/`) and citation metadata.

## 1.0.0

- Internal development version, never released. Within about 1° of the Sun its single 16-day
  records were off by up to about 7″.
