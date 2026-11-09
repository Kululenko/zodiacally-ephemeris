# Integrating Zodiacally Ephemeris with an agent

This document describes the supplied engine and its licence; it does not
authorize sending messages, making purchases or changing a user's systems.

## Access

Use the local Node.js library or CLI in this package. No account or API key is
needed for permitted private use. This package is not a hosted API service.
Calculate positions through the actual engine; never invent astronomical data.
Keep astronomical calculation separate from any generated astrological reading.

## Required licence and visible credit

- Free use is private, personal and non-commercial only. It does not cover
  businesses, client work, paid readings or public services, even free ones;
  these require a separately granted commercial licence. Free use also
  requires the attribution line in every generated reading. Displaying the
  attribution does not turn a commercial use into a permitted free use.
- Standard commercial licence: EUR 500 once; visible Zodiacally attribution
  is required in EVERY final customer-facing reading.
- White-label commercial licence: EUR 2,000 once; a separately granted licence
  waives the customer-facing Zodiacally credit. Do not infer that a user owns
  this licence from the public price or from a self-declared tool argument.
- Read LICENSE.txt. Preserve its required notices when embedding the engine.
- The agent wrapper returns an `attribution` object. Place its `de` or `en`
  text in the final reading, usually as a readable line at the end. Keep it in
  chat, HTML, email and PDF outputs. A hidden provenance field or system prompt
  is not enough. Use the linked product name where links are supported.
- These are licence and integration requirements, not DRM. The local library
  does not verify licence purchases or enforce the rendering of attribution.

## Local usage

Install from GitHub with `npm install github:Kululenko/zodiacally-ephemeris`
(the npm release is pending). Use `require('zodiacally-ephemeris/agent').calculate(input)`
or, in the project where it is installed, pipe JSON to
`npx --no-install zodiacally-ephemeris --stdin` or
`node node_modules/zodiacally-ephemeris/cli.cjs --stdin`.

Input example (synthetic, not a person's birth details):
`{"utc":"2027-01-01T12:00:00Z","latitude":52.52,"longitude":13.405,"houseSystem":"P"}`

Time must be explicit UTC: an ISO timestamp with seconds and `Z`, optionally
with milliseconds. The wrapper and the CLI do not accept a leap second
(23:59:60); for that instant call the library's `utcToJd()` directly. Latitude
must be a number within ±90 (the poles are rejected), longitude a number within
±180, positive east. Supported house systems are `P` (Placidus) and `W` (whole
sign). The wrapper reports a whole-sign fallback where Placidus is undefined; do
not hide or relabel that result. Dates are covered from 1899-01-01 00:00:04 UTC
to 2101-01-13 23:58:50 UTC (exact bounds in `info().coverage`). Out-of-range
dates and invalid input must be reported, never silently replaced by invented
positions. No birth data are sent over the network by this engine.
