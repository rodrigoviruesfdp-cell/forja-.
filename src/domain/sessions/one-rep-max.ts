/**
 * Estimated one-rep max (Epley): weight × (1 + reps / 30). With 1 rep it is the weight itself.
 * The formula drifts with long sets, so it is only estimated up to MAX_REPS_FOR_ESTIMATE:
 * a set of 30 light reps must not become a "record" over a heavy set of 5.
 */
export const MAX_REPS_FOR_ESTIMATE = 12;

export function estimateOneRepMax(weightKg: number, reps: number): number | null {
  if (weightKg <= 0 || reps < 1 || reps > MAX_REPS_FOR_ESTIMATE) return null;
  if (reps === 1) return weightKg;
  return weightKg * (1 + reps / 30);
}
