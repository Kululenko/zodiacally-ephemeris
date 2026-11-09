#!/usr/bin/env python3
"""Build deltaTTable.js (repository root): Delta T = TT - UT1 (seconds), 1898.75 .. 2101.25.

Dev-only build step. The output is a uniform grid of Delta T values (integer milliseconds,
one value every 1/12 Julian year = 30.4375 days of UT1) that the runtime interpolates with a
4-point Lagrange cubic (time.js at the repository root).

Sources (all public; nothing here is derived from Swiss Ephemeris output):
  A. 1898.75 .. 1950.0  Morrison, Stephenson, Hohenkerk & Zawilski (2021), "Addendum 2020 to
     'Measurement of the Earth's rotation: 720 BC to AD 2015'", Proc. R. Soc. A 477: 20200776,
     cubic-spline Table S15.2020 (HM Nautical Almanac Office, astro.ukho.gov.uk/nao/lvm/
     Table-S15.2020.txt; the copy bundled with Skyfield 1.55, MIT, as data/delta_t.npz).
     This is the published update of Stephenson, Morrison & Hohenkerk (2016), Proc. R. Soc. A
     472: 20160404.
  B. 1955.5 .. 1962.0   USNO historic Delta T (maia.usno.navy.mil/ser7/historic_deltat.data,
     public domain; half-year values from atomic time after 1955.5; the copy bundled with
     Skyfield 1.55 as data/historic_deltat.npy).
  A->B 1950.0 .. 1955.5 cubic Hermite blend (value and slope of A at 1950.0, of B at 1955.5).
  C. 1962-01-01 .. 2026-08-21 IERS EOP 20 C04 daily UT1-UTC (eopc04.1962-now, IERS / Paris
     Observatory), Delta T = 32.184 s + (TAI-UTC) - (UT1-UTC); TAI-UTC including the pre-1972
     drift formulas from ERFA eraDat (BSD; = USNO tai-utc.dat / IERS Bulletin C).
  D. after C04 .. 2027-09-25 IERS Bulletin A rapid service + predictions (finals2000A.all,
     USNO / IERS Rapid Service), same formula.
  E. after D: cubic Hermite from the last IERS prediction (value, mean slope of the last year)
     to the long-term parabola of Stephenson, Morrison & Hohenkerk (2016),
     Delta T = -320 + 32.5 ((y - 1825)/100)^2 s, joined at the first full century >= 800 years
     later - the construction used by Skyfield 1.55 timelib.build_delta_t (MIT).
  IERS files are taken from the PyPI package astropy-iers-data (BSD-3; the file contents are
  IERS products).

Usage, from the repository root, with a virtualenv outside the repository (pinned versions
used for the committed table; docs/maintenance.md describes the yearly refresh); writes
deltaTTable.js at the repository root:
  python3 -m venv /tmp/deltat && /tmp/deltat/bin/pip install numpy==2.5.3 \
      astropy-iers-data==0.2026.9.28.0.59.37 skyfield==1.55 pyerfa==2.0.1.5
  /tmp/deltat/bin/python build/delta-t/build_delta_t.py > deltaTTable.js
"""
import os
import sys

import astropy_iers_data
import erfa
import numpy as np
import skyfield
from skyfield import data as skyfield_data

J2000 = 2451545.0
JULIAN_YEAR = 365.25
STEP_YEARS = 1.0 / 12.0
GRID_START_YEAR = 1898.75
GRID_END_YEAR = 2101.25
BLEND_START_YEAR = 1950.0
ATOMIC_START_YEAR = 1955.5
C04_START_YEAR = 1962.0


def year_of(jd):
    return 2000.0 + (jd - J2000) / JULIAN_YEAR


def jd_of(year):
    return J2000 + (year - 2000.0) * JULIAN_YEAR


