import { Page } from '../../registry/domain/registry.models';
import { ComparisonSummary, ContractComparison, IssueHistory } from '../domain/history.models';

export interface HistorySelection {
  readonly kind: 'comparisons' | 'comparison' | 'issues';
  readonly id: string | null;
  readonly query: Readonly<Record<string, string>>;
  readonly ambiguous: boolean;
}
export type HistoryData = { readonly kind: 'comparisons'; readonly page: Page<ComparisonSummary> }
  | { readonly kind: 'comparison'; readonly comparison: ContractComparison }
  | { readonly kind: 'issues'; readonly history: IssueHistory }
  | { readonly kind: 'selection' };
