// Type declarations for zodiacally-ephemeris (CommonJS).

/** Bodies and points available in the tables. Mars to Pluto are system barycentres, as in DE440. */
export type Body =
  | 'sun' | 'moon' | 'mercury' | 'venus' | 'mars' | 'jupiter' | 'saturn'
  | 'uranus' | 'neptune' | 'pluto' | 'chiron' | 'trueNode';

/** `P` = Placidus, `W` = whole sign. */
export type HouseSystem = 'P' | 'W';

export declare const BODIES: Readonly<{ [K in Body]: K }>;

export interface UtcParts {
  year: number;
  /** 1..12 */
  month: number;
  day: number;
  hour?: number;
  minute?: number;
  /** May be 60.x on a leap-second day. */
  second?: number;
}

export interface JulianDays {
  /** Julian day, Terrestrial Time (positions). */
  jdTT: number;
  /** Julian day, UT1 (houses, sidereal time). */
  jdUT1: number;
}

export interface Position {
  /** Apparent geocentric ecliptic longitude of date, tropical, true equinox; degrees in [0, 360). */
  longitude: number;
  /** Rate of the longitude in degrees per day (negative = retrograde). */
  speed: number;
}

export interface Houses {
  /** 12 cusp longitudes in degrees (cusp 1 = Ascendant for Placidus), or null when undefined. */
  cusps: number[] | null;
  ascendant: number;
  mc: number;
  /** Right ascension of the meridian (local apparent sidereal time) in degrees. */
  armc: number;
  /** 'PLACIDUS_POLAR' inside the polar circles, where Placidus is undefined; otherwise null. */
  error: 'PLACIDUS_POLAR' | null;
}

export interface EngineInfo {
  engine: 'zodiacally-ephemeris';
  version: string;
  dataVersion: string;
  manifestSha256: string;
  coverage: { fromUtc: string; toUtc: string; jdTT: [number, number]; jdUT1: [number, number] };
  sources: Record<string, unknown>;
}

/** Error codes: EPHEMERIS_RANGE, EPHEMERIS_TIME_OUT_OF_RANGE, EPHEMERIS_UNKNOWN_BODY, EPHEMERIS_DATA_INVALID. */
export interface EphemerisError extends Error {
  code: 'EPHEMERIS_RANGE' | 'EPHEMERIS_TIME_OUT_OF_RANGE' | 'EPHEMERIS_UNKNOWN_BODY' | 'EPHEMERIS_DATA_INVALID';
}

/** Converts a UTC reading to Julian days in TT and UT1 (leap seconds and Delta T applied). */
export declare function utcToJd(utc: UtcParts): JulianDays;
/** Converts a Julian day UT1 back to a UTC reading. */
export declare function jdUT1ToUtc(jdUT1: number): Required<UtcParts>;
/** Delta T = TT - UT1 in seconds at a Julian day UT1. */
export declare function deltaTSeconds(jdUT1: number): number;
/** Position at a Julian day UT1 (TT = UT1 + Delta T). */
export declare function position(jdUT1: number, body: Body): Position;
/** Position at a Julian day TT. */
export declare function positionTT(jdTT: number, body: Body): Position;
/** House cusps at a Julian day UT1; latitude north positive, longitude east positive (degrees). */
export declare function houses(jdUT1: number, latitude: number, longitudeEast: number, system: HouseSystem): Houses;
/** Engine and data identification, coverage and sources. */
export declare function info(): EngineInfo;
