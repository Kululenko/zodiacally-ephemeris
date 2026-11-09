#!/usr/bin/env python3
"""Offline builder for the Zodiacally ephemeris tables (data/ at the repository root).

    sh build/tables/build.sh                  # creates the venv, downloads, builds
    .venv/bin/python build.py [--only sun,moon] [--explore body LxN ...]   # in build/tables/

Reads only public-domain JPL data (DE440s, Horizons) through MIT/BSD libraries.
It never imports sweph or anything under benchmark/ (clean-room rule). Three discrete
conventions in reduction.py (Sun-only light deflection, the enclosed-mass model behind the
solar disc, the true-node variant) were chosen between published alternatives by comparing
residuals against Swiss Ephemeris output (benchmark/studies/); nothing was fitted to it.
Deterministic on one platform: the same inputs give byte-identical .bin files, manifest and
fixture (verified on macOS/arm64). On other platforms floating-point results differ in the last
bits; build/compare-tables.mjs checks that such a rebuild is numerically equivalent.
"""
import argparse
import hashlib
import json
import os
import sys
import time

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import chebyshev as C  # noqa: E402
import horizons  # noqa: E402
import reduction as R  # noqa: E402

REPO = os.path.abspath(os.path.join(HERE, '..', '..'))
# Public repository layout; override with environment variables to build elsewhere.
OUT_DIR = os.environ.get('ZODIACALLY_EPHEMERIS_OUT_DIR', os.path.join(REPO, 'data'))
FIXTURE = os.environ.get('ZODIACALLY_EPHEMERIS_FIXTURE', os.path.join(REPO, 'test', 'fixtures', 'reference.json'))
# Written to manifest.json as "createdBy". It keeps the path this script had in the original
# October 2026 build (now build/tables/build.py), so that a rebuild reproduces the committed
# manifest and its published SHA-256 byte for byte.
VERSION = 'tools/ephemeris-build/build.py 1.1.0'

DE440S = {'file': 'de440s.bsp', 'url': 'https://ssd.jpl.nasa.gov/ftp/eph/planets/bsp/de440s.bsp',
          'bytes': 32726016,
          'sha256': 'c1c7feeab882263fc493a9d5a5b2ddd71b54826cdf65d8d17a76126b260a49f2'}

JD_START = 2414655.5          # 1899-01-01 TT, start of every table
JD_REQUIRED_END = 2488434.5   # 2101-01-01 TT, every table ends on or after this
CHECKS_PER_RECORD = 24        # includes both record ends
FIT_LIMIT_ARCSEC = 0.0005     # 0.5 mas
# Records next to a superior solar conjunction (see refine_solar_conjunctions).
CUSP_CHECK_DEG = 3.0          # examine records that pass within this elongation
DENSE_POINTS = 401            # ~1 h spacing for 16-day records
SUB_CHECKS = 24               # minimum verification points per sub-record, ends included
SUB_MIN_DAYS = 1.0 / 256      # a sub-record shorter than this means the split does not converge
SOLAR_REFINED = {}
CHUNK = 20000
FIXTURE_SEED = 20261003

# name: (intervalDays, coefficients, angle, quantity). Smallest size that kept the
# fit error <= 0.5 mas in a parameter sweep (build.py --explore, see README.de.md "Tabellen").
# Records of more than ~16 days need many more coefficients for the planets because
# of the Earth's monthly wobble around the Earth-Moon barycentre (parallax term).
APPARENT = 'apparent geocentric ecliptic longitude of date (true equinox)'
SPEC = {
    'sun': (32, 22, True, APPARENT),
    'moon': (16, 22, True, APPARENT),
    'mercury': (16, 15, True, APPARENT),
    'venus': (16, 14, True, APPARENT),
    'mars': (16, 14, True, APPARENT + ', Mars system barycentre'),
    'jupiter': (16, 14, True, APPARENT + ', Jupiter system barycentre'),
    'saturn': (16, 14, True, APPARENT + ', Saturn system barycentre'),
    'uranus': (16, 14, True, APPARENT + ', Uranus system barycentre'),
    'neptune': (16, 14, True, APPARENT + ', Neptune system barycentre'),
    'pluto': (16, 14, True, APPARENT + ', Pluto system barycentre'),
    'chiron': (16, 14, True, APPARENT),
    'trueNode': (16, 20, True, 'osculating ascending node of the geocentric lunar orbit, '
                 'longitude of date (true equinox)'),
    'nutationLongitude': (32, 22, False, 'nutation in longitude delta-psi, IAU 2000A'),
    'trueObliquity': (32, 20, False, 'true obliquity of date: IAU 2006 mean obliquity + '
                      'IAU 2000A delta-epsilon'),
}
BODIES = ('sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus',
          'neptune', 'pluto', 'chiron')


