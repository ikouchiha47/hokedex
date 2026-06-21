import { type DB } from '@op-engineering/op-sqlite';
import { type MomentWithPeople, type Result } from '../types/moments';
import { type PlaceResolverRegistry } from './place-resolver/PlaceResolverRegistry';
import { type RuleRegistry } from './rules/RuleRegistry';

export type CaptureInput = {
  note: string | null;
  occurredAt: number;
  entryIds: string[];
  /** If provided, skip place resolution and use this place directly */
  placeId?: string;
};

export type CaptureResult = {
  momentId: string;
};

/**
 * Facade for all moment creation flows.
 * Phase 1 stub — capture() throws until Phase 2 implements it.
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
    throw new Error('MomentCaptureService.capture: Not implemented');
  }

  async getMomentWithPeople(momentId: string): Promise<Result<MomentWithPeople>> {
    throw new Error('MomentCaptureService.getMomentWithPeople: Not implemented');
  }
}
