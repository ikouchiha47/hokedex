import { type Rule, type RuleResult } from '../../types/rules';
import { type MomentWithPeople, type Result } from '../../types/moments';

/**
 * Registry of smart-feature Rule implementations.
 * Phase 1 stub — evaluate throws until Phase 2 implements it.
 *
 * Rules self-register via register(). evaluate() runs all rules and
 * returns the results that fired (non-null returns).
 */
export class RuleRegistry {
  private rules: Rule[] = [];

  register(rule: Rule): void {
    this.rules.push(rule);
  }

  evaluate(moment: MomentWithPeople): Array<Result<RuleResult>> {
    throw new Error('RuleRegistry.evaluate: Not implemented');
  }
}
