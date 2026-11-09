'use strict';

// Sidereal time, Ascendant, MC and house cusps (Placidus, Whole Sign). Pure math, no tables.
// Angles in degrees; armc = right ascension of the meridian (local apparent sidereal time),
// eps = true obliquity of the ecliptic, phi = geographic latitude (north positive).

const DEG = Math.PI / 180;
const ARCSEC = DEG / 3600;
const J2000 = 2451545.0;

function norm360(deg) {
  const r = deg % 360;
  if (r >= 0) return r;
  // A tiny negative r rounds to 360 when shifted; [0, 360) must hold for sign arithmetic.
  const shifted = r + 360;
  return shifted < 360 ? shifted : 0;
}

/**
 * Greenwich mean and apparent sidereal time, IAU 2006.
 *
 * GMST: IERS Conventions 2010 (TN 36) eq. (5.32), as in SOFA/ERFA gmst06:
 *   GMST = ERA(UT1) + 0.014506" + 4612.156534" t + 1.3915817" t^2 - 0.00000044" t^3
 *          - 0.000029956" t^4 - 0.0000000368" t^5,   t = (JD_TT - 2451545.0) / 36525
 * with the Earth rotation angle, IERS Conventions 2010 eq. (5.15):
 *   ERA = 2 pi (0.7790572732640 + 1.00273781191135448 Du),  Du = JD_UT1 - 2451545.0
 *
 * GAST = GMST + equation of the equinoxes. Equation of the equinoxes = delta-psi cos(eps) plus
 * the IAU 2000 complementary terms truncated at 1 micro-arcsecond as given in USNO Circular 179
 * (Kaplan 2005), section 2.6.2 (the leading terms of IERS Conventions 2010 Table 5.2e / ERFA
 * eect00; omitted terms total < 1 micro-arcsecond):
 *   + 0.00264096" sin(Om) + 0.00006352" sin(2Om) + 0.00001175" sin(2F-2D+3Om)
 *   + 0.00001121" sin(2F-2D+Om) - 0.00000455" sin(2F-2D+2Om) + 0.00000202" sin(2F+3Om)
 *   + 0.00000198" sin(2F+Om) - 0.00000172" sin(3Om) - 0.00000087" t sin(Om)
 * IERS uses the mean obliquity in delta-psi cos(eps); with the true obliquity (the input here)
 * the difference is delta-psi sin(eps) delta-eps < 0.0004".
 */
function sidereal({ jdUT1, jdTT, deltaPsiDeg, trueObliquityDeg }) {
  const du = jdUT1 - J2000;
  const era = norm360(360 * ((du - Math.floor(du)) + 0.7790572732640 + 0.00273781191135448 * du));
  const t = (jdTT - J2000) / 36525;
  const precessionArcsec = 0.014506
    + t * (4612.156534 + t * (1.3915817 + t * (-0.00000044 + t * (-0.000029956 + t * -0.0000000368))));
  const gmstDeg = norm360(era + precessionArcsec / 3600);

  // Delaunay arguments F, D and Omega, IERS Conventions 2010 eq. (5.43) (Simon et al. 1994).
  const F = (335779.526232 + t * (1739527262.8478 + t * (-12.7512 + t * (-0.001037 + t * 0.00000417)))) * ARCSEC;
  const D = (1072260.70369 + t * (1602961601.2090 + t * (-6.3706 + t * (0.006593 + t * -0.00003169)))) * ARCSEC;
  const Om = (450160.398036 + t * (-6962890.5431 + t * (7.4722 + t * (0.007702 + t * -0.00005939)))) * ARCSEC;
  const complementaryArcsec = 0.00264096 * Math.sin(Om)
    + 0.00006352 * Math.sin(2 * Om)
    + 0.00001175 * Math.sin(2 * F - 2 * D + 3 * Om)
    + 0.00001121 * Math.sin(2 * F - 2 * D + Om)
    - 0.00000455 * Math.sin(2 * F - 2 * D + 2 * Om)
    + 0.00000202 * Math.sin(2 * F + 3 * Om)
    + 0.00000198 * Math.sin(2 * F + Om)
    - 0.00000172 * Math.sin(3 * Om)
    - 0.00000087 * t * Math.sin(Om);
  const equationOfEquinoxesDeg = deltaPsiDeg * Math.cos(trueObliquityDeg * DEG) + complementaryArcsec / 3600;
  return { gmstDeg, gastDeg: norm360(gmstDeg + equationOfEquinoxesDeg) };
}

/**
 * Midheaven: ecliptic longitude of the point on the upper meridian (right ascension = ARMC).
 * Meeus, Astronomical Algorithms 2nd ed. (1998) eq. (13.3) with beta = 0:
 *   tan(lambda) = sin(ARMC) / (cos(ARMC) cos(eps)), quadrant of ARMC kept by atan2.
 */
function midheaven(armc, eps) {
  return norm360(Math.atan2(Math.sin(armc), Math.cos(armc) * Math.cos(eps)) / DEG);
}

/**
 * Ascendant: ecliptic longitude of the eastern intersection of ecliptic and horizon.
 * Meeus (1998) eq. (14.2) / Explanatory Supplement 3rd ed. (2013):
 *   tan(lambda) = -cos(ARMC) / (sin(eps) tan(phi) + cos(eps) sin(ARMC)),
 * written with atan2 so that the rising intersection is returned.
 */
function easternAscendant(armc, eps, phi) {
  return norm360(Math.atan2(Math.cos(armc), -(Math.sin(armc) * Math.cos(eps) + Math.tan(phi) * Math.sin(eps))) / DEG);
}

