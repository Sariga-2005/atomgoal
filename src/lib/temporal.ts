/**
 * Temporal utilities for enforcing quarterly check‑in windows.
 * Currently provides a simple helper that determines whether a given
 * Date falls within the current calendar quarter. This can be used
 * to restrict actions (e.g., check‑in submissions) to the active
 * quarter only.
 */

/**
 * Returns the quarter number (1‑4) for a given date.
 * @param date Date to evaluate.
 */
export function getQuarter(date: Date): number {
  // JavaScript months are 0‑based (0 = January).
  return Math.floor(date.getMonth() / 3) + 1;
}

// Determine current active phase/quarter based on month
export function getCurrentActiveWindow() {
  const now = new Date();
  const month = now.getMonth() + 1; // 1-12
  // Define windows: GoalSetting in first month of each quarter, Checkin in second month, otherwise closed.
  const quarter = Math.floor((month - 1) / 3) + 1; // 1-4
  const monthInQuarter = ((month - 1) % 3) + 1; // 1,2,3
  if (monthInQuarter === 1) {
    // Goal Setting phase
    return { phase: "GoalSetting", quarter: null, isOpen: true };
  } else if (monthInQuarter === 2) {
    // Check-in phase for the current quarter
    return { phase: "Checkin", quarter: `Q${quarter}`, isOpen: true };
  }
  // All other months (third month of quarter) are closed
  return { phase: "Closed", quarter: null, isOpen: false };
}

/**
 * Determines whether the provided date is within the current
 * calendar quarter. The function assumes the quarterly windows
 * are the full calendar quarters (Q1: Jan‑Mar, Q2: Apr‑Jun, Q3:
 * Jul‑Sep, Q4: Oct‑Dec). Adjust the logic if you need a more
 * restrictive window (e.g., only the first week of the quarter).
 *
 * @param date Date to test. If omitted, the current date/time is used.
 * @returns true if the date is within the active quarter, false otherwise.
 */
export function isWithinQuarter(date: Date = new Date()): boolean {
  const now = new Date();
  const currentQuarter = getQuarter(now);
  const targetQuarter = getQuarter(date);
  return currentQuarter === targetQuarter;
}
// Returns info about the next open window (goal setting or check‑in) based on the current date.
export function getNextOpenWindow(): { phase: string; quarter: string | null; isOpen: boolean } {
  const now = new Date();
  const month = now.getMonth() + 1; // 1‑12
  const quarter = Math.floor((month - 1) / 3) + 1; // 1‑4
  const monthInQuarter = ((month - 1) % 3) + 1; // 1,2,3

  // If currently in GoalSetting (monthInQuarter === 1), the next open window is the Checkin phase of the same quarter.
  if (monthInQuarter === 1) {
    return { phase: "Checkin", quarter: `Q${quarter}`, isOpen: true };
  }
  // If currently in Checkin (monthInQuarter === 2) or Closed (monthInQuarter === 3),
  // the next open window is the GoalSetting phase of the next quarter.
  const nextQuarter = quarter % 4 + 1; // wrap around to 1 after Q4
  return { phase: "GoalSetting", quarter: null, isOpen: true };
}
