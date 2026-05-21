// src/lib/temporal.ts
// Single-responsibility temporal utilities for window enforcement.
// getCurrentActiveWindow is the SINGLE SOURCE OF TRUTH from progress.ts.

import { getCurrentActiveWindow } from "@/lib/progress";

// Re-export so consumers can import from either file
export { getCurrentActiveWindow };

/**
 * Returns the quarter number (1–4) for a given date.
 */
export function getQuarter(date: Date): number {
  return Math.floor(date.getMonth() / 3) + 1;
}

/**
 * Returns true if the given date falls within the current calendar quarter.
 */
export function isWithinQuarter(date: Date = new Date()): boolean {
  const now = new Date();
  return getQuarter(now) === getQuarter(date);
}

/**
 * Returns true only if the current phase is "GoalSetting".
 * Use this to gate goal creation / submission.
 */
export function isGoalCreationAllowed(): boolean {
  const win = getCurrentActiveWindow();
  return win.phase === "GoalSetting" && win.isOpen;
}

/**
 * Returns true only if the current phase is "Checkin" AND the
 * active quarter matches the requested quarter.
 */
export function isCheckinAllowed(quarter: string): boolean {
  const win = getCurrentActiveWindow();
  return win.phase === "Checkin" && win.isOpen && win.quarter === quarter;
}

/**
 * Returns a human-readable description of the next open window.
 * Useful for tooltip / banner messages.
 */
export function getNextOpenWindow(): { label: string; opensIn: string } {
  const month = new Date().getMonth() + 1; // 1-12

  // Window schedule (from progress.ts):
  //   Apr-May  → GoalSetting
  //   Jul      → Q1 Checkin
  //   Oct      → Q2 Checkin
  //   Jan      → Q3 Checkin
  //   Mar-Apr  → Q4 Checkin
  //   Other    → Closed

  const schedule: { months: number[]; label: string; opensIn: string }[] = [
    { months: [1],    label: "Q3 Check-in",   opensIn: "January" },
    { months: [3, 4], label: "Q4 Check-in",   opensIn: "March" },
    { months: [4, 5], label: "Goal Setting",  opensIn: "April" },
    { months: [7],    label: "Q1 Check-in",   opensIn: "July" },
    { months: [10],   label: "Q2 Check-in",   opensIn: "October" },
  ];

  // Find the NEXT window whose first month is strictly after the current month
  const upcoming = schedule
    .filter(w => w.months[0] > month)
    .sort((a, b) => a.months[0] - b.months[0]);

  if (upcoming.length > 0) {
    return { label: upcoming[0].label, opensIn: upcoming[0].opensIn };
  }

  // Wrap around to next year → first window is Jan (Q3 Check-in)
  return { label: "Q3 Check-in", opensIn: "January" };
}
