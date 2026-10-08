/**
 * Calendar days as "yyyy-mm-dd" strings in the phone's time zone: a session belongs to the
 * day you did it, wherever the server is. Weeks start on Monday (weekday 0), like the database.
 */
import type { Weekday } from "./routines/builder";

/** yyyy-mm-dd of a moment, in local time. */
export function localDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Local noon of a yyyy-mm-dd day (noon: never shifted to another day by DST). */
export function dateOf(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1, 12);
}

export function addDays(iso: string, days: number): string {
  const date = dateOf(iso);
  date.setDate(date.getDate() + days);
  return localDate(date);
}

/** Monday-based weekday of a yyyy-mm-dd day. */
export function weekdayOfIso(iso: string): Weekday {
  return ((dateOf(iso).getDay() + 6) % 7) as Weekday;
}

/** The Monday of the week a day belongs to. */
export function mondayOf(iso: string): string {
  return addDays(iso, -weekdayOfIso(iso));
}

export function isIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && localDate(dateOf(value)) === value;
}
