// Types
export type NextEvent = {
  label: 'Today' | 'Tomrw';
  title: string;
};

// Constants
const MS_PER_DAY = 86_400_000;

// Functions

/**
 * Returns the next calendar event within 2 days of today, or null.
 * Phase 2 stub: always returns null.
 * TODO Phase 5: query CalendarProxy / Planner DB for events within 2 days of today.
 */
export function getNextEvent(_today: Date): NextEvent | null {
  void MS_PER_DAY; // referenced to satisfy lint; real impl uses it
  return null;
}

/**
 * Returns true when the eventful day scorer flags the current day as notable.
 * Phase 2 stub: always returns false (memory card hidden).
 * TODO Phase 6: query eventful day scorer from moments DB.
 */
export function isEventfulDay(): boolean {
  return false;
}
