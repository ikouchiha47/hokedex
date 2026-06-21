import { type MomentWithPeople, type Result } from './moments';

// ---------------------------------------------------------------------------
// RuleResult — what a rule produces when it fires
// ---------------------------------------------------------------------------

export type RuleResult = {
  ruleId: string;
  title: string;
  body: string;
  /** Optional deep-link or action URI the UI can offer */
  actionUri?: string;
};

// ---------------------------------------------------------------------------
// Rule interface — all smart-feature rules implement this
// ---------------------------------------------------------------------------

export interface Rule {
  /** Unique stable identifier for this rule, e.g. "birthday-reminder" */
  readonly id: string;
  /** Human-readable label for debugging/settings */
  readonly name: string;
  /**
   * Evaluate the rule against a moment.
   * Return null if the rule does not apply to this moment.
   * Return Result<RuleResult> otherwise.
   */
  evaluate(moment: MomentWithPeople): Result<RuleResult> | null;
}
