// ---------------------------------------------------------------------------
// CalendarPermission — result of a permission check/request
// ---------------------------------------------------------------------------

export type CalendarPermission =
  | 'granted'
  | 'denied'
  | 'never_ask_again';

// ---------------------------------------------------------------------------
// CalendarEvent — a single event read from the device calendar
// ---------------------------------------------------------------------------

export type CalendarEvent = {
  id: string;
  title: string;
  startMs: number;
  endMs: number;
  allDay: boolean;
  calendarId: string;
  location: string | null;
};
