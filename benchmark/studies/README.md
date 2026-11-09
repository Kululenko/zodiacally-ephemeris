# Convention studies: three choices made by comparison with the Swiss Ephemeris

The tables of Zodiacally Ephemeris are computed from JPL data only (DE440s through Skyfield, Chiron
from JPL Horizons; see [`../../build/README.md`](../../build/README.md)). Three modelling choices
in [`build/tables/reduction.py`](../../build/tables/reduction.py) were nevertheless made by
comparing published alternatives with Swiss Ephemeris output:

1. which bodies deflect light (the Sun only, or also Jupiter and Saturn);
2. how the Sun deflects light from a body that is behind the solar disc;
3. which definition of the osculating ("true") lunar node is used.

This directory contains the study scripts behind those choices, unchanged apart from file paths
and comments, and their output from 8 November 2026 in [`results/`](results/). They let anyone
check the alternatives listed below, what was chosen and how large the differences are.

## What was chosen, and what that means

| convention | alternatives in the study scripts | kept | residual against the Swiss Ephemeris, kept vs. alternatives |
| --- | --- | --- | --- |
| bodies that deflect light | Sun + Jupiter + Saturn (Skyfield's default) | Sun only | scatter 0.14–0.20 mas vs. 0.67–0.98 mas at the two closest Uranus–Jupiter appulses |
| Sun's deflection behind the solar disc | point mass; no deflection | enclosed mass of an n = 3 polytrope | RMS 0.03–0.08″ vs. 0.36–14.6″ (point mass) and 0.38–1.57″ (none) at four deep superior conjunctions |
| true lunar node | four other definitions | osculating node at the light-time-retarded epoch, true ecliptic of date | RMS 0.0084″ vs. 0.0095″ for the next-best definition (3,000 epochs) |

Each choice is between published conventions without a free parameter. Nothing continuous was
fitted: no coefficient, scale factor, offset or time shift was adjusted to Swiss Ephemeris
output, no Swiss Ephemeris output enters the tables, and `build/tables/build.py` imports nothing
from this directory. No Swiss Ephemeris source code was read; it is called only through the
public API of the `sweph` binding.

As a consequence, **for these three conventions the agreement with the Swiss Ephemeris is partly
by construction.** Matching the Swiss Ephemeris does not show that a convention is more correct.
This is why the benchmark also compares both libraries with NASA/JPL Horizons
([`../horizons.mjs`](../horizons.mjs)). For the first choice there is an independent
reference: JPL Horizons also deflects light by the Sun only. Every response in
[`../horizons-cache/`](../horizons-cache/) (44 files) states `Rel. light bend : Sun` in its
header.

How much the choices matter for the published agreement figures, from the outputs below: had the
alternatives been kept, the true node would have differed from the Swiss Ephemeris by an RMS of
0.0095″ instead of 0.0084″ in this sample; Uranus at its closest appulse to Jupiter (56″) by up to
2.5 mas instead of 1.0 mas; and Mercury passing almost exactly behind the Sun's centre (1954, hidden
by the Sun at that moment) by up to 146″ with the point-mass formula instead of 0.16″. The first
choice only matters for bodies seen close to Jupiter or Saturn, the second only behind the solar
disc (outside the limb both treatments are the same point-mass formula).

## Study 1: light deflection by the Sun only, or also by Jupiter and Saturn

Script: [`deflection_study.py`](deflection_study.py), part A. Output:
[`results/deflection_study.txt`](results/deflection_study.txt).

Skyfield's `apparent()` deflects light by the Sun, Jupiter and Saturn. The effect of Jupiter on
another planet's light is largest when that planet is seen right next to Jupiter, so the study
finds the two closest Uranus–Jupiter appulses between 1899 and 2101 and computes Uranus's apparent
longitude at 121 TT instants (±3 days in 0.05-day steps) with both variants. Each is compared
with `swe.calc(jdTT, SE_URANUS, SEFLG_SWIEPH|SEFLG_SPEED)` at the same instants. The residual can
contain a small offset that is nearly constant over a few days, so the decisive number is the
scatter of the residual around its mean over the window: a deflection term that one side has and
the other lacks shows up as a bump during the appulse.