def direct(name, jd):
    """Direct (non-tabulated) evaluation in chunks, degrees."""
    jd = np.asarray(jd, dtype=float)
    out = np.empty_like(jd)
    for a in range(0, len(jd), CHUNK):
        sl = jd[a:a + CHUNK]
        if name in BODIES:
            out[a:a + CHUNK] = R.apparent_longitude(name, sl)
        elif name == 'trueNode':
            out[a:a + CHUNK] = R.true_node_longitude(sl)
        elif name == 'nutationLongitude':
            out[a:a + CHUNK] = R.nutation_longitude(sl)
        elif name == 'trueObliquity':
            out[a:a + CHUNK] = R.true_obliquity(sl)
        else:
            raise KeyError(name)
    return out


def direct_rate(name, jd, h=0.01):
    """d value / dt [deg/day], five-point central difference of direct values
    (Abramowitz & Stegun 25.3.6; truncation error h^4 f^(5) / 30)."""
    jd = np.asarray(jd, dtype=float)
    f = [direct(name, jd + k * h) for k in (-2, -1, 1, 2)]
    if SPEC[name][2]:
        f = [f0 - 360.0 * np.round((f0 - f[1]) / 360.0) for f0 in f]  # unwrap near 0/360
    return (f[0] - 8.0 * f[1] + 8.0 * f[2] - f[3]) / (12.0 * h)


def table_layout(interval):
    n_records = int(np.ceil((JD_REQUIRED_END - JD_START) / interval))
    return n_records, JD_START + n_records * interval


def build_table(name, interval, n, angle):
    """Returns (coeffs, refined, jd_end, err_rec, err_pts, tc). refined lists the sub-records
    (start, end, coeffs) that replace main records next to a superior solar conjunction."""
    n_records, jd_end = table_layout(interval)
    xs = C.lobatto_x(n)
    starts = JD_START + np.arange(n_records) * interval
    # Lobatto points run from x=+1 to x=-1; record ends are shared by neighbours.
    nodes = starts[:, None] + (xs[None, :] + 1.0) * (interval / 2.0)
    values = direct(name, nodes.ravel()).reshape(nodes.shape)
    if angle:
        # continuous inside each record, record-end value (x=-1 -> last column) in [0, 360)
        values = np.unwrap(values, period=360.0, axis=1)
        values -= 360.0 * np.floor(values[:, -1:] / 360.0)
    coeffs = C.fit_records(values)

    # Verification against direct evaluation at equally spaced points, ends included.
    xc = np.linspace(-1.0, 1.0, CHECKS_PER_RECORD)
    tc = starts[:, None] + (xc[None, :] + 1.0) * (interval / 2.0)
    truth = direct(name, tc.ravel()).reshape(tc.shape)

    refined, dense_err = [], None
    if name in BODIES and name not in ('sun', 'moon'):
        val, _ = C.evaluate(np.repeat(coeffs, CHECKS_PER_RECORD, axis=0), np.tile(xc, n_records))
        err_rec = (np.abs((val.reshape(tc.shape) - truth + 180.0) % 360.0 - 180.0) * 3600.0).max(axis=1)
        refined, dense_err = refine_solar_conjunctions(name, coeffs, starts, interval, n, err_rec, truth, tc)
    val, _ = C.eval_table(coeffs, JD_START, interval, tc.ravel(), refined)
    err = val.reshape(tc.shape) - truth
    if angle:
        err = (err + 180.0) % 360.0 - 180.0
    err_pts = np.abs(err) * 3600.0
    err_rec = err_pts.max(axis=1)
    if dense_err is not None:
        err_rec = np.maximum(err_rec, dense_err)
    return coeffs, refined, jd_end, err_rec, err_pts, tc


