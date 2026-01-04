
export enum VibrationType {
  WALKING = 'WALKING',
  RUNNING = 'RUNNING',
  WALKING_AND_RUNNING = 'WALKING & RUNNING',
  RHYTHMIC = 'RHYTHMETIC',
  SENSITIVE_EQUIPMENT = 'SENSITIVE EQUIPMENT'
}

export interface VibrationInputs {
  checkType: VibrationType;
  dampingRatio: number; // Percentage (e.g., 3.0)
  bodyWeightKg: number;
  frfMaxLow: number;    // %g/lb
  frfMaxHigh: number;   // %g/lb
  dominantFreqLow: number;  // Hz
  dominantFreqHigh: number; // Hz
}

export interface CalculationResult {
  peakAcceleration: number; // %g
  limit: number;            // %g
  isAcceptable: boolean;
  formulaUsed: string;
  harmonic?: number;
}

export interface MultiResult {
  lowFreq: CalculationResult;
  highFreq: CalculationResult;
}
