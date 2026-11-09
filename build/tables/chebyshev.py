"""Chebyshev records exactly as the runtime reads them (see "Format" in README.de.md and the
header of chebyshev.js at the repository root).

value(t) = sum_{k=0}^{n-1} c_k T_k(x),  x = 2 (t - recordStart) / L - 1   (c_0 not halved)
d value / dt = (2 / L) sum_k c_k T_k'(x)

Coefficients interpolate the function at the n Chebyshev-Lobatto points
x_j = cos(pi j / (n - 1)) (the extrema of T_{n-1}; Mason & Handscomb, "Chebyshev
Polynomials", 2003, sec. 6.3, discrete orthogonality of the DCT-I). Because both
record ends are interpolation points, neighbouring records agree exactly at their
common boundary. A record that one polynomial cannot fit (next to a superior solar
conjunction) is replaced by shorter sub-records built the same way (refined records,
see eval_table). Plain numpy loops (no BLAS) keep the output bit-reproducible.
"""
import numpy as np


def lobatto_x(n):
    return np.cos(np.pi * np.arange(n) / (n - 1))


def _dct1_matrix(n):
    # c_k = (2 / (n-1)) * sum''_j f_j cos(pi j k / (n-1)), where sum'' halves the
    # first and last terms; c_0 and c_{n-1} are halved once more because the
    # runtime does not halve c_0 (and T_{n-1} is aliased at the Lobatto points).
    j = np.arange(n)
    W = np.cos(np.pi * np.outer(j, j) / (n - 1)) * (2.0 / (n - 1))  # [k, j]
    W[:, 0] *= 0.5
    W[:, -1] *= 0.5
    W[0, :] *= 0.5
    W[-1, :] *= 0.5
    return W


def fit_records(values):
    """values: (nRecords, n) samples at lobatto_x(n) mapped onto each record.
    Returns (nRecords, n) coefficients."""
    n = values.shape[1]
    W = _dct1_matrix(n)
    # einsum without optimisation stays in numpy's own (deterministic) loops.
    return np.einsum('kj,rj->rk', W, values, optimize=False)


def basis(x, n):
    """T_0..T_{n-1} at the points x: (len(x), n)."""
    T = np.empty((len(x), n))
    T[:, 0] = 1.0
    T[:, 1] = x
    for k in range(2, n):
        T[:, k] = 2.0 * x * T[:, k - 1] - T[:, k - 2]
    return T


def evaluate(coeffs, x):
    """coeffs: (m, n) per-point coefficient rows, x: (m,) in [-1, 1].
    Returns (value, dvalue/dx) using the T_k / U_k recurrences."""
    m, n = coeffs.shape
    t_prev, t_cur = np.ones(m), x.copy()
    # T_k'(x) = k U_{k-1}(x)
    u_prev, u_cur = np.zeros(m), np.ones(m)  # U_{-1}, U_0
    val = coeffs[:, 0] * t_prev
    der = np.zeros(m)
    if n > 1:
        val = val + coeffs[:, 1] * t_cur
        der = der + coeffs[:, 1] * 1.0 * u_cur
    for k in range(2, n):
        t_prev, t_cur = t_cur, 2 * x * t_cur - t_prev
        u_prev, u_cur = u_cur, 2 * x * u_cur - u_prev
        val = val + coeffs[:, k] * t_cur
        der = der + coeffs[:, k] * k * u_cur
    return val, der


def record_index(jd, jd_start, interval, n_records):
    """Record lookup per FORMAT: a boundary time uses the later record, jdEnd the last one."""
    jd = np.asarray(jd, dtype=float)
    if np.any(jd < jd_start) or np.any(jd > jd_start + n_records * interval):
        raise ValueError('time outside table')
    i = np.floor((jd - jd_start) / interval).astype(np.int64)
    return np.minimum(i, n_records - 1)


def eval_table(coeffs2d, jd_start, interval, jd, refined=()):
    """Value [deg] and rate [deg/day] of a table at TT Julian dates jd. refined: sub-records
    (start, end, coeffs) in time order that together cover each refined main record; inside such
    a record the last sub-record starting at or before jd is used (a boundary time takes the later
    sub-record, as for the main records)."""
    jd = np.asarray(jd, dtype=float)
    i = record_index(jd, jd_start, interval, coeffs2d.shape[0])
    start = jd_start + i * interval
    length = np.full(jd.shape, float(interval))
    rows = coeffs2d[i]
    if len(refined):
        sub_start = np.array([r[0] for r in refined])
        k = np.searchsorted(sub_start, jd, side='right') - 1
        use = (k >= 0) & (sub_start[np.maximum(k, 0)] >= start)  # a sub-record of this record
        if np.any(use):
            sub_end = np.array([r[1] for r in refined])
            sub_coeffs = np.array([r[2] for r in refined])
            start = np.where(use, sub_start[np.maximum(k, 0)], start)
            length = np.where(use, sub_end[np.maximum(k, 0)] - sub_start[np.maximum(k, 0)], length)
            rows = np.where(use[:, None], sub_coeffs[np.maximum(k, 0)], rows)
    x = 2.0 * (jd - start) / length - 1.0
    val, dval = evaluate(rows, x)
    return val, dval * (2.0 / length)


def read_refined(path, n):
    """Sub-records of a <name>.refined.bin file (rows of [start, end, c_0 .. c_{n-1}]):
    [(start, end, coeffs)] in time order, as eval_table takes them."""
    rows = np.fromfile(path, dtype='<f8').reshape(-1, n + 2)
    return [(float(row[0]), float(row[1]), row[2:]) for row in rows]
