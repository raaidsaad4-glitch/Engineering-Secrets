
import { VibrationType } from './types';

export const COMFORT_LIMITS = {
  OFFICE: 0.5, // %g
  MALL: 1.5,   // %g
  BRIDGE_OUTDOOR: 5.0, // %g
  SENSITIVE_01: 0.1, // %g
};

export const RHYTHMIC_LIMITS = {
  OFFICE: 0.5,
  DINING: 2.0,
  AEROBICS: 5.0, // Average of 4-7%g range
};

// Data points for the human comfort curves (based on Guide 11 Fig 2-1)
// We interpolate/extrapolate from these
export const ISO_BASELINE_DATA = [
  { f: 1.0, a: 0.1 },
  { f: 2.0, a: 0.07 },
  { f: 4.0, a: 0.05 },
  { f: 8.0, a: 0.05 },
  { f: 16.0, a: 0.1 },
  { f: 32.0, a: 0.2 },
  { f: 64.0, a: 0.4 },
];

export const OFFICE_LIMIT_DATA = ISO_BASELINE_DATA.map(d => ({ f: d.f, a: d.a * 10 }));
export const MALL_LIMIT_DATA = ISO_BASELINE_DATA.map(d => ({ f: d.f, a: d.a * 30 }));
export const OUTDOOR_BRIDGE_DATA = ISO_BASELINE_DATA.map(d => ({ f: d.f, a: d.a * 100 }));
