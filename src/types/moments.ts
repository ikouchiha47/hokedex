// ---------------------------------------------------------------------------
// Result<T> — shared return type for fallible operations
// ---------------------------------------------------------------------------

export type Result<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

// ---------------------------------------------------------------------------
// Moment-family types — mirror DB table shapes
// ---------------------------------------------------------------------------

export type Moment = {
  id: string;
  note: string | null;
  occurred_at: number;
  place_id: string | null;
  created_at: number;
};

export type MomentPerson = {
  id: string;
  moment_id: string;
  entry_id: string;
};

export type MomentTag = {
  id: string;
  moment_id: string;
  key: string;
  value: string;
};

export type PersonDate = {
  id: string;
  entry_id: string;
  label: string;
  date_ms: number;
};

export type SavedPlace = {
  id: string;
  name: string;
  address: string | null;
  lat_e6: number | null;
  lng_e6: number | null;
  created_at: number;
};

// ---------------------------------------------------------------------------
// Composite types — joins used in service layer
// ---------------------------------------------------------------------------

export type MomentWithPeople = Moment & {
  people: MomentPerson[];
};
