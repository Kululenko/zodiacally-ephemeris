# Changelog

## 1.1.1 — 2026-11-09

- Licence version 2 (`LICENSE.txt`, 9 November 2026): free for any use, including commercial use
  (businesses, client work, paid readings, public services, apps, agents and APIs). Conditions:
  the attribution line in every reading or result shown or delivered to another person (a
  reachable, clearly labelled credit for short formats; API providers pass the line on), and the
  distribution rules, which exclude publishing or distributing the engine as a standalone
  library, package, port or data product, free or paid (forks for proposing changes are
  permitted). Rights that end on a breach are restored if it is remedied within 30 days.
  White-label licence without attribution: €690 one-time plus VAT where applicable, granted
  individually on request, for the licensee's own products and client projects and for the
  version current at purchase and the releases of the following 12 months. Free use is provided
  as is; for a white-label licence the statutory warranty and liability rules apply unless agreed
  otherwise. Version 1 (4 November 2026) allowed free use only for private, non-commercial
  purposes and offered a €500 commercial licence with attribution and a €2,000 white-label
  licence; holders of a commercial licence granted under version 1 may rely on it or on
  version 2, whichever they choose.
- Agent wrapper (`zodiacally-ephemeris/agent`): the `licence` object now reports
  `attributionRequired: true`, `commercialUseRequiresSeparateLicence: false` and a `whiteLabel`
  object (`currency: 'EUR'`, `amount: 690`, `oneTime`, `waivesCustomerFacingAttribution`,
  `requiresSeparateGrant`), and `defaultUse` describes the free use with attribution.
  `attribution.placement` now names every reading or result shown or delivered to another
  person, and `attribution.exception` no longer speaks of a commercial white-label licence or a
  customer-facing attribution. The TypeScript declarations in `agent.d.ts` match (`Licence`,
  `WhiteLabelLicence`).
- Command line: `--help` shows the new licence summary, its conditions and the white-label link.
- Calculations, data tables and `data/manifest.json` (SHA-256
  `dc4569769900b60381b5bbcd74efdae06713d1a14bbe4e84371b319477219c35`) are unchanged from 1.1.0;
  `info().dataVersion` is the same, `info().version` now reads 1.1.1. The benchmark was measured
  with 1.1.0 and remains valid for 1.1.1.

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