/**
 * Placidus cusp as right ascension alpha (radians). A cusp is the ecliptic point whose
 * meridian distance is a fixed fraction of its semi-arc (time trisection of the diurnal and
 * nocturnal semi-arcs; R. Holden, "The Elements of House Division", 1977; Meeus 1998
 * eq. (15.1) for the hour angle at rising: cos H0 = -tan(phi) tan(delta)). With the
 * ascensional difference AD = asin(tan(phi) tan(delta)), DSA = 90 + AD, NSA = 90 - AD:
 *   cusp 11: alpha = ARMC + DSA/3            = ARMC +  30 + AD/3
 *   cusp 12: alpha = ARMC + 2 DSA/3          = ARMC +  60 + 2 AD/3
 *   cusp  2: alpha = ARMC + 180 - 2 NSA/3    = ARMC + 120 + 2 AD/3
 *   cusp  3: alpha = ARMC + 180 - NSA/3      = ARMC + 150 + AD/3
 * where delta is the declination of the ecliptic point with right ascension alpha:
 *   tan(delta) = tan(eps) sin(alpha)  (Meeus eq. (13.4) with (13.3), beta = 0).
 * Solved for u = alpha - ARMC in [0, 180] deg with a bracketed Newton iteration (the residual
 * is negative at u = 0 and positive at u = 180 whenever |phi| < 90 - eps).
 */
function placidusRightAscension(armc, eps, phi, offsetDeg, fraction) {
  const q = Math.tan(phi) * Math.tan(eps); // tan(phi) tan(delta) = q sin(alpha)
  const residual = (u) => {
    const s = q * Math.sin(armc + u);
    const ad = Math.asin(s);
    return {
      value: u - offsetDeg * DEG - fraction * ad,
      slope: 1 - (fraction * q * Math.cos(armc + u)) / Math.sqrt(1 - s * s),
    };
  };
  let lo = 0;
  let hi = Math.PI;
  let u = offsetDeg * DEG + fraction * Math.asin(q * Math.sin(armc + offsetDeg * DEG));
  for (let i = 0; i < 100; i++) {
    const { value, slope } = residual(u);
    if (value === 0) break;
    if (value < 0) lo = u;
    else hi = u;
    let next = u - value / slope;
    if (!(next > lo && next < hi)) next = (lo + hi) / 2; // fall back to bisection
    if (Math.abs(next - u) < 1e-15) {
      u = next;
      break;
    }
    u = next;
  }
  return armc + u;
}

function eclipticLongitudeOfRightAscension(alpha, eps) {
  // Meeus (1998) eq. (13.3) with beta = 0.
  return norm360(Math.atan2(Math.sin(alpha), Math.cos(alpha) * Math.cos(eps)) / DEG);
}

/**
 * Houses for a given ARMC.
 * - system 'P' (Placidus) or 'W' (Whole Sign).
 * - Polar convention (inside the polar circles the eastern horizon intersection can lie more
 *   than 180 deg after the MC): the MC stays on the upper meridian and the Ascendant is the
 *   horizon intersection that follows the MC within 180 deg of longitude.
 * - Placidus is undefined for |latitude| >= 90 - eps (some ecliptic points never rise or
 *   set): returns cusps null and error 'PLACIDUS_POLAR' (callers fall back to Whole Sign).
 * Returns { cusps: [cusp 1..12] | null, ascendant, mc, armc, error }.
 */
function houses({ armcDeg, latitudeDeg, trueObliquityDeg, system }) {
  if (system !== 'P' && system !== 'W') throw new RangeError(`Unsupported house system: ${system}`);
  if (!(latitudeDeg >= -90 && latitudeDeg <= 90)) throw new RangeError(`Invalid latitude: ${latitudeDeg}`);
  if (!Number.isFinite(armcDeg) || !Number.isFinite(trueObliquityDeg)) {
    throw new RangeError('armcDeg and trueObliquityDeg must be finite numbers.');
  }
  const armcNorm = norm360(armcDeg);
  const armc = armcNorm * DEG;
  const eps = trueObliquityDeg * DEG;
  const phi = latitudeDeg * DEG;

  const mc = midheaven(armc, eps);
  let ascendant = easternAscendant(armc, eps, phi);
  if (norm360(ascendant - mc) > 180) ascendant = norm360(ascendant + 180);
  const result = { cusps: null, ascendant, mc, armc: armcNorm, error: null };

  if (system === 'W') {
    // Whole Sign: cusp 1 = 0 deg of the Ascendant's sign, then one sign per house.
    const start = Math.floor(ascendant / 30) * 30;
    result.cusps = Array.from({ length: 12 }, (_, i) => norm360(start + 30 * i));
    return result;
  }

  if (Math.abs(latitudeDeg) >= 90 - trueObliquityDeg) {
    result.error = 'PLACIDUS_POLAR';
    return result;
  }
  const cusp = (offsetDeg, fraction) =>
    eclipticLongitudeOfRightAscension(placidusRightAscension(armc, eps, phi, offsetDeg, fraction), eps);
  const c11 = cusp(30, 1 / 3);
  const c12 = cusp(60, 2 / 3);
  const c2 = cusp(120, 2 / 3);
  const c3 = cusp(150, 1 / 3);
  result.cusps = [
    ascendant, c2, c3, norm360(mc + 180), norm360(c11 + 180), norm360(c12 + 180),
    norm360(ascendant + 180), norm360(c2 + 180), norm360(c3 + 180), mc, c11, c12,
  ];
  return result;
}

module.exports = { sidereal, houses };
