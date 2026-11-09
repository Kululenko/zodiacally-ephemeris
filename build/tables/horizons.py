"""Chiron (2060) barycentric state vectors from the public JPL Horizons API.

JPL Horizons output is a work of the U.S. Government (public domain). Requests are
made one at a time, with User-Agent "zodiacally-ephemeris-build/1.0" and no
account data, and every raw response is kept under sources/horizons/ (tracked in git) so
that a rebuild never needs the network again. Horizons always serves the newest JPL orbit
solution of Chiron, so a fresh download differs; the committed responses pin the solution
used for the tables (its id and the sha256 of the responses are in manifest.json). Delete
them only to move to a newer orbit solution on purpose.
"""
import hashlib
import os
import re
import urllib.parse
import urllib.request

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
CACHE_DIR = os.path.join(HERE, 'sources', 'horizons')
API = 'https://ssd.jpl.nasa.gov/api/horizons.api'
USER_AGENT = 'zodiacally-ephemeris-build/1.0'

# TDB grid 1898-12 .. 2101-03 with margin for light-time (Chiron <= 0.12 d) and
# for tables whose last record ends after 2101-01-01.
GRID_START = 2414600.5
GRID_STEP = 4.0
CHUNK_DAYS = 18500.0
N_CHUNKS = 4
GRID_END = GRID_START + N_CHUNKS * CHUNK_DAYS  # 2488600.5


def _chunk_bounds():
    for k in range(N_CHUNKS):
        start = GRID_START + k * CHUNK_DAYS
        stop = start + CHUNK_DAYS - (0 if k == N_CHUNKS - 1 else GRID_STEP)
        yield start, stop


def _request(start, stop):
    params = {
        'format': 'text', 'COMMAND': "'2060;'", 'OBJ_DATA': "'YES'", 'MAKE_EPHEM': "'YES'",
        'EPHEM_TYPE': "'VECTORS'", 'CENTER': "'500@0'", 'REF_PLANE': "'FRAME'",
        'REF_SYSTEM': "'ICRF'", 'START_TIME': f"'JD{start:.1f}'", 'STOP_TIME': f"'JD{stop:.1f}'",
        'STEP_SIZE': f"'{int(GRID_STEP)}d'", 'VEC_TABLE': "'2'", 'VEC_CORR': "'NONE'",
        'OUT_UNITS': "'AU-D'", 'CSV_FORMAT': "'YES'", 'TIME_TYPE': "'TDB'",
    }
    url = API + '?' + urllib.parse.urlencode(params, safe="'@")
    req = urllib.request.Request(url, headers={'User-Agent': USER_AGENT})
    with urllib.request.urlopen(req, timeout=600) as r:
        return r.read().decode('utf-8')


def raw_responses(download=True):
    os.makedirs(CACHE_DIR, exist_ok=True)
    texts = []
    for start, stop in _chunk_bounds():
        path = os.path.join(CACHE_DIR, f'chiron_{start:.1f}_{stop:.1f}_{int(GRID_STEP)}d.txt')
        if not os.path.exists(path):
            if not download:
                raise FileNotFoundError(path)
            print(f'  Horizons: Chiron JD {start} .. {stop}', flush=True)
            text = _request(start, stop)
            if '$$SOE' not in text:
                raise RuntimeError('Horizons error:\n' + text[:2000])
            with open(path, 'w') as f:
                f.write(text)
        with open(path) as f:
            texts.append(f.read())
    return texts


def source_info():
    texts = raw_responses()
    h = hashlib.sha256()
    for t in texts:
        h.update(t.encode('utf-8'))
    m = re.search(r'Target body name: (.*?)\s+\{source: (.*?)\}', texts[0])
    sol = re.search(r'Soln\.date: (\S+)', texts[0])
    return {
        'url': API,
        'target': m.group(1).strip() if m else '2060 Chiron',
        'orbitSolution': m.group(2) if m else None,
        'solutionDate': sol.group(1) if sol else None,
        'grid': f'barycentric ICRF state vectors, TDB, JD {GRID_START}..{GRID_END} step {GRID_STEP} d',
        'rawResponsesSha256': h.hexdigest(),
    }


def load_chiron_states():
    jd, pos, vel = [], [], []
    for text in raw_responses():
        body = text[text.index('$$SOE') + 5:text.index('$$EOE')]
        for line in body.strip().splitlines():
            f = [x.strip() for x in line.split(',')]
            jd.append(float(f[0]))
            pos.append([float(f[2]), float(f[3]), float(f[4])])
            vel.append([float(f[5]), float(f[6]), float(f[7])])
    jd = np.array(jd)
    if not np.allclose(np.diff(jd), GRID_STEP, atol=1e-9, rtol=0) or jd[0] != GRID_START or jd[-1] != GRID_END:
        raise ValueError('unexpected Horizons grid')
    return jd, np.array(pos).T, np.array(vel).T


def interpolate_state(jd, pos, vel, t_tdb, step=GRID_STEP):
    """Cubic Hermite interpolation of position and velocity on the uniform TDB grid
    (e.g. Press et al., Numerical Recipes 3rd ed. sec. 3.5; error O(h^4), verified in build.py)."""
    t_tdb = np.asarray(t_tdb, dtype=float)
    u = (t_tdb - jd[0]) / step
    i = np.floor(u).astype(int)
    if np.any(i < 0) or np.any(i >= len(jd) - 1):
        raise ValueError('time outside the Chiron grid')
    s = u - i
    h = step
    p0, p1 = pos[:, i], pos[:, i + 1]
    m0, m1 = vel[:, i] * h, vel[:, i + 1] * h
    s2, s3 = s * s, s * s * s
    h00, h10, h01, h11 = 2 * s3 - 3 * s2 + 1, s3 - 2 * s2 + s, -2 * s3 + 3 * s2, s3 - s2
    p = h00 * p0 + h10 * m0 + h01 * p1 + h11 * m1
    d00, d10, d01, d11 = 6 * s2 - 6 * s, 3 * s2 - 4 * s + 1, -6 * s2 + 6 * s, 3 * s2 - 2 * s
    v = (d00 * p0 + d10 * m0 + d01 * p1 + d11 * m1) / h
    return p, v
