"""Direct (non-tabulated) evaluation of every quantity the Zodiacally tables hold.

All inputs are Julian Dates in Terrestrial Time (TT); all outputs are degrees.
Sources: JPL DE440s (public domain) read through Skyfield (MIT) / jplephem (MIT);
Chiron from the JPL Horizons small-body integrator (public domain, see horizons.py).
No Swiss Ephemeris code or data is used here. Three discrete conventions below (light
deflection by the Sun only, the enclosed-mass model for rays behind the solar disc, the
true-node variant) were chosen between published alternatives by comparing residuals
against Swiss Ephemeris output (benchmark/studies/deflection_study.py and
true_node_study.py); no coefficient or continuous parameter was fitted to that output.
"""
import os

import numpy as np
from skyfield.api import Loader
from skyfield.nutationlib import iau2000a_radians, mean_obliquity
from skyfield.precessionlib import compute_precession
from skyfield.functions import mxm, mxv, rot_x
from skyfield.vectorlib import VectorFunction

HERE = os.path.dirname(os.path.abspath(__file__))
CACHE = os.path.join(HERE, '.cache')
DE_FILE = 'de440s.bsp'

ASEC2RAD = np.pi / 648000.0
RAD2DEG = 180.0 / np.pi

# NAIF ids in DE440s. Mars..Pluto are system barycentres: DE440s carries no
# planet-centre offsets for them (see README.de.md, "Konventionen"; docs/conventions.md).
NAIF = {
    'sun': 10, 'moon': 301, 'mercury': 199, 'venus': 299, 'mars': 4,
    'jupiter': 5, 'saturn': 6, 'uranus': 7, 'neptune': 8, 'pluto': 9,
}

_loader = Loader(CACHE, verbose=False)
ts = _loader.timescale(builtin=True)
_eph = None
_chiron = None


def ephemeris():
    global _eph
    if _eph is None:
        path = os.path.join(CACHE, DE_FILE)
        if not os.path.exists(path):
            raise FileNotFoundError(f'{path} missing - run build.sh (it downloads DE440s)')
        _eph = _loader(DE_FILE)
    return _eph


def tt(jd_tt):
    return ts.tt_jd(np.asarray(jd_tt, dtype=float))


# ------------------------------------------------- light deflection by the Sun

SUN_RADIUS_AU = 695700.0 / 149597870.7  # IAU 2015 Resolution B3 nominal solar radius
_projected_mass = None


def _sun_projected_mass_fraction():
    """Fraction F(s) of the solar mass inside a cylinder of radius s*R (0 <= s <= 1)
    for the n = 3 polytrope (Eddington's standard model of the Sun; Chandrasekhar,
    "An Introduction to the Study of Stellar Structure", 1939, ch. IV).

    For a spherically symmetric lens the weak-field deflection of a ray with impact
    parameter b is 4 G M(<b) / (c^2 b), with M(<b) the mass inside the cylinder of
    radius b (Schneider, Ehlers & Falco, "Gravitational Lenses", 1992, axially symmetric lenses).
    Outside the limb this is the usual point-mass formula; inside it, it removes the
    unphysical 1/b spike of the point-mass formula for bodies behind the solar disc.
    """
    global _projected_mass
    if _projected_mass is not None:
        return _projected_mass
    # Lane-Emden equation theta'' + 2/xi theta' + theta^3 = 0, RK4, series start.
    h = 1e-4
    xi = 1e-3
    th, dth = 1 - xi**2 / 6 + xi**4 / 120, -xi / 3 + xi**3 / 30
    xs, rho = [xi], [th**3]

    def acc(x, a, b):
        return -2.0 / x * b - max(a, 0.0) ** 3

    while th > 0:
        k1a, k1b = dth, acc(xi, th, dth)
        k2a, k2b = dth + h / 2 * k1b, acc(xi + h / 2, th + h / 2 * k1a, dth + h / 2 * k1b)
        k3a, k3b = dth + h / 2 * k2b, acc(xi + h / 2, th + h / 2 * k2a, dth + h / 2 * k2b)
        k4a, k4b = dth + h * k3b, acc(xi + h, th + h * k3a, dth + h * k3b)
        th += h / 6 * (k1a + 2 * k2a + 2 * k3a + k4a)
        dth += h / 6 * (k1b + 2 * k2b + 2 * k3b + k4b)
        xi += h
        xs.append(xi)
        rho.append(max(th, 0.0) ** 3)
    r = np.array(xs) / xi                       # radius in units of R
    dm = 4 * np.pi * r * r * np.array(rho)      # shell mass density
    s = np.linspace(0.0, 1.0, 2001)
    frac = np.empty_like(s)
    total = np.trapezoid(dm, r)
    for i, b in enumerate(s):
        # share of each spherical shell inside the cylinder: 1 - sqrt(1 - b^2/r^2) for r > b
        w = np.where(r <= b, 1.0, 1.0 - np.sqrt(np.clip(1.0 - (b / r) ** 2, 0.0, 1.0)))
        frac[i] = np.trapezoid(dm * w, r) / total
    frac[-1] = 1.0
    _projected_mass = (s, frac)
    return _projected_mass


