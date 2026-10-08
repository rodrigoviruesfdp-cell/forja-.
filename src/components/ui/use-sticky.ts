"use client";

import { useState } from "react";

/**
 * Keeps the last non-null value, so a sheet keeps showing its content while it slides
 * away after its subject was cleared.
 */
export function useSticky<T>(value: T | null): T | null {
  const [last, setLast] = useState<T | null>(value);
  if (value !== null && value !== last) setLast(value);
  return value ?? last;
}
