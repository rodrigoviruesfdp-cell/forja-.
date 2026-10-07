/**
 * Weight units. Everything is stored in kg; pounds exist only at the edges
 * (what the user types and what the user reads).
 */

export const WEIGHT_UNITS = ["kg", "lb"] as const;
export type WeightUnit = (typeof WEIGHT_UNITS)[number];

export const KG_PER_LB = 0.45359237;

/** Database precision for weights (numeric(7,3)). */
const STORAGE_DECIMALS = 3;

export function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

/** Converts a value typed by the user in `unit` to kg, at storage precision. */
export function toKg(value: number, unit: WeightUnit): number {
  const kg = unit === "kg" ? value : value * KG_PER_LB;
  return roundTo(kg, STORAGE_DECIMALS);
}

/** Converts a stored kg value to `unit`, rounded for display. */
export function fromKg(kg: number, unit: WeightUnit): number {
  const value = unit === "kg" ? kg : kg / KG_PER_LB;
  return roundTo(value, displayDecimals(unit));
}

/** kg plates go down to 0.25 kg (2 decimals); lb to 0.1 lb is plenty. */
export function displayDecimals(unit: WeightUnit): number {
  return unit === "kg" ? 2 : 1;
}

export function formatWeight(kg: number, unit: WeightUnit, locale: string): string {
  const value = fromKg(kg, unit);
  const number = new Intl.NumberFormat(locale, {
    maximumFractionDigits: displayDecimals(unit),
  }).format(value);
  return `${number} ${unit}`;
}

/**
 * Parses what the user typed. Accepts both decimal separators ("102,5" and "102.5")
 * and rejects anything that is not a finite, non-negative number.
 */
export function parseDecimal(input: string): number | null {
  const normalized = input.trim().replace(/\s/g, "").replace(",", ".");
  if (normalized === "" || !/^\d*\.?\d+$|^\d+\.$/.test(normalized)) return null;
  const value = Number(normalized);
  return Number.isFinite(value) && value >= 0 ? value : null;
}