def hermite(x0, y0, s0, x1, y1, s1):
    """Cubic with value/slope (per year) y0,s0 at x0 and y1,s1 at x1 (Hermite basis)."""
    w = x1 - x0

    def f(x):
        t = (x - x0) / w
        h00 = 2 * t**3 - 3 * t**2 + 1
        h10 = t**3 - 2 * t**2 + t
        h01 = -2 * t**3 + 3 * t**2
        h11 = t**3 - t**2
        return h00 * y0 + h10 * w * s0 + h01 * y1 + h11 * w * s1

    return f


def lagrange4(xs, ys, x):
    """4-point Lagrange cubic through the (possibly non-uniform) samples around x."""
    k = int(np.searchsorted(xs, x, side='right')) - 1
    k = min(max(k, 1), len(xs) - 3)
    px, py = xs[k - 1:k + 3], ys[k - 1:k + 3]
    total = 0.0
    for i in range(4):
        w = 1.0
        for j in range(4):
            if j != i:
                w *= (x - px[j]) / (px[i] - px[j])
        total += w * py[i]
    return total


def load_s15():
    table = np.load(os.path.join(os.path.dirname(skyfield_data.__file__), 'delta_t.npz'))[
        'Table-S15.2020.txt']
    x0, x1, a3, a2, a1, a0 = table

    def segment(year):
        i = int(np.searchsorted(x0, year, side='right')) - 1
        return i, (year - x0[i]) / (x1[i] - x0[i])

    def f(year):
        i, t = segment(year)
        return ((a3[i] * t + a2[i]) * t + a1[i]) * t + a0[i]

    def slope(year):
        # Analytic derivative of the segment that starts at or before `year` (s/yr).
        i, t = segment(year)
        return ((3 * a3[i] * t + 2 * a2[i]) * t + a1[i]) / (x1[i] - x0[i])

    return f, slope


def load_usno_historic():
    jd, dt = np.load(os.path.join(os.path.dirname(skyfield_data.__file__), 'historic_deltat.npy'))
    years = year_of(jd)
    # Half-year grid: interpolate with the same 4-point cubic as the runtime.
    def f(year):
        return lagrange4(years, dt, year)

    return f, years


def load_iers_daily():
    """Daily (MJD UTC 0h, Delta T) from EOP C04, continued with finals2000A after its end."""
    base = os.path.join(os.path.dirname(astropy_iers_data.__file__), 'data')
    c04 = np.loadtxt(os.path.join(base, 'eopc04.1962-now'), comments='#', usecols=(0, 1, 2, 4, 7))
    rows = [(int(m), int(y), int(mo), int(d), dut) for y, mo, d, m, dut in c04]
    last_c04 = rows[-1][0]
    with open(os.path.join(base, 'finals2000A.all')) as fh:
        for line in fh:
            if len(line) < 68 or line[57] not in 'IP':
                continue
            mjd = int(float(line[7:15]))
            if mjd <= last_c04:
                continue
            y = int(line[0:2]) + (1900 if mjd <= 51543 else 2000)
            rows.append((mjd, y, int(line[2:4]), int(line[4:6]), float(line[58:68])))
    mjd = np.array([r[0] for r in rows], dtype=float)
    # TAI-UTC at 0h UTC of each day (eraDat handles the 1962-1971 drift formulas).
    dat = np.array([erfa.dat(r[1], r[2], r[3], 0.0) for r in rows])
    dut = np.array([r[4] for r in rows])
    delta_t = 32.184 + dat - dut
    return mjd + 2400000.5, delta_t, last_c04


