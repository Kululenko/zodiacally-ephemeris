# Contributing

The most valuable contribution is an **independent check**. Run the steps in
[docs/verify.md](docs/verify.md) and share the result as a
[verification report](https://github.com/Kululenko/zodiacally-ephemeris/issues/new?template=verification-report.yml),
whether it confirms or contradicts our numbers.

- **Wrong value or bug:** open an issue with the input, the expected value and the reference you
  compared with (JPL Horizons, Swiss Ephemeris, another library). Please do not post someone's
  private birth data; synthetic inputs reproduce the same problem.
- **Benchmark improvements** (fairer comparisons, more machines, other libraries) are welcome as
  pull requests to `benchmark/` (MIT-licensed).
- **Engine and data:** the engine is source-available under [LICENSE.txt](LICENSE.txt), not open
  source. Forking this repository to propose changes is permitted. Pull requests to the engine
  are welcome for discussion, but we can only merge them if you grant Zodiacally a perpetual,
  worldwide, non-exclusive, irrevocable, royalty-free right to use, modify and distribute your
  contribution under any licence terms, including white-label licences, and confirm that you
  have the right to do so; please say so in the PR.
- **Clean room:** do not submit code or data derived from the Swiss Ephemeris source code or other
  GPL/AGPL-licensed ephemeris code. Comparisons through public APIs, as in `benchmark/`, are fine.
  If a change chooses between published conventions by comparing residuals against another
  library, document the alternatives and residuals, as in [docs/conventions.md](docs/conventions.md)
  and [benchmark/studies/](benchmark/studies/).

Before a pull request: `npm ci && npm test`.