def _apparent_icrs(target, t):
    """Apparent geocentric direction (GCRS axes, au) of `target`.

    Same chain as Skyfield `observe().apparent()` (IERS Conventions 2010 ch. 7;
    Explanatory Supplement 3rd ed. sec. 7.2; Kaplan et al. 1989, AJ 97, 1197):
    light-time iterated barycentric position, gravitational deflection by the
    Sun (Sun taken at the time of closest approach of the ray), relativistic
    annual aberration with the barycentric velocity of the geocentre.
    Two documented choices differ from Skyfield's defaults. Both were selected by
    comparing residuals against Swiss Ephemeris output (benchmark/studies/deflection_study.py;
    README.de.md "Konventionen", docs/conventions.md):
    - deflection by the Sun only (Skyfield also adds Jupiter and Saturn, <= 16 mas
      at the limb, i.e. relevant only within arcminutes of those planets). JPL Horizons
      also uses Sun-only deflection ("Rel. light bend : Sun" in its headers). At the closest
      Uranus-Jupiter appulses 1899-2101 (56", 76") the residual scatters by 0.14-0.20 mas
      (rms) with Sun-only deflection and by 0.67-0.98 mas with Jupiter and Saturn added
      (Jupiter signature).
    - for rays passing behind the solar disc the Sun's deflection uses the enclosed
      (projected) mass of an n = 3 polytrope instead of a point mass, see
      _sun_projected_mass_fraction.
    """
    from skyfield.constants import C_AUDAY
    from skyfield.functions import length_of
    from skyfield.relativity import _compute_deflection, _compute_deflector_position, add_aberration
    eph = ephemeris()
    observer = eph['earth'].at(t)
    astrometric = observer.observe(target)
    p = astrometric.xyz.au.copy()
    tlt = length_of(p) / C_AUDAY
    pe = _compute_deflector_position(t, observer.xyz.au, p, eph[10], tlt)
    # point-mass deflection, Kaplan et al. 1989 / NOVAS grav_vec as in Skyfield relativity.py
    d = _compute_deflection(p, pe, 1.0)
    # impact parameter b of the observer->target ray relative to the Sun centre
    emag = length_of(pe)
    cos_t = -np.einsum('i...,i...->...', p, pe) / (length_of(p) * emag)
    b = emag * np.sqrt(np.clip(1 - cos_t * cos_t, 0.0, None))
    behind = (cos_t > 0) & (length_of(p) > emag * cos_t)  # the ray passes the Sun
    s_grid, f_grid = _sun_projected_mass_fraction()
    s = b / SUN_RADIUS_AU
    p += d * np.where(behind & (s < 1.0), np.interp(s, s_grid, f_grid), 1.0)
    add_aberration(p, observer.velocity.au_per_d, astrometric.light_time)
    return p


def _apparent_ecliptic_longitude(target, jd_tt):
    """Apparent geocentric ecliptic longitude of date [deg]: _apparent_icrs rotated
    ICRS -> true equator and equinox of date (frame bias, IAU 2006 precession,
    IAU 2000A nutation; IERS Conventions 2010 ch. 5, Skyfield t.M) and about x by
    the true obliquity (IAU 2006 mean obliquity + delta-epsilon) into the true
    ecliptic of date (Skyfield framelib.build_ecliptic_matrix)."""
    t = tt(jd_tt)
    p = _apparent_icrs(target, t)
    _, d_eps = iau2000a_radians(t)
    eps_true = mean_obliquity(t.tdb) * ASEC2RAD + d_eps
    xyz = mxv(mxm(rot_x(-eps_true), t.M), p)
    return np.arctan2(xyz[1], xyz[0]) * RAD2DEG % 360.0


def apparent_longitude(body, jd_tt):
    if body == 'chiron':
        return _apparent_ecliptic_longitude(chiron_target(), jd_tt)
    return _apparent_ecliptic_longitude(ephemeris()[NAIF[body]], jd_tt)


def nutation_longitude(jd_tt):
    """delta-psi [deg], IAU 2000A (Mathews et al. 2002; IERS Conventions 2010 sec. 5.5.4),
    full 1365-term series as implemented by Skyfield `iau2000a`."""
    d_psi, _ = iau2000a_radians(tt(jd_tt))
    return d_psi * RAD2DEG


