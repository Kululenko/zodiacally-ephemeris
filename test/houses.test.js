const { houses, sidereal } = require('../houses');

const DEG = Math.PI / 180;
const arcsecBetween = (a, b) => Math.abs(((((a - b) % 360) + 540) % 360) - 180) * 3600;
const norm360 = (x) => ((x % 360) + 360) % 360;

function rng(seed) {
  let s = seed;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Equatorial coordinates of an ecliptic longitude (beta = 0), Meeus (1998) eq. (13.3), (13.4).
function equatorial(lonDeg, epsDeg) {
  const l = lonDeg * DEG;
  const e = epsDeg * DEG;
  return {
    ra: norm360(Math.atan2(Math.sin(l) * Math.cos(e), Math.cos(l)) / DEG),
    dec: Math.asin(Math.sin(e) * Math.sin(l)) / DEG,
  };
}

describe('sidereal time (IAU 2006)', () => {
  // Reference values of the SOFA/ERFA test suite (t_erfa_c.c), independent of this code.
  test('GMST matches ERFA gmst06(2400000.5, 53736, 2400000.5, 53736)', () => {
    const { gmstDeg } = sidereal({ jdUT1: 2453736.5, jdTT: 2453736.5, deltaPsiDeg: 0, trueObliquityDeg: 23.4 });
    expect(Math.abs(gmstDeg * DEG - 1.754174971870091203)).toBeLessThan(1e-12);
  });

  test('equation of the equinoxes matches ERFA ee00 to < 1 micro-arcsecond', () => {
    const { gmstDeg, gastDeg } = sidereal({
      jdUT1: 2453736.5,
      jdTT: 2453736.5,
      deltaPsiDeg: -0.9630909107115582393e-5 / DEG,
      trueObliquityDeg: 0.4090789763356509900 / DEG,
    });
    expect(Math.abs((gastDeg - gmstDeg) * DEG - -0.8834193235367965479e-5)).toBeLessThan(5e-12);
  });

  test('Meeus example 12.a (1987 April 10, 0h UT) within the GMST82/GMST06 model difference', () => {
    const { gmstDeg, gastDeg } = sidereal({
      jdUT1: 2446895.5,
      jdTT: 2446895.5 + 55 / 86400,
      deltaPsiDeg: -3.788 / 3600,
      trueObliquityDeg: 23 + 26 / 60 + 36.85 / 3600,
    });
    // Meeus: mean 13h10m46.3668s, apparent 13h10m46.1351s (IAU 1982 GMST; IAU 2006 is 3.3 ms later).
    expect(Math.abs((gmstDeg / 15 - 13) * 3600 - 646.3668)).toBeLessThan(0.005);
    expect(Math.abs((gastDeg / 15 - 13) * 3600 - 646.1351)).toBeLessThan(0.005);
  });

  test('the Earth turns once per sidereal day', () => {
    const a = sidereal({ jdUT1: 2451545, jdTT: 2451545, deltaPsiDeg: 0, trueObliquityDeg: 23.44 }).gmstDeg;
    const b = sidereal({ jdUT1: 2451546, jdTT: 2451546, deltaPsiDeg: 0, trueObliquityDeg: 23.44 }).gmstDeg;
    expect(norm360(b - a)).toBeCloseTo(360.98564736629 - 360, 6);
  });
});

describe('Ascendant and MC', () => {
  test('analytic cases at the equator', () => {
    const eps = 23.44;
    let h = houses({ armcDeg: 0, latitudeDeg: 0, trueObliquityDeg: eps, system: 'W' });
    expect(h.mc).toBeCloseTo(0, 12);
    expect(h.ascendant).toBeCloseTo(90, 12);
    h = houses({ armcDeg: 90, latitudeDeg: 0, trueObliquityDeg: eps, system: 'W' });
    expect(h.mc).toBeCloseTo(90, 12);
    expect(h.ascendant).toBeCloseTo(180, 12);
    h = houses({ armcDeg: 270, latitudeDeg: 0, trueObliquityDeg: eps, system: 'W' });
    expect(h.mc).toBeCloseTo(270, 12);
    expect(h.ascendant).toBeCloseTo(0, 12);
  });

  test('MC is on the meridian and the Ascendant on the eastern horizon (outside polar circles)', () => {
    const random = rng(3);
    for (let i = 0; i < 2000; i++) {
      const armc = random() * 360;
      const eps = 23.4 + random() * 0.08;
      const lat = (random() * 2 - 1) * 66;
      const h = houses({ armcDeg: armc, latitudeDeg: lat, trueObliquityDeg: eps, system: 'W' });
      expect(arcsecBetween(equatorial(h.mc, eps).ra, armc)).toBeLessThan(1e-6);
      const { ra, dec } = equatorial(h.ascendant, eps);
      const hourAngle = (armc - ra) * DEG;
      const sinAlt = Math.sin(lat * DEG) * Math.sin(dec * DEG) + Math.cos(lat * DEG) * Math.cos(dec * DEG) * Math.cos(hourAngle);
      expect(Math.abs(sinAlt)).toBeLessThan(1e-12);
      expect(Math.sin(hourAngle)).toBeLessThan(0); // east of the meridian
      expect(norm360(h.ascendant - h.mc)).toBeLessThan(180);
    }
  });

  test('polar convention: MC on the upper meridian, Ascendant follows it within 180 deg', () => {
    const random = rng(4);
    for (let i = 0; i < 2000; i++) {
      const armc = random() * 360;
      const lat = (random() < 0.5 ? -1 : 1) * (67 + random() * 22.9);
      const h = houses({ armcDeg: armc, latitudeDeg: lat, trueObliquityDeg: 23.44, system: 'W' });
      expect(arcsecBetween(equatorial(h.mc, 23.44).ra, armc)).toBeLessThan(1e-6);
      expect(norm360(h.ascendant - h.mc)).toBeLessThan(180);
      const { ra, dec } = equatorial(h.ascendant, 23.44);
      const sinAlt = Math.sin(lat * DEG) * Math.sin(dec * DEG)
        + Math.cos(lat * DEG) * Math.cos(dec * DEG) * Math.cos((armc - ra) * DEG);
      expect(Math.abs(sinAlt)).toBeLessThan(1e-12); // still a horizon point
    }
  });

  test('north/south symmetry: (ARMC + 180, -lat) gives every angle + 180 deg', () => {
    const a = houses({ armcDeg: 123.4, latitudeDeg: 48.2, trueObliquityDeg: 23.437, system: 'P' });
    const b = houses({ armcDeg: 303.4, latitudeDeg: -48.2, trueObliquityDeg: 23.437, system: 'P' });
    expect(arcsecBetween(b.ascendant, a.ascendant + 180)).toBeLessThan(1e-7);
    expect(arcsecBetween(b.mc, a.mc + 180)).toBeLessThan(1e-7);
    a.cusps.forEach((c, i) => expect(arcsecBetween(b.cusps[i], c + 180)).toBeLessThan(1e-6));
  });
});

describe('Placidus', () => {
  test('cusps satisfy the semi-arc trisection to < 1e-6 arcsec', () => {
    const random = rng(6);
    const parts = [[10, 30, 1 / 3], [11, 60, 2 / 3], [1, 120, 2 / 3], [2, 150, 1 / 3]];
    for (let i = 0; i < 2000; i++) {
      const armc = random() * 360;
      const eps = 23.4 + random() * 0.08;
      const lat = (random() * 2 - 1) * (90 - eps - 1e-4);
      const h = houses({ armcDeg: armc, latitudeDeg: lat, trueObliquityDeg: eps, system: 'P' });
      expect(h.error).toBeNull();
      for (const [index, offset, fraction] of parts) {
        const { ra, dec } = equatorial(h.cusps[index], eps);
        const ad = Math.asin(Math.tan(lat * DEG) * Math.tan(dec * DEG)) / DEG;
        expect(Math.abs(norm360(ra - armc) - offset - fraction * ad) * 3600).toBeLessThan(1e-6);
      }
    }
  });

  test('cusp 1 = Asc, cusp 10 = MC, opposite cusps, zodiacal order', () => {
    const h = houses({ armcDeg: 200, latitudeDeg: 52.52, trueObliquityDeg: 23.44, system: 'P' });
    expect(h.cusps).toHaveLength(12);
    expect(h.cusps[0]).toBe(h.ascendant);
    expect(h.cusps[9]).toBe(h.mc);
    for (let i = 0; i < 6; i++) expect(arcsecBetween(h.cusps[i + 6], h.cusps[i] + 180)).toBeLessThan(1e-9);
    let total = 0;
    for (let i = 0; i < 12; i++) total += norm360(h.cusps[(i + 1) % 12] - h.cusps[i]);
    expect(total).toBeCloseTo(360, 9);
  });

  test('at the equator the cusps divide the equator into 30-degree arcs of right ascension', () => {
    const h = houses({ armcDeg: 17, latitudeDeg: 0, trueObliquityDeg: 23.44, system: 'P' });
    expect(arcsecBetween(equatorial(h.cusps[10], 23.44).ra, 47)).toBeLessThan(1e-6);
    expect(arcsecBetween(equatorial(h.cusps[11], 23.44).ra, 77)).toBeLessThan(1e-6);
    expect(arcsecBetween(equatorial(h.cusps[1], 23.44).ra, 137)).toBeLessThan(1e-6);
    expect(arcsecBetween(equatorial(h.cusps[2], 23.44).ra, 167)).toBeLessThan(1e-6);
  });

  test('reports PLACIDUS_POLAR inside the polar circles, Asc/MC still given', () => {
    for (const lat of [66.57, 70, -75, 89.9]) {
      const h = houses({ armcDeg: 10, latitudeDeg: lat, trueObliquityDeg: 23.44, system: 'P' });
      expect(h.error).toBe('PLACIDUS_POLAR');
      expect(h.cusps).toBeNull();
      expect(Number.isFinite(h.ascendant) && Number.isFinite(h.mc)).toBe(true);
    }
    const edge = houses({ armcDeg: 10, latitudeDeg: 66.559, trueObliquityDeg: 23.44, system: 'P' });
    expect(edge.error).toBeNull();
  });
});

describe('Whole Sign and input validation', () => {
  test('cusp 1 starts the Ascendant sign, one sign per house, also in polar regions', () => {
    for (const lat of [40, -33.9, 78]) {
      const h = houses({ armcDeg: 250, latitudeDeg: lat, trueObliquityDeg: 23.44, system: 'W' });
      expect(h.error).toBeNull();
      expect(h.cusps[0]).toBe(Math.floor(h.ascendant / 30) * 30);
      h.cusps.forEach((c, i) => expect(c).toBe(norm360(h.cusps[0] + 30 * i)));
    }
  });

  test('ARMC is normalised and invalid input is rejected', () => {
    expect(houses({ armcDeg: -30, latitudeDeg: 10, trueObliquityDeg: 23.44, system: 'W' }).armc).toBe(330);
    expect(() => houses({ armcDeg: 0, latitudeDeg: 10, trueObliquityDeg: 23.44, system: 'K' })).toThrow(RangeError);
    expect(() => houses({ armcDeg: 0, latitudeDeg: 91, trueObliquityDeg: 23.44, system: 'P' })).toThrow(RangeError);
    expect(() => houses({ armcDeg: NaN, latitudeDeg: 0, trueObliquityDeg: 23.44, system: 'P' })).toThrow(RangeError);
  });
});
