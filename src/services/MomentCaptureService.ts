import { type DB } from '@op-engineering/op-sqlite';
import { type MomentWithPeople, type Result } from '../types/moments';
import { type PlaceResolverRegistry } from './place-resolver/PlaceResolverRegistry';
import { type RuleRegistry } from './rules/RuleRegistry';
import { withTransaction } from '../db/tx';
import { insertMoment } from '../db/queries/moments';
import { insertMomentPerson } from '../db/queries/moment_people';
import { insertEntry } from '../db/queries/entries';

let _entryIdCounter = 0;
function generateId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export type CaptureInput = {
  note: string | null;
  occurredAt: number;
  entryIds: string[];
  /** If provided, skip place resolution and use this place directly */
  placeId?: string;
  source?: 'camera' | 'voice' | 'gallery';
  latitude?: number | null;
  longitude?: number | null;
  placeName?: string | null;
  weatherTemp?: number | null;
  weatherCondition?: string | null;
  type?: string | null;
  /** Inline new-person names to create entries for inside the transaction */
  newPeople?: { name: string }[];
};

export type CaptureResult = {
  momentId: string;
};

/**
 * Facade for all moment creation flows.
 *
 * Single entry point enforced by R-CONV-04. Nothing else may write to
 * moments or moment_people directly — only through this service.
 */
export class MomentCaptureService {
  constructor(
    private db: DB,
    private placeResolvers: PlaceResolverRegistry,
    private rules: RuleRegistry,
  ) {}

  async capture(input: CaptureInput): Promise<Result<CaptureResult>> {
    try {
      const momentId = withTransaction(this.db, tx => {
        const id = insertMoment(tx, {
          note: input.note,
          occurredAt: input.occurredAt,
          placeId: input.placeId ?? null,
          source: input.source ?? null,
          latitude: input.latitude ?? null,
          longitude: input.longitude ?? null,
          placeName: input.placeName ?? null,
          weatherTemp: input.weatherTemp ?? null,
          weatherCondition: input.weatherCondition ?? null,
          type: input.type ?? null,
        });

        const resolvedEntryIds: string[] = [];

        for (const entryId of input.entryIds) {
          resolvedEntryIds.push(entryId);
        }

        if (input.newPeople) {
          for (const np of input.newPeople) {
            const now = Date.now();
            const entryId = generateId();
            insertEntry(tx, {
              id: entryId,
              category_id: 'people',
              name: np.name,
              notes: null,
              is_public: 0,
              created_at: now,
              updated_at: now,
            });
            resolvedEntryIds.push(entryId);
          }
        }

        for (const eid of resolvedEntryIds) {
          insertMomentPerson(tx, id, eid);
        }

        return id;
      });

      return { ok: true, value: { momentId } };
    } catch (e) {
      return { ok: false, error: String(e) };
    }
  }

  async addPeopleToMoment(
    momentId: string,
    entryIds: string[],
    newPeople: { name: string }[],
  ): Promise<Result<void>> {
    try {
      withTransaction(this.db, tx => {
        for (const entryId of entryIds) {
          insertMomentPerson(tx, momentId, entryId);
        }
        for (const np of newPeople) {
          const now = Date.now();
          const entryId = generateId();
          insertEntry(tx, {
            id: entryId,
            category_id: 'people',
            name: np.name,
            notes: null,
            is_public: 0,
            created_at: now,
            updated_at: now,
          });
          insertMomentPerson(tx, momentId, entryId);
        }
      });
      return { ok: true, value: undefined };
    } catch (e) {
      return { ok: false, error: String(e) };
    }
  }

  async getMomentWithPeople(momentId: string): Promise<Result<MomentWithPeople>> {
    throw new Error('MomentCaptureService.getMomentWithPeople: Not implemented');
  }
}
