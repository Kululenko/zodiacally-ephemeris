"""DEV-ONLY helper: run oracle.cjs (black-box sweph) for a list of TT epochs.

Results are used only to measure residuals. Nothing here is imported by
build/tables/build.py (see README.md in this directory).
"""
import json
import os
import subprocess
import sys
import tempfile

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, '..', '..'))
BUILD_DIR = os.path.join(REPO, 'build', 'tables')  # reduction.py, chebyshev.py, horizons.py
sys.path.insert(0, BUILD_DIR)

SEED = 20261003
JD_MIN, JD_MAX = 2414655.5, 2488434.5  # 1899-01-01 .. 2101-01-01 TT


def random_epochs(n, seed=SEED):
    return np.sort(np.random.default_rng(seed).uniform(JD_MIN, JD_MAX, n))


def call_oracle(jd_tt, bodies, extra_flags=()):
    with tempfile.NamedTemporaryFile('w', suffix='.json', delete=False) as f:
        json.dump({'jdTT': [float(x) for x in jd_tt], 'bodies': list(bodies),
                   'extraFlags': list(extra_flags)}, f)
        path = f.name
    try:
        out = subprocess.check_output(['node', os.path.join(HERE, 'oracle.cjs'), path], cwd=REPO)
    finally:
        os.unlink(path)
    data = json.loads(out)
    return {b: (np.array(v['lon']), np.array(v['speed'])) for b, v in data['bodies'].items()}, data['version']


def angle_diff_arcsec(a, b):
    return ((np.asarray(a) - np.asarray(b) + 180.0) % 360.0 - 180.0) * 3600.0


def stats(x):
    a = np.abs(x)
    return {'max': float(a.max()), 'p99': float(np.percentile(a, 99)), 'mean': float(x.mean()),
            'meanAbs': float(a.mean()), 'rms': float(np.sqrt((x * x).mean()))}
