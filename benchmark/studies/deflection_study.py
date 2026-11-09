#!/usr/bin/env python3
"""DEV-ONLY: evidence for the light-deflection convention of build/tables/reduction.py.

Compares physically defined deflection models with the black-box oracle
(swe.calc, TT, SEFLG_SWIEPH|SEFLG_SPEED) where they differ most. Nothing is fitted.
  A) planetary deflection: Sun only vs. Sun + Jupiter + Saturn (Skyfield default),
     at the closest Uranus-Jupiter appulses 1899-2101;
  B) Sun's deflection for rays behind the solar disc: point mass vs. enclosed mass
     (n=3 polytrope) vs. none, at the deepest Mercury/Jupiter superior conjunctions.

    build/tables/.venv/bin/python benchmark/studies/deflection_study.py
"""
import numpy as np
from skyfield.functions import length_of, mxm, mxv, rot_x
from skyfield.nutationlib import iau2000a_radians, mean_obliquity
from skyfield.relativity import (_compute_deflection, _compute_deflector_position, add_aberration,
                                 rmasses)

from oracle_client import angle_diff_arcsec, call_oracle
import reduction as R  # noqa: E402  (build/tables, put on sys.path by oracle_client)

eph = R.ephemeris()
C_AUDAY = 173.1446326742403


def longitude(code, jd, sun='polytrope', planets=False):
    """Apparent longitude of date [deg] with a selectable deflection model."""
    t = R.tt(jd)
    obs = eph['earth'].at(t)
    astrometric = obs.observe(eph[code])
    p = astrometric.xyz.au.copy()
    tlt = length_of(p) / C_AUDAY
    pe = _compute_deflector_position(t, obs.xyz.au, p, eph[10], tlt)
    d = _compute_deflection(p, pe, 1.0)
    if sun == 'polytrope':
        emag = length_of(pe)
        cos_t = -np.einsum('i...,i...->...', p, pe) / (length_of(p) * emag)
        b = emag * np.sqrt(np.clip(1 - cos_t * cos_t, 0.0, None)) / R.SUN_RADIUS_AU
        behind = (cos_t > 0) & (length_of(p) > emag * cos_t)
        s_grid, f_grid = R._sun_projected_mass_fraction()
        d = d * np.where(behind & (b < 1.0), np.interp(b, s_grid, f_grid), 1.0)
    elif sun == 'none':
        d = d * 0.0
    p += d
    if planets:
        for c, rmass in ((5, rmasses[599]), (6, rmasses[699])):
            p += _compute_deflection(p, _compute_deflector_position(t, obs.xyz.au, p, eph[c], tlt), rmass)
    add_aberration(p, obs.velocity.au_per_d, astrometric.light_time)
    _, d_eps = iau2000a_radians(t)
    xyz = mxv(mxm(rot_x(-(mean_obliquity(t.tdb) * R.ASEC2RAD + d_eps)), t.M), p)
    return np.degrees(np.arctan2(xyz[1], xyz[0])) % 360.0


def separation_deg(code_a, code_b, jd):
    t = R.tt(jd)
    obs = eph['earth'].at(t)
    a = obs.observe(eph[code_a]).xyz.au
    b = obs.observe(eph[code_b]).xyz.au
    return np.degrees(np.arccos(np.clip((a * b).sum(0) / length_of(a) / length_of(b), -1, 1)))


def closest_events(code_a, code_b, count):
    jd = np.arange(2414660.5, 2488430.5, 0.5)
    sep = separation_deg(code_a, code_b, jd)
    i = np.where((sep[1:-1] < sep[:-2]) & (sep[1:-1] <= sep[2:]))[0] + 1
    i = i[np.argsort(sep[i])][:count]
    out = []
    for k in sorted(i):  # refine the minimum to 0.01 d
        fine = jd[k] + np.arange(-0.5, 0.5, 0.01)
        s = separation_deg(code_a, code_b, fine)
        out.append((fine[np.argmin(s)], s.min()))
    return out


def rms(x):
    return float(np.sqrt(np.mean(np.square(x))))


def main():
    print('A) planetary deflection at Uranus-Jupiter appulses (residual ours - oracle, mas)')
    for t0, sep in closest_events(7, 5, 2):
        jd = t0 + np.arange(-3.0, 3.0001, 0.05)
        o, _ = call_oracle(jd, ['uranus'])
        for label, planets in (('Sun only', False), ('Sun+Jupiter+Saturn', True)):
            r = angle_diff_arcsec(longitude(7, jd, planets=planets), o['uranus'][0]) * 1000
            print(f'  JD {t0:.2f} sep {sep * 3600:5.1f}"  {label:19s} rms {rms(r - r.mean()):.3f} '
                  f'(scatter around mean)  max {np.abs(r).max():.3f}')

    print('B) Sun deflection for rays behind the solar disc (residual ours - oracle, arcsec)')
    for code, body in ((199, 'mercury'), (5, 'jupiter')):
        for t0, sep in closest_events(code, 10, 2):
            jd = t0 + np.arange(-1.0, 1.0001, 0.02)
            o, _ = call_oracle(jd, [body])
            res = {m: angle_diff_arcsec(longitude(code, jd, sun=m), o[body][0])
                   for m in ('point', 'polytrope', 'none')}
            print(f'  {body:8s} JD {t0:.2f} min elongation {sep:.3f} deg: '
                  + '  '.join(f'{m} rms {rms(v):.4f} max {np.abs(v).max():.4f}' for m, v in res.items()))


if __name__ == '__main__':
    main()
