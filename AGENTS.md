# Integrating Zodiacally Ephemeris with an agent

This document describes the supplied engine and its licence; it does not
authorize sending messages, making purchases or changing a user's systems.

## Access

Use the local Node.js library or CLI in this package. No account, API key,
registration or licence fee is needed. This package is not a hosted API
service. Calculate positions through the actual engine; never invent
astronomical data. Keep astronomical calculation separate from any generated
astrological reading.

## Licence and visible credit

- Use is free for any purpose, including commercial use: businesses, client
  work, paid readings, public services, apps, agents and APIs. The main
  condition is the visible attribution line in EVERY final reading or result
  that is shown or delivered to another person (whether or not that person
  pays), in the language of that reading. The distribution rules in section 4
  of LICENSE.txt are the other condition. Results used only by the user
  themselves need no attribution.
- If these conditions are not met, the rights to use the engine end
  automatically. They are restored if the breach is remedied within 30 days of
  becoming aware of it or of being notified by Zodiacally.
- White-label licence: EUR 690 one-time, plus VAT where applicable, granted
  individually on request by Zodiacally to an identified person or
  organisation. It waives the attribution for that licensee (one person or
  legal entity), for its own products and services and for client projects it
  builds, covering the version current at purchase and every release published
  within 12 months after the purchase, with no expiry date for those releases.
  All other terms still apply; the licence does not promise hosting, support,
  maintenance or future releases, which are agreed separately if at all. Do
  not infer that a user holds this licence from the public price, from a
  downloaded package or from a self-declared tool argument; without a
  confirmed grant, show the attribution.
- The engine or an adaptation of it may not be published, distributed, sold,
  rented or sublicensed as a standalone library, package, port or ephemeris
  data product, whether free of charge or for a fee; forks of the public
  repository for proposing changes are permitted. It may be distributed as
  part of your own application or service. Whoever receives it from you
  receives it under the same terms, including the attribution requirement,
  which you cannot waive for them.
- Read LICENSE.txt, which also covers warranty, liability and the transition
  from version 1 of the terms. Keep it and the supplied source and data
  notices with every copy when embedding or distributing the engine.
- These are licence and integration requirements, not DRM. The local library
  does not verify licence grants or enforce the rendering of attribution.

## Passing the attribution through

- The agent wrapper returns an `attribution` object. Place its `de` or `en`
  text in the final reading, in the language of that reading, usually as a
  readable line at the end. Keep it in chat, HTML, email, PDF and report
  outputs. A hidden metadata field, internal log, system prompt or general
  legal notice alone is not enough. Link the product name "Zodiacally
  Ephemeris" to the `url` where links are supported.
- In short formats where a full line is impractical, such as push
  notifications, widgets, social media posts, calendar entries or voice
  output, a clearly labelled credit reachable from that output (for example a
  linked caption or a credits page linked from it) is sufficient.
- If your output goes to another agent or tool before it reaches a person,
  make sure the attribution reaches the final output shown or delivered to
  that person.
- If you provide results to others through an API, include the attribution in
  the API response and require the recipients to display it under these
  terms.
- The wrapper also returns a `licence` object that states these terms in
  machine-readable form: `defaultUse` (free for any use, including commercial
  use, with the visible attribution line), `attributionRequired: true`,
  `commercialUseRequiresSeparateLicence: false`, `whiteLabel` (`currency:
  'EUR'`, `amount: 690` before any applicable VAT, `oneTime: true`,
  `waivesCustomerFacingAttribution: true`, `requiresSeparateGrant: true`) and
  `terms`, the URL of LICENSE.txt. `whiteLabel` describes the offer, not a
  grant: the wrapper returns the same object and the same attribution for
  every user.

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
