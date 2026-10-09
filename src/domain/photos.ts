/**
 * Progress photos: where their files live, how big they are kept, and which two to compare.
 * The files are processed on the phone (src/data/media) and kept private (Storage folder of the
 * user, see supabase/migrations/20261011000100_media.sql).
 */
import type { Clock } from "./routines/builder";
import { dateOf } from "./dates";
import type { Media, Pose } from "./schemas";

/** Long side of the stored photo and of its thumbnail, in pixels. */
export const FULL_SIZE = 1600;
export const THUMB_SIZE = 400;

/** Where a photo's files go: always inside the owner's folder. */
export function photoPaths(userId: string, mediaId: string): { full: string; thumb: string } {
  return { full: `${userId}/progress/${mediaId}.jpg`, thumb: `${userId}/progress/${mediaId}-thumb.jpg` };
}

/** The size that fits inside `max` × `max` keeping the proportions (never enlarged). */
export function fitInside(width: number, height: number, max: number): { width: number; height: number } {
  const scale = Math.min(1, max / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

export interface PhotoInput {
  takenAt: string;
  pose: Pose | null;
  width: number;
  height: number;
}

export function newProgressPhoto(userId: string, input: PhotoInput, clock: Clock): Media {
  const id = clock.newId();
  const paths = photoPaths(userId, id);
  return {
    id,
    user_id: userId,
    kind: "progress",
    storage_path: paths.full,
    thumb_path: paths.thumb,
    taken_at: input.takenAt,
    pose: input.pose,
    width: input.width,
    height: input.height,
    created_at: clock.now,
    updated_at: clock.now,
    deleted_at: null,
  };
}

/** Newest first; photos of the same day in the order they were added. */
export function byNewest(a: Media, b: Media): number {
  return b.taken_at.localeCompare(a.taken_at) || b.created_at.localeCompare(a.created_at);
}

/** Photos grouped by month ("2026-10"), newest month first. */
export function groupByMonth(photos: readonly Media[]): { month: string; photos: Media[] }[] {
  const groups = new Map<string, Media[]>();
  for (const photo of [...photos].filter((p) => !p.deleted_at).sort(byNewest)) {
    const month = photo.taken_at.slice(0, 7);
    groups.set(month, [...(groups.get(month) ?? []), photo]);
  }
  return [...groups].map(([month, items]) => ({ month, photos: items }));
}

/**
 * The comparison to start with: your latest photo against the oldest one in the same pose
 * (or the oldest of all if that pose has only one). Null with fewer than two photos.
 */
export function defaultComparison(photos: readonly Media[]): { before: Media; after: Media } | null {
  const alive = [...photos].filter((p) => !p.deleted_at).sort(byNewest);
  const after = alive[0];
  if (!after || alive.length < 2) return null;
  const samePose = alive.filter((p) => p.id !== after.id && p.pose === after.pose);
  const pool = samePose.length > 0 ? samePose : alive.filter((p) => p.id !== after.id);
  const before = pool.at(-1) as Media;
  return { before, after };
}

/** Time between two days: whole months and the days left over. */
export function timeBetween(from: string, to: string): { months: number; days: number } {
  const [early, late] = from <= to ? [from, to] : [to, from];
  const start = dateOf(early);
  const end = dateOf(late);
  let months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
  if (end.getDate() < start.getDate()) months -= 1;
  const anchor = new Date(start.getFullYear(), start.getMonth() + months, start.getDate(), 12);
  const days = Math.round((end.getTime() - anchor.getTime()) / 86_400_000);
  return { months, days };
}
