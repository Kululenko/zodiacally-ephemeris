# Source data and computation

Zodiacally Ephemeris contains Zodiacally's JavaScript evaluator and generated
Chebyshev tables. The public-domain astronomical source data remain distinct
from the licence for this implementation. No Swiss Ephemeris implementation,
ephemeris files, bindings or oracle outputs are included in this package.

- Sun, Moon and planets: NASA/JPL DE440s, the short DE440 data set; Park et al.
  (2021), The Astronomical Journal 161:105. Source information:
  https://ssd.jpl.nasa.gov/planets/eph_export.html
- Chiron: JPL Horizons, orbit solution JPL#171. Source:
  https://ssd.jpl.nasa.gov/horizons/
- Offline reduction: Skyfield 1.55 (MIT), jplephem 2.24 (MIT), NumPy (BSD).
  These build tools are not included or required at runtime. Skyfield licence:
  https://github.com/brandon-rhodes/python-skyfield/blob/master/LICENSE
- Precession/nutation and sidereal time: IAU 2006 / IAU 2000A conventions,
  IERS Conventions 2010. https://iers-conventions.obspm.fr/
- Time data: IERS EOP C04/Bulletin A and leap-second bulletins, USNO historic
  Delta T, Morrison et al. (2021), and Stephenson, Morrison & Hohenkerk (2016).
  The distributed time.js and deltaTTable.js retain their data-source comments.

The Swiss Ephemeris was used, through its public API, as an external reference
for measuring differences and, for three discrete modelling conventions, for
choosing between published alternatives by comparing residuals against its
output: light deflection by the Sun only, an n=3 polytrope model for rays
passing behind the solar disc, and the light-time-retarded osculating node as
the true node. No Swiss Ephemeris source code was read or used, and no
coefficient or continuous parameter was fitted to its output. The alternatives,
residuals and study scripts are in docs/conventions.md and benchmark/studies/
of the public repository, https://github.com/Kululenko/zodiacally-ephemeris

The machine-readable data/manifest.json records the input provenance and
checksums. Source attribution does not imply endorsement of Zodiacally or of
astrological interpretations by NASA, JPL or any other source organisation.