def refine_solar_conjunctions(name, coeffs, starts, interval, n, err_rec, truth, tc):
    """Records next to a superior solar conjunction: the Sun's light deflection (up to 1.75" at
    the limb, changing within hours) cannot be interpolated by one polynomial per 16-day record;
    the interpolation error reaches arcseconds and spreads over the whole record. Every record that
    exceeds FIT_LIMIT_ARCSEC at its regular checks or passes within CUSP_CHECK_DEG of the Sun is
    checked at DENSE_POINTS direct values (the regular checks can miss the cusp). A record above
    FIT_LIMIT_ARCSEC there is replaced by sub-records (split_record). Returns the sub-records in
    time order and the per-record dense maximum error (0 for records not examined)."""
    sun = direct('sun', tc.ravel()).reshape(tc.shape)
    elong = np.abs((truth - sun + 180.0) % 360.0 - 180.0).min(axis=1)
    examine = np.where((err_rec > FIT_LIMIT_ARCSEC) | (elong < CUSP_CHECK_DEG))[0]
    dense_err = np.zeros(len(starts))
    refined = []
    if not len(examine):
        return refined, dense_err
    xd = np.linspace(-1.0, 1.0, DENSE_POINTS)
    td = starts[examine, None] + (xd[None, :] + 1.0) * (interval / 2.0)
    f = direct(name, td.ravel()).reshape(td.shape)
    lob, _ = C.evaluate(np.repeat(coeffs[examine], DENSE_POINTS, axis=0), np.tile(xd, len(examine)))
    e_lob = (np.abs((lob.reshape(td.shape) - f + 180.0) % 360.0 - 180.0) * 3600.0).max(axis=1)
    worst = []
    for row, i in enumerate(examine):
        dense_err[i] = e_lob[row]
        if e_lob[row] <= FIT_LIMIT_ARCSEC:
            continue
        subs = split_record(name, starts[i], starts[i] + interval, n, interval / (DENSE_POINTS - 1))
        val, _ = C.eval_table(coeffs, JD_START, interval, td[row], subs)
        dense_err[i] = (np.abs((val - f[row] + 180.0) % 360.0 - 180.0) * 3600.0).max()
        refined.extend(subs)
        worst.append((e_lob[row], float(td[row][np.argmax(np.abs((lob.reshape(td.shape)[row] - f[row] + 180.0) % 360.0 - 180.0))])))
    SOLAR_REFINED[name] = {
        'recordsExamined': int(len(examine)),
        'recordsRefined': int(len(worst)),
        'subRecords': len(refined),
        'maxArcsecBeforeRefinement': float(max((w[0] for w in worst), default=0.0)),
        # epochs of the largest single-record interpolation errors, for the reference fixture
        'worstEpochs': [jd for _, jd in sorted(worst, reverse=True)[:20]],
    }
    return refined, dense_err


def split_record(name, lo, hi, n, spacing):
    """Lobatto interpolation of [lo, hi] with n coefficients (as the main records, so
    neighbouring sub-records and records share their end points), halved until it meets
    FIT_LIMIT_ARCSEC at equally spaced points no farther apart than `spacing` (the dense check
    that flagged the record; at least SUB_CHECKS). Halving 16-day records keeps every boundary
    an exact binary fraction. Returns [(start, end, coeffs)] in time order."""
    nodes = lo + (C.lobatto_x(n) + 1.0) * ((hi - lo) / 2.0)
    values = np.unwrap(direct(name, nodes), period=360.0)
    values -= 360.0 * np.floor(values[-1] / 360.0)  # start value (x=-1, last node) in [0, 360)
    coeffs = C.fit_records(values[None, :])[0]
    checks = max(SUB_CHECKS, int(np.ceil((hi - lo) / spacing)) + 1)
    xc = np.linspace(-1.0, 1.0, checks)
    val, _ = C.evaluate(np.repeat(coeffs[None, :], checks, axis=0), xc)
    truth = direct(name, lo + (xc + 1.0) * ((hi - lo) / 2.0))
    if (np.abs((val - truth + 180.0) % 360.0 - 180.0) * 3600.0).max() <= FIT_LIMIT_ARCSEC:
        return [(float(lo), float(hi), coeffs)]
    if hi - lo <= SUB_MIN_DAYS:
        raise SystemExit(f'{name}: sub-record {lo}..{hi} does not reach {FIT_LIMIT_ARCSEC}"')
    mid = lo + (hi - lo) / 2.0
    return split_record(name, lo, mid, n, spacing) + split_record(name, mid, hi, n, spacing)


