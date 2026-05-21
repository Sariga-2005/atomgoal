// src/lib/progress.ts

import { UnitOfMeasurement, Goal, QuarterlyCheckin } from "../types";

/**
 * Compute progress score (0-100) based on unit of measurement.
 * For Numeric/% units we need a direction (min: higher is better, max: lower is better).
 * Since the current schema does not store direction, we infer:
 *   - If unit is "%" or "Numeric" and target > achievement => treat as "max" (e.g., TAT, Cost).
 *   - Otherwise treat as "min".
 * For Timeline we compare completionDate with deadline.
 * For Zero-based, only achievement === 0 yields 100%.
 */
export function computeProgressScore(
  unit: UnitOfMeasurement,
  achievement: string,
  target: string,
  options?: { completionDate?: Date; deadline?: Date; direction?: "min" | "max" }
): number {
  const ach = parseFloat(achievement);
  const tgt = parseFloat(target);
  if (isNaN(ach) || isNaN(tgt)) return 0;

  switch (unit) {
    case "Numeric":
    case "%": {
      const dir = options?.direction ?? (tgt > ach ? "max" : "min");
      if (dir === "min") {
        return Math.min((ach / tgt) * 100, 100);
      } else {
        return Math.min((tgt / ach) * 100, 100);
      }
    }
    case "Timeline": {
      const { completionDate, deadline } = options ?? {};
      if (!completionDate || !deadline) return 0;
      return completionDate <= deadline ? 100 : 0;
    }
    case "Zero-based": {
      return ach === 0 ? 100 : 0;
    }
    default:
      return 0;
  }
}

/** Return Tailwind color classes for score badge */
export function getScoreColor(score: number) {
  if (score >= 80) {
    return { bg: "bg-emerald-100", text: "text-emerald-800", border: "border-emerald-200" };
  }
  if (score >= 50) {
    return { bg: "bg-amber-100", text: "text-amber-800", border: "border-amber-200" };
  }
  return { bg: "bg-rose-100", text: "text-rose-800", border: "border-rose-200" };
}

/** Determine current active phase/quarter based on month */
export function getCurrentActiveWindow() {
  try {
    const overridePhase = localStorage.getItem("admin_override_phase");
    if (overridePhase) {
      const overrideQuarter = localStorage.getItem("admin_override_quarter");
      return {
        phase: overridePhase,
        quarter: overrideQuarter === "null" || !overrideQuarter ? null : overrideQuarter,
        isOpen: overridePhase !== "Closed"
      };
    }
  } catch(e) {}

  const now = new Date();
  const month = now.getMonth() + 1; // 1-12
  // Phase definitions (adjusted to requirements)
  if (month >= 4 && month <= 5) {
    return { phase: "GoalSetting", quarter: null, isOpen: true };
  }
  if (month >= 7 && month <= 7) {
    return { phase: "Checkin", quarter: "Q1", isOpen: true };
  }
  if (month >= 10 && month <= 10) {
    return { phase: "Checkin", quarter: "Q2", isOpen: true };
  }
  if (month >= 1 && month <= 1) {
    return { phase: "Checkin", quarter: "Q3", isOpen: true };
  }
  if (month >= 3 && month <= 4) {
    return { phase: "Checkin", quarter: "Q4", isOpen: true };
  }
  // all other months closed
  return { phase: "Closed", quarter: null, isOpen: false };
}
