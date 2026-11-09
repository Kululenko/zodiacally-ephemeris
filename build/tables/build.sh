#!/bin/sh
# One-command build of data/ and test/fixtures/reference.json at the repository root
# (see build/README.md). Usage: sh build/tables/build.sh [build.py args]
set -eu
cd "$(dirname "$0")"
[ -x .venv/bin/python ] || "${PYTHON:-python3}" -m venv .venv
.venv/bin/python -m pip install --quiet --disable-pip-version-check -r requirements.txt
mkdir -p .cache
if [ ! -f .cache/de440s.bsp ]; then
  # JPL DE440s, 1849-2150, ~31 MiB; size and sha256 are verified by build.py
  curl -fL -A 'zodiacally-ephemeris-build/1.0' -o .cache/de440s.bsp.part \
    https://ssd.jpl.nasa.gov/ftp/eph/planets/bsp/de440s.bsp
  mv .cache/de440s.bsp.part .cache/de440s.bsp
fi
exec .venv/bin/python build.py "$@"