def true_obliquity(jd_tt):
    """True obliquity of date [deg] = IAU 2006 mean obliquity (Capitaine et al. 2003
    eq. 37/39; IERS Conventions 2010 eq. 5.40) + IAU 2000A delta-epsilon."""
    t = tt(jd_tt)
    _, d_eps = iau2000a_radians(t)
    return mean_obliquity(t.tdb) / 3600.0 + d_eps * RAD2DEG


# ---------------------------------------------------------------- true node

def _moon_geocentric_state(t):
    """Geometric geocentric Moon state (ICRS axes, au and au/day) from DE440s:
    (EMB->Moon) - (EMB->Earth)."""
    eph = ephemeris()
    moon = eph[301].at(t)   # SSB -> EMB -> Moon
    earth = eph[399].at(t)  # SSB -> EMB -> Earth
    return moon.xyz.au - earth.xyz.au, moon.velocity.au_per_d - earth.velocity.au_per_d


def _node_longitude(h):
    """Longitude of the ascending node of the plane normal to h, in the frame of h:
    node direction = z x h = (-h_y, h_x, 0)  (Explanatory Supplement 3rd ed. sec. 8.10;
    Meeus ch. 33 for orbital elements from state vectors)."""
    return np.arctan2(h[0], -h[1]) * RAD2DEG % 360.0


TRUE_NODE_VARIANTS = (
    'geometric_trueEclipticOfDate',
    'geometric_trueEclipticOfDate_noFrameBias',
    'geometric_meanEquinoxOfDate',
    'geometric_eclipticJ2000',
    'lightTimeRetarded_trueEclipticOfDate',
)
# Chosen by benchmark/studies/true_node_study.py: of the physically defined variants
# above, the one with the smallest residual against Swiss Ephemeris output (SE_TRUE_NODE);
# nothing fitted - see README.de.md "Konventionen" and docs/conventions.md.
TRUE_NODE_VARIANT = 'lightTimeRetarded_trueEclipticOfDate'


def true_node_longitude(jd_tt, variant=TRUE_NODE_VARIANT):
    """Osculating (true) ascending node of the geocentric lunar orbit [deg].

    h = r x v of the geocentric Moon (DE440s, ICRS axes) is the normal of the
    instantaneous Keplerian orbit; its node on the ecliptic follows from
    _node_longitude. h is computed in the inertial frame and then rotated, so no
    frame-rotation velocity enters. The true ecliptic of date is R1(eps_A + d_eps) N P B
    = R3(-d_psi) R1(eps_A) P B (IERS Conventions 2010 eqs. 5.21, 5.39-5.40), i.e. the
    mean ecliptic of date with the equinox shifted by the nutation in longitude.
    """
    from skyfield.framelib import ICRS_to_J2000 as B  # frame bias, IERS 2010 eq. 5.21
    t = tt(jd_tt)
    if variant.startswith('lightTimeRetarded'):
        r, _ = _moon_geocentric_state(t)
        tau = np.sqrt((r * r).sum(axis=0)) / 173.1446326742403  # c in au/day
        r, v = _moon_geocentric_state(ts.tt_jd(t.tt - tau))
    else:
        r, v = _moon_geocentric_state(t)
    h = np.cross(r, v, axis=0)
    eps_a = mean_obliquity(t.tdb) * ASEC2RAD
    d_psi, _ = iau2000a_radians(t)
    if variant == 'geometric_eclipticJ2000':
        return _node_longitude(mxv(mxm(rot_x(-84381.406 * ASEC2RAD), B), h))
    P = compute_precession(t.tdb)
    bias = B if variant != 'geometric_trueEclipticOfDate_noFrameBias' else np.eye(3)
    node_mean = _node_longitude(mxv(mxm(rot_x(-eps_a), mxm(P, bias)), h))
    if variant == 'geometric_meanEquinoxOfDate':
        return node_mean
    return (node_mean + d_psi * RAD2DEG) % 360.0


# ---------------------------------------------------------------- Chiron

class _InterpolatedTarget(VectorFunction):
    """Barycentric (ICRS) position/velocity from a tabulated grid, used as a
    Skyfield target so that Chiron goes through the same apparent-place chain."""

    def __init__(self, target, jd_tdb, pos, vel):
        self.center = 0
        self.target = target
        self.target_name = 'Chiron (JPL Horizons 2060)'
        self._jd = jd_tdb
        self._pos = pos
        self._vel = vel

    def _at(self, t):
        from horizons import interpolate_state
        p, v = interpolate_state(self._jd, self._pos, self._vel, t.whole + t.tdb_fraction)
        return p, v, None, None


def chiron_target():
    global _chiron
    if _chiron is None:
        from horizons import load_chiron_states
        jd, pos, vel = load_chiron_states()
        _chiron = _InterpolatedTarget(2060, jd, pos, vel)
    return _chiron
