#!/usr/bin/env python3
"""DEV-ONLY: choose the true-node convention empirically.

Evaluates each physically defined variant in reduction.TRUE_NODE_VARIANTS
(build/tables/reduction.py) at >= 2000 random TT epochs and compares it with the
black-box oracle (swe.calc, SE_TRUE_NODE, SEFLG_SWIEPH|SEFLG_SPEED, same TT instants).
Nothing is fitted: the variant with the smallest residual is simply reported, and the
choice is hard-coded (with this evidence) in reduction.TRUE_NODE_VARIANT.

    build/tables/.venv/bin/python benchmark/studies/true_node_study.py [n]   (default n = 3000)
"""
import json
import sys

import numpy as np

from oracle_client import angle_diff_arcsec, call_oracle, random_epochs, stats
import reduction as R  # build/tables, put on sys.path by oracle_client

n = int(sys.argv[1]) if len(sys.argv) > 1 else 3000
jd = random_epochs(n, seed=4242)
oracle, version = call_oracle(jd, ['trueNode'])
lon_o, speed_o = oracle['trueNode']
h = 0.005  # day, symmetric difference for our speed
report = {'oracle': f'sweph {version} SE_TRUE_NODE', 'epochs': n, 'variants': {}}
for variant in R.TRUE_NODE_VARIANTS:
    lon = R.true_node_longitude(jd, variant)
    speed = angle_diff_arcsec(R.true_node_longitude(jd + h, variant),
                              R.true_node_longitude(jd - h, variant)) / 3600.0 / (2 * h)
    report['variants'][variant] = {
        'lonArcsec': stats(angle_diff_arcsec(lon, lon_o)),
        'speedArcsecPerDay': stats((speed - speed_o) * 3600.0),
    }
best = min(report['variants'], key=lambda k: report['variants'][k]['lonArcsec']['rms'])
report['smallestResidual'] = best
report['chosen'] = R.TRUE_NODE_VARIANT
print(json.dumps(report, indent=1))
if best != R.TRUE_NODE_VARIANT:
    sys.exit(f'NOTE: smallest residual is {best}, reduction.py uses {R.TRUE_NODE_VARIANT}')