| appulse (TT) | separation | Sun only: scatter RMS / max \|residual\| | Sun + Jupiter + Saturn: scatter RMS / max \|residual\| |
| --- | ---: | ---: | ---: |
| 1955-05-10 | 56.3″ | 0.143 / 1.009 mas | 0.669 / 2.535 mas |
| 2038-03-30 | 76.4″ | 0.202 / 0.935 mas | 0.982 / 1.873 mas |

With the Sun only, the residual is smooth; adding Jupiter and Saturn introduces a signature of
about 1–2 mas that the Swiss Ephemeris output does not contain. **Kept: the Sun only**, which is
also what JPL Horizons uses (see above). The two variants differ only for a body seen very close
to Jupiter or Saturn.

## Study 2: the Sun's deflection for rays behind the solar disc

Script: [`deflection_study.py`](deflection_study.py), part B. Output:
[`results/deflection_study.txt`](results/deflection_study.txt).

The usual point-mass formula for light deflection grows as 1/b with the impact parameter b and
diverges for a ray that passes through the Sun. The script compares three treatments: the
point-mass formula as implemented in Skyfield; the mass enclosed by the cylinder of radius b for
an n = 3 polytrope, Eddington's standard model of the Sun (Schneider, Ehlers & Falco,
*Gravitational Lenses*, 1992; implemented in `reduction._sun_projected_mass_fraction`); and no
deflection at all. The study finds the two deepest superior conjunctions each of Mercury and of Jupiter between
1899 and 2101 and compares 101 TT instants (±1 day in 0.02-day steps) with `swe.calc`. All four
events are behind the solar disc (the Sun's apparent radius is about 0.27°).

| conjunction (TT) | min. elongation | point mass: RMS / max | n = 3 polytrope: RMS / max | no deflection: RMS / max |
| --- | ---: | ---: | ---: | ---: |
| Mercury 1943-11-10 | 0.017° | 0.814″ / 4.546″ | 0.050″ / 0.199″ | 0.680″ / 1.407″ |
| Mercury 1954-05-08 | 0.001° | 14.571″ / 146.333″ | 0.032″ / 0.163″ | 0.382″ / 1.043″ |
| Jupiter 2037-06-29 | 0.051° | 0.356″ / 1.396″ | 0.045″ / 0.178″ | 1.457″ / 2.857″ |
| Jupiter 2049-07-04 | 0.036° | 0.702″ / 3.021″ | 0.076″ / 0.308″ | 1.569″ / 3.245″ |

**Kept: the n = 3 polytrope.** It removes the unphysical spike of the point-mass formula and has
the smallest residual in all four cases. It does not reproduce the Swiss Ephemeris exactly: up to
0.31″ remains in these windows, and we have not tried to find out what the Swiss Ephemeris does
behind the disc. This is consistent with the differences found for planets within 1° of the Sun:
up to 0.27″ in the 8 November 2026 run of [`../agreement.mjs`](../agreement.mjs) and up to 0.55″
in the October internal report ([`docs/accuracy.md`](../../docs/accuracy.md)). At these moments
the body is hidden by the Sun; the choice matters for the continuity of the tables, not for a
position anyone can observe.

## Study 3: definition of the true lunar node

Script: [`true_node_study.py`](true_node_study.py), run with 3,000 epochs. Output:
[`results/true_node_study.txt`](results/true_node_study.txt).

The true node is the ascending node of the instantaneous (osculating) orbit of the Moon: the node
of h = r × v of the geocentric Moon from DE440s. The study evaluates the five definitions listed in
`reduction.TRUE_NODE_VARIANTS` at 3,000 random TT epochs between 1899 and 2101 (seed 4242) and
compares them with `swe.calc(jdTT, SE_TRUE_NODE, SEFLG_SWIEPH|SEFLG_SPEED)`:

- `geometric` vs. `lightTimeRetarded`: the Moon's state at the instant itself, or at the instant
  minus the light time from the Moon;
- `trueEclipticOfDate`: node on the mean ecliptic of date (IAU 2006, with frame bias) plus the
  nutation in longitude Δψ, i.e. referred to the true ecliptic of date;
- `noFrameBias`: the same without the ICRS frame bias; `meanEquinoxOfDate`: without Δψ;
  `eclipticJ2000`: on the fixed J2000 ecliptic.

Longitude residuals (ours − Swiss Ephemeris), arcseconds:

| definition | RMS | p99 | max | mean |
| --- | ---: | ---: | ---: | ---: |
| light-time-retarded, true ecliptic of date (**kept**) | 0.0084 | 0.0234 | 0.178 | +0.0001 |
| geometric, true ecliptic of date | 0.0095 | 0.0268 | 0.175 | −0.0026 |
| geometric, true ecliptic of date, no frame bias | 0.174 | 0.264 | 0.395 | −0.0134 |
| geometric, mean equinox of date | 12.18 | 18.41 | 18.71 | −0.083 |
| geometric, J2000 ecliptic | 2891 | 5405 | 5580 | −89.1 |

The script picks the definition with the smallest RMS and checks that it is the one hard-coded in
`reduction.TRUE_NODE_VARIANT` (it exits with a note otherwise); both are
`lightTimeRetarded_trueEclipticOfDate`. The two leading definitions are close: the retarded one
mainly removes a mean offset of about 2.6 mas, while the largest residual is about 0.18″ for
both and is not explained by this choice. The last three definitions refer the node to other
frames and serve as controls. The speed residuals (RMS about 0.042″ per day for the three leading
definitions) do not distinguish between them.

## Run the studies

The studies need the benchmark's `sweph` installation and Swiss Ephemeris data files, and the
Python environment and DE440s file of the table build. Nothing is downloaded into this directory;
the Swiss data files stay in the git-ignored `benchmark/ephe/`. From the repository root:

```sh
cd benchmark
npm install                        # sweph 2.10.3-7 into benchmark/node_modules/
node fetch-swiss-data.mjs          # SE1 files into benchmark/ephe/, SHA-256 verified
cd ../build/tables
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements.txt    # pinned: Skyfield 1.55, NumPy 2.5.3, ...
mkdir -p .cache
curl -fL -o .cache/de440s.bsp https://ssd.jpl.nasa.gov/ftp/eph/planets/bsp/de440s.bsp
shasum -a 256 .cache/de440s.bsp    # c1c7feeab882263fc493a9d5a5b2ddd71b54826cdf65d8d17a76126b260a49f2
cd ../..
build/tables/.venv/bin/python benchmark/studies/true_node_study.py 3000
build/tables/.venv/bin/python benchmark/studies/deflection_study.py
```

`sh build/tables/build.sh` also creates the virtual environment and downloads DE440s, but it then
rebuilds `data/` as well. Each study takes a few seconds.

The outputs in `results/` were produced on 8 November 2026 on an Apple M1 (macOS) with Python
3.15.0, Skyfield 1.55, NumPy 2.5.3, Node.js v25.8.2, `sweph` 2.10.3-7 (Swiss Ephemeris 2.10.03)
and the SE1 files of revision 3fd0f956 that `fetch-swiss-data.mjs` downloads. The residuals
quoted in this README and in [`docs/conventions.md`](../../docs/conventions.md) are taken from
these outputs. Rerunning both scripts on the same machine on 9 November 2026 reproduced both
output files byte for byte; other Python, NumPy or Skyfield versions have not been tested.

| file | purpose |
| --- | --- |
| `oracle.cjs` | calls `swe.calc` (TT input, `SEFLG_SWIEPH\|SEFLG_SPEED`) for a list of epochs and prints longitudes and speeds as JSON; refuses a silent fallback to the built-in analytical ephemeris |
| `oracle_client.py` | runs `oracle.cjs` from Python, random epochs with a fixed seed, residual statistics; puts `build/tables/` on the Python path |
| `deflection_study.py` | studies 1 and 2 |
| `true_node_study.py` | study 3; optional argument: number of epochs (default 3000) |

These scripts are MIT-licensed like the rest of `benchmark/` (see [`../LICENSE`](../LICENSE)).
`sweph` and the Swiss Ephemeris data files are installed and downloaded separately and are never
part of the `zodiacally-ephemeris` package.
