// Type declarations for zodiacally-ephemeris/agent (CommonJS).
import type { Body, EngineInfo, Houses, HouseSystem, Position } from './index';

export interface AgentInput {
  /** ISO 8601 UTC timestamp with seconds and Z, e.g. "2027-01-01T12:00:00Z". */
  utc: string;
  /** Degrees, north positive; the geographic poles are rejected. */
  latitude: number;
  /** Degrees, east positive. */
  longitude: number;
  /** Defaults to 'P'. Placidus falls back to whole sign inside the polar circles (reported). */
  houseSystem?: HouseSystem;
}

export interface Attribution {
  required: true;
  exception: string;
  url: string;
  de: string;
  en: string;
  placement: string;
}

export interface WhiteLabelLicence {
  currency: 'EUR';
  /** One-time licence fee in EUR, plus VAT where applicable. */
  amount: number;
  oneTime: true;
  /** Waives the attribution in readings or results shown or delivered to another person. */
  waivesCustomerFacingAttribution: true;
  /** Granted individually by Zodiacally on request; entering a licence tier in software does not grant it. */
  requiresSeparateGrant: true;
}

export interface Licence {
  defaultUse: string;
  attributionRequired: true;
  commercialUseRequiresSeparateLicence: false;
  whiteLabel: WhiteLabelLicence;
  terms: string;
}

export interface AgentResult {
  schema: 'zodiacally-ephemeris-agent.v1';
  utc: string;
  positions: Record<Body, Position>;
  houses: Houses & { requestedSystem: HouseSystem; usedSystem: HouseSystem; fallbackReason: 'PLACIDUS_POLAR' | null };
  conventions: Record<string, string | boolean>;
  provenance: EngineInfo;
  attribution: Attribution;
  licence: Licence;
}

export declare const attribution: Attribution;
export declare function calculate(input: AgentInput): AgentResult;
