import { Page } from '../../registry/domain/registry.models';
import { CompatibilityDecision, DecisionSummary, VerificationProfile } from '../domain/compatibility.models';

export interface CompatibilitySelection {
  readonly kind: 'decisions' | 'decision' | 'profiles' | 'profile';
  readonly id: string | null;
  readonly query: Readonly<Record<string, string>>;
  readonly ambiguous: boolean;
}
export type CompatibilityData = { readonly kind: 'decisions'; readonly page: Page<DecisionSummary> }
  | { readonly kind: 'decision'; readonly decision: CompatibilityDecision }
  | { readonly kind: 'profiles'; readonly page: Page<VerificationProfile> }
  | { readonly kind: 'profile'; readonly profile: VerificationProfile };