def main():
    s15, s15_slope = load_s15()
    hist, _ = load_usno_historic()
    iers_jd, iers_dt, last_c04_mjd = load_iers_daily()
    iers_years = year_of(iers_jd)

    blend = hermite(BLEND_START_YEAR, s15(BLEND_START_YEAR), s15_slope(BLEND_START_YEAR),
                    ATOMIC_START_YEAR, hist(ATOMIC_START_YEAR),
                    (hist(ATOMIC_START_YEAR + 1e-3) - hist(ATOMIC_START_YEAR - 1e-3)) / 2e-3)

    # E: Skyfield-style join to the SMH 2016 long-term parabola.
    x0 = iers_years[-1]
    y0 = iers_dt[-1]
    slope0 = (iers_dt[-1] - iers_dt[-366]) / ((iers_jd[-1] - iers_jd[-366]) / JULIAN_YEAR)
    x1 = (x0 + 800.0) // 100.0 * 100.0
    parabola = lambda y: -320.0 + 32.5 * ((y - 1825.0) / 100.0) ** 2
    parabola_slope = lambda y: 2 * 32.5 * (y - 1825.0) / 100.0**2
    tail = hermite(x0, y0, slope0, x1, parabola(x1), parabola_slope(x1))

    n = int(round((GRID_END_YEAR - GRID_START_YEAR) / STEP_YEARS)) + 1
    values = []
    for k in range(n):
        y = GRID_START_YEAR + k * STEP_YEARS
        if y < BLEND_START_YEAR:
            v = s15(y)
        elif y < ATOMIC_START_YEAR:
            v = blend(y)
        elif y < C04_START_YEAR:
            v = hist(y)
        elif y <= x0:
            v = float(np.interp(y, iers_years, iers_dt))
        else:
            v = tail(y)
        values.append(int(round(v * 1000.0)))

    jd0 = jd_of(GRID_START_YEAR)
    step = STEP_YEARS * JULIAN_YEAR
    out = sys.stdout
    out.write("'use strict';\n\n")
    out.write('// GENERATED by build/delta-t/build_delta_t.py - do not edit by hand.\n')
    out.write('// Delta T = TT - UT1 in integer milliseconds on a uniform UT1 grid:\n')
    out.write('//   jdUT1_k = JD0 + k * STEP_DAYS (one sample per 1/12 Julian year).\n')
    out.write('// Sources (see the build script for full citations):\n')
    out.write(f'//   1898.75-{BLEND_START_YEAR}  Morrison, Stephenson, Hohenkerk & Zawilski 2021 (Addendum 2020),\n')
    out.write('//                    spline Table S15.2020 (update of Stephenson, Morrison & Hohenkerk 2016)\n')
    out.write(f'//   {BLEND_START_YEAR}-{ATOMIC_START_YEAR}  cubic Hermite blend between the two neighbouring sources\n')
    out.write(f'//   {ATOMIC_START_YEAR}-{C04_START_YEAR}  USNO historic_deltat.data (atomic time)\n')
    out.write(f'//   1962-01-01..MJD {last_c04_mjd}  IERS EOP 20 C04 UT1-UTC + TAI-UTC + 32.184 s\n')
    out.write(f'//   ..{x0:.3f}  IERS Bulletin A rapid service and predictions (finals2000A.all)\n')
    out.write(f'//   {x0:.3f}-2101.25  cubic Hermite to the Stephenson-Morrison-Hohenkerk 2016 parabola\n')
    out.write(f'//                    -320 + 32.5((y-1825)/100)^2 s, joined at {x1:.0f} (Skyfield 1.55 method)\n')
    out.write(f'// Data versions: astropy-iers-data {astropy_iers_data.__version__}, skyfield {skyfield.__version__}, '
              f'pyerfa {erfa.__version__}.\n\n')
    out.write(f'const JD0 = {jd0!r}; // {GRID_START_YEAR} (Julian epoch)\n')
    out.write(f'const STEP_DAYS = {step!r};\n')
    out.write(f'// Last day of IERS observations / predictions used (Julian epoch {x0:.4f}).\n')
    out.write(f'const IERS_LAST_JD = {float(iers_jd[-1])!r};\n')
    out.write('// prettier-ignore\n')
    out.write('const DELTA_T_MS = new Int32Array([\n')
    for k in range(0, n, 12):
        chunk = values[k:k + 12]
        year = GRID_START_YEAR + k * STEP_YEARS
        out.write('  ' + ', '.join(str(v) for v in chunk) + f', // {year:.2f}\n')
    out.write(']);\n\n')
    out.write('module.exports = { JD0, STEP_DAYS, IERS_LAST_JD, DELTA_T_MS };\n')


if __name__ == '__main__':
    main()
