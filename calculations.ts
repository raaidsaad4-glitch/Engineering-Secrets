
import { VibrationInputs, VibrationType, CalculationResult, MultiResult } from './types';

const KG_TO_LB = 2.20462;

/**
 * Calculates the frequency-dependent acceleration limit based on AISC Guide 11 Fig 2-1 (ISO 2631-2).
 * This function performs log-linear interpolation between the key points of the baseline curve.
 */
const getLimitAtFreq = (f: number, type: VibrationType): number => {
  // ISO Baseline data points (acceleration in %g)
  const basePoints = [
    { f: 1.0, a: 0.1 },
    { f: 2.0, a: 0.07 },
    { f: 4.0, a: 0.05 },
    { f: 8.0, a: 0.05 },
    { f: 16.0, a: 0.1 },
    { f: 32.0, a: 0.2 },
    { f: 64.0, a: 0.4 },
    { f: 100.0, a: 0.625 }
  ];

  // Determine multiplier M based on occupancy/check type
  let M = 10; // Default Office/Residential (Multiplier of 10)
  if (type === VibrationType.RUNNING) {
    M = 100; // Outdoor Bridge / Track
  } else if (type === VibrationType.RHYTHMIC) {
    M = 30;  // Shopping / Dining approx
  } else if (type === VibrationType.SENSITIVE_EQUIPMENT) {
    M = 2;   // High sensitivity (Multiplier of 2 ≈ 0.1%g baseline)
  }

  // Find surrounding points for interpolation
  let p1 = basePoints[0];
  let p2 = basePoints[basePoints.length - 1];

  for (let i = 0; i < basePoints.length - 1; i++) {
    if (f >= basePoints[i].f && f <= basePoints[i + 1].f) {
      p1 = basePoints[i];
      p2 = basePoints[i + 1];
      break;
    }
  }

  // Handle extrapolation
  if (f < basePoints[0].f) return basePoints[0].a * M;
  if (f > basePoints[basePoints.length - 1].f) return basePoints[basePoints.length - 1].a * M;

  // Log-Log interpolation for frequency-dependent acceleration curves
  const logF = Math.log10(f);
  const logF1 = Math.log10(p1.f);
  const logF2 = Math.log10(p2.f);
  const logA1 = Math.log10(p1.a);
  const logA2 = Math.log10(p2.a);

  const logA = logA1 + (logF - logF1) * (logA2 - logA1) / (logF2 - logF1);
  return Math.pow(10, logA) * M;
};

export const calculateResults = (inputs: VibrationInputs): MultiResult => {
  const weightLb = inputs.bodyWeightKg * KG_TO_LB;
  const beta = inputs.dampingRatio / 100;

  const calcSingle = (frfMax: number, fn: number, type: VibrationType, isLowFreq: boolean): CalculationResult => {
    let peakAcc = 0;
    let formula = "";
    
    const limit = getLimitAtFreq(fn, type);

    switch (type) {
      case VibrationType.WALKING:
      case VibrationType.WALKING_AND_RUNNING:
        if (fn <= 9) {
          const alpha = 0.09 * Math.exp(-0.075 * fn);
          const rho = beta >= 0.03 ? 1.0 : (beta < 0.01 ? (50 * beta + 0.25) : (12.5 * beta + 0.625));
          peakAcc = frfMax * alpha * weightLb * rho;
          formula = `ap = FRF_Max * α * Q * ρ (Eq 7-1)`;
        } else {
          // High-Frequency Case - Chapter 7.4.1 FEA ESPA Scaling
          peakAcc = frfMax * 0.085 * weightLb; 
          formula = `Effective Peak Approximation (ESPA-based)`;
        }
        break;

      case VibrationType.RUNNING:
        let h_run = 1;
        if (fn > 4) h_run = 2;
        if (fn > 8) h_run = 3;
        if (fn > 12) h_run = 4;
        const alpha_run = h_run === 1 ? 1.4 : (h_run === 2 ? 0.4 : (h_run === 3 ? 0.2 : 0.1));
        const nSteps = 10; 
        peakAcc = frfMax * alpha_run * weightLb * (1 - Math.exp(-2 * Math.PI * beta * h_run * nSteps));
        formula = `ap = FRF_Max * αh * Q * [1 - e^(-2πβhN)] (Eq 7-7)`;
        break;

      case VibrationType.RHYTHMIC:
        const alpha_rhy = 1.25; 
        peakAcc = frfMax * alpha_rhy * (weightLb / 25); 
        formula = `ap,i = FRF * αi * wp (Eq 7-9)`;
        break;

      case VibrationType.SENSITIVE_EQUIPMENT:
        const alpha_sens = 0.1 * Math.exp(-0.1 * fn); 
        peakAcc = 1.3 * frfMax * alpha_sens * weightLb;
        formula = `ap = 1.3 * FRF_Max * α * Q (Eq 7-11)`;
        break;
    }

    return {
      peakAcceleration: peakAcc,
      limit,
      isAcceptable: peakAcc <= limit,
      formulaUsed: formula
    };
  };

  return {
    lowFreq: calcSingle(inputs.frfMaxLow, inputs.dominantFreqLow, inputs.checkType, true),
    highFreq: calcSingle(inputs.frfMaxHigh, inputs.dominantFreqHigh, inputs.checkType, false)
  };
};