def solar_elongation_min(name, tc):
    """Smallest |longitude difference| to the Sun inside each record [deg] (for reporting)."""
    if name not in BODIES or name == 'sun':
        return None
    sun = direct('sun', tc.ravel()).reshape(tc.shape)
    body = direct(name, tc.ravel()).reshape(tc.shape)
    return np.abs((body - sun + 180.0) % 360.0 - 180.0).min(axis=1)


def sha256_file(path):
    h = hashlib.sha256()
    with open(path, 'rb') as f:
        for block in iter(lambda: f.read(1 << 20), b''):
            h.update(block)
    return h.hexdigest()


def verify_de440s():
    path = os.path.join(R.CACHE, DE440S['file'])
    size = os.path.getsize(path)
    digest = sha256_file(path)
    if size != DE440S['bytes'] or digest != DE440S['sha256']:
        raise SystemExit(f'DE440s mismatch: {size} bytes, sha256 {digest}')
    eph = R.ephemeris()
    for seg in eph.spk.segments:
        if seg.start_jd > JD_START - 10 or seg.end_jd < JD_REQUIRED_END + 400:
            raise SystemExit('DE440s does not cover the table range')
    return {'url': DE440S['url'], 'bytes': size, 'sha256': digest,
            'license': 'JPL/NASA, U.S. Government work (public domain)',
            'reference': 'Park et al. 2021, AJ 161:105, doi:10.3847/1538-3881/abd414'}


def chiron_interpolation_check():
    """Cubic Hermite error estimate: interpolate the 8-day subgrid at the skipped
    4-day points; the error on the 4-day grid is ~16x smaller (O(h^4))."""
    jd, pos, vel = horizons.load_chiron_states()
    p8, _ = horizons.interpolate_state(jd[::2], pos[:, ::2], vel[:, ::2], jd[1:-1:2], step=8.0)
    truth = pos[:, 1:-1:2]
    err_rad = np.sqrt(((p8 - truth) ** 2).sum(axis=0) / (truth ** 2).sum(axis=0))
    return float(err_rad.max() * 206264.806 / 16.0)


def reference_epochs(name, interval, jd_end, rng):
    jd = list(rng.uniform(JD_START, jd_end, 300))
    kinds = ['random'] * 300
    # record boundaries next to 1899-01-01, 1900-01-01, 2000-01-01, 2100-12-31 (TT),
    # plus the exact table ends
    for target in (2414655.5, 2415020.5, 2451544.5, 2488068.5):
        b = JD_START + round((target - JD_START) / interval) * interval
        for t, kind in ((b, 'boundary'), (b - 1e-6, 'boundary-1e-6'), (b + 1e-6, 'boundary+1e-6')):
            if JD_START <= t <= jd_end:
                jd.append(t)
                kinds.append(kind)
    jd += [JD_START, jd_end]
    kinds += ['tableStart', 'tableEnd']
    # where one 16-day polynomial was worst: inside refined records (superior conjunctions)
    for t in SOLAR_REFINED.get(name, {}).get('worstEpochs', []):
        jd.append(t)
        kinds.append('conjunction')
    order = np.argsort(jd, kind='stable')
    return np.array(jd)[order], [kinds[i] for i in order]


