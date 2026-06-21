import { type PlaceResolver, type PlaceResolution } from '../../types/resolvers';
import { type MomentWithPeople, type Result } from '../../types/moments';

/**
 * Registry of PlaceResolver strategies.
 * Phase 1 stub — all methods throw until Phase 2 implements them.
 *
 * Resolvers self-register via register(). The registry tries each in
 * insertion order and returns the highest-confidence result.
 */
export class PlaceResolverRegistry {
  private resolvers: PlaceResolver[] = [];

  register(resolver: PlaceResolver): void {
    this.resolvers.push(resolver);
  }

  async resolve(moment: MomentWithPeople): Promise<Result<PlaceResolution> | null> {
    throw new Error('PlaceResolverRegistry.resolve: Not implemented');
  }
}
