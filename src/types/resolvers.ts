import { type MomentWithPeople, type SavedPlace, type Result } from './moments';

// ---------------------------------------------------------------------------
// PlaceResolution — the value a successful resolver returns
// ---------------------------------------------------------------------------

export type PlaceResolution = {
  place: SavedPlace;
  /** Confidence in [0, 1] — resolvers with higher confidence win ties */
  confidence: number;
  /** Which resolver produced this result */
  resolvedBy: string;
};

// ---------------------------------------------------------------------------
// PlaceResolver interface — all place-resolver strategies implement this
// ---------------------------------------------------------------------------

export interface PlaceResolver {
  /** Unique stable identifier, e.g. "gps-resolver" */
  readonly id: string;
  /** Human-readable label */
  readonly name: string;
  /**
   * Attempt to resolve a place for the given moment.
   * Return null if this resolver cannot handle the moment.
   * Return Result<PlaceResolution> otherwise.
   */
  resolve(moment: MomentWithPeople): Promise<Result<PlaceResolution> | null>;
}