def fit_report(name, err_rec, err_pts, tc):
    """Fit-error summary for manifest.sources.fitReport (err_rec: dense maximum for the
    records examined next to a superior solar conjunction, including their sub-records)."""
    rep = {'maxArcsec': float(err_rec.max())}
    elong = solar_elongation_min(name, tc)
    if elong is not None:
        far = err_rec[elong >= 1.0]
        rep['maxArcsecWhereSolarElongationAtLeast1deg'] = float(far.max())
    rep['fractionOfTimeAboveArcsec'] = {str(lim): float(np.mean(err_pts > lim)) for lim in (0.0005, 0.01, 0.05)}
    if name in SOLAR_REFINED:
        rep.update({k: v for k, v in SOLAR_REFINED[name].items() if k != 'worstEpochs'})
    return rep


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--only', help='comma separated table names (debug; no manifest written)')
    ap.add_argument('--explore', nargs='+', metavar='ARG',
                    help='name LxN [LxN ...]: report fit errors/sizes without writing')
    args = ap.parse_args()
    np.seterr(all='ignore')

    if args.explore:
        name, specs = args.explore[0], args.explore[1:]
        for s in specs:
            L, n = (float(x) for x in s.split('x'))
            t0 = time.time()
            _, _, _, err_rec, _, tc = build_table(name, L, int(n), SPEC[name][2])
            elong = solar_elongation_min(name, tc)
            n_rec = len(err_rec)
            line = f'{name} {s}: {n_rec * int(n) * 8 / 1024:.0f} KiB max {err_rec.max() * 1000:.3f} mas'
            if elong is not None:
                for lim in (1, 3, 10):
                    line += f' | elong>={lim}deg: {err_rec[elong >= lim].max() * 1000:.3f} mas'
                line += f' | records >0.5mas: {np.sum(err_rec > FIT_LIMIT_ARCSEC)}/{n_rec}'
            print(line + f' ({time.time() - t0:.0f}s)', flush=True)
        return

    names = args.only.split(',') if args.only else list(SPEC)
    os.makedirs(OUT_DIR, exist_ok=True)
    sources = {
        'de440s': verify_de440s(),
        'chironHorizons': horizons.source_info(),
        'software': {'skyfield': __import__('skyfield').__version__,
                     'jplephem': __import__('jplephem').__version__,
                     'numpy': np.__version__},
        'conventions': {
            'timeScale': 'TT; DE440s and Horizons are read at TDB = TT + periodic terms (Skyfield)',
            'apparentPlace': 'observer = geocentre; light-time iteration; light deflection by the '
                             'Sun only (rays behind the solar disc: enclosed mass of an n=3 polytrope); '
                             'relativistic annual aberration',
            'frame': 'GCRS -> true equator/equinox of date by frame bias + IAU 2006 precession + '
                     'IAU 2000A nutation, then x-rotation by the true obliquity (true ecliptic of date)',
            'planets': 'Mars..Pluto are system barycentres (as in DE440s)',
            'trueNode': R.TRUE_NODE_VARIANT + ': h = r x v of the geocentric Moon (DE440s) at the '
                        'light-time retarded epoch, node on the mean ecliptic of date (IAU 2006) '
                        'plus delta-psi (IAU 2000A)',
            'chebyshev': 'per record: interpolation at the n Chebyshev-Lobatto points (record ends '
                         'shared by neighbours); verified at 24 equally spaced points per record. '
                         f'Planet/Chiron records within {CUSP_CHECK_DEG:g} deg of the Sun or above '
                         f'{FIT_LIMIT_ARCSEC * 1000:g} mas: checked at {DENSE_POINTS} points; a record above '
                         f'{FIT_LIMIT_ARCSEC * 1000:g} mas there is replaced by halved sub-records '
                         '(<name>.refined.bin, same interpolation and n) until each meets it at '
                         f'{SUB_CHECKS} points',
        },
        'fitReport': {},
    }
    if 'chiron' in names:
        sources['chironHorizons']['hermiteInterpolationErrorArcsec'] = chiron_interpolation_check()

    rng = np.random.default_rng(FIXTURE_SEED)
    tables, fixture = {}, {}
    for name in SPEC:
        interval, n, angle, quantity = SPEC[name]
        if name not in names:
            continue
        t0 = time.time()
        coeffs, refined, jd_end, err_rec, err_pts, tc = build_table(name, interval, n, angle)
        path = os.path.join(OUT_DIR, f'{name}.bin')
        coeffs.astype('<f8').tofile(path)
        refined_path = os.path.join(OUT_DIR, f'{name}.refined.bin')
        if refined:
            # rows of [start, end, c_0 .. c_{n-1}] (JD TT), in time order
            np.array([[lo, hi, *c] for lo, hi, c in refined], dtype='<f8').tofile(refined_path)
        elif os.path.exists(refined_path):
            os.remove(refined_path)
        report = fit_report(name, err_rec, err_pts, tc)
        sources['fitReport'][name] = report
        far = report.get('maxArcsecWhereSolarElongationAtLeast1deg')
        print(f'{name:18s} {interval:3d} d x {n:2d}  {os.path.getsize(path) / 1024:5.0f} KiB  '
              f'max fit error {report["maxArcsec"] * 1000:9.4f} mas'
              + (f', elong>=1deg {far * 1000:.4f} mas, time >10 mas '
                 f'{report["fractionOfTimeAboveArcsec"]["0.01"] * 100:.2f}%' if far is not None else '')
              + f'  ({time.time() - t0:.0f}s)', flush=True)
        tables[name] = {
            'file': f'{name}.bin', 'sha256': sha256_file(path), 'bytes': os.path.getsize(path),
            'quantity': quantity, 'unit': 'deg', 'timeScale': 'TT',
            'jdStart': JD_START, 'jdEnd': jd_end, 'intervalDays': interval,
            'coefficients': n, 'angle': angle, 'maxFitErrorArcsec': round(report['maxArcsec'], 7),
        }
        if refined:
            tables[name]['refinedRecords'] = {
                'file': f'{name}.refined.bin', 'sha256': sha256_file(refined_path),
                'bytes': os.path.getsize(refined_path), 'count': len(refined),
            }
        jd, kinds = reference_epochs(name, interval, jd_end, rng)
        value = direct(name, jd)
        # bound = max(verified record error, actual table error at jd), so a correct
        # runtime evaluator always satisfies |table(jd) - value| <= bound (+ rounding)
        tab, _ = C.eval_table(coeffs, JD_START, interval, jd, refined)
        here = np.abs((tab - value + 180.0) % 360.0 - 180.0 if angle else tab - value) * 3600.0
        bound = np.maximum(err_rec[C.record_index(jd, JD_START, interval, len(err_rec))], here)
        fixture[name] = {'jd': jd.tolist(), 'value': value.tolist(),
                         'rate': direct_rate(name, jd).tolist(), 'kind': kinds,
                         'fitErrorBoundArcsec': [float(f'{e:.3g}') for e in bound * 1.01 + 1e-7]}

    if args.only:
        print('--only: manifest and fixture not written')
        return
    digest = hashlib.sha256(''.join(tables[k]['sha256'] + tables[k].get('refinedRecords', {}).get('sha256', '')
                                    for k in sorted(tables)).encode()).hexdigest()
    manifest = {
        'engine': 'zodiacally-ephemeris', 'formatVersion': 2,
        'dataVersion': f'de440s-chiron{sources["chironHorizons"]["orbitSolution"]}-{digest[:12]}',
        'createdBy': VERSION, 'sources': sources, 'tables': tables,
    }
    with open(os.path.join(OUT_DIR, 'manifest.json'), 'w') as f:
        json.dump(manifest, f, indent=2)
        f.write('\n')
    with open(FIXTURE, 'w') as f:
        # The description keeps the original build path (now build/tables/build.py), so that
        # the fixture stays byte-identical to the committed test/fixtures/reference.json.
        json.dump({
            'description': 'Directly evaluated (not tabulated) reference values for the Zodiacally '
                           'ephemeris tables, generated by tools/ephemeris-build/build.py. jd: TT; '
                           'value: deg; rate: deg/day (five-point difference, h = 0.01 d); '
                           'fitErrorBoundArcsec: upper bound of |table - value| at jd (verified '
                           'record maximum or the actual error, whichever is larger). kind '
                           '"conjunction": epochs where a single 16-day polynomial was worst, '
                           'evaluated through the refined sub-records.',
            'dataVersion': manifest['dataVersion'], 'timeScale': 'TT', 'seed': FIXTURE_SEED,
            'tables': fixture,
        }, f, separators=(',', ':'))
        f.write('\n')
    total = sum(t['bytes'] + t.get('refinedRecords', {}).get('bytes', 0) for t in tables.values())
    print(f'total {total} bytes ({total / 1048576:.2f} MiB), dataVersion {manifest["dataVersion"]}')


if __name__ == '__main__':
    main()
