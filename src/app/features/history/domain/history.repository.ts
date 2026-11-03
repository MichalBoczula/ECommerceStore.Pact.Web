import { Observable } from 'rxjs';
import { Page } from '../../registry/domain/registry.models';
import { ComparisonFilter, ComparisonSummary, ContractComparison, IssueHistory, IssueHistoryRequest } from './history.models';

export abstract class HistoryRepository {
  abstract comparisons(filter?: ComparisonFilter): Observable<Page<ComparisonSummary>>;
  abstract comparison(id: string): Observable<ContractComparison>;
  abstract issueHistory(request: IssueHistoryRequest): Observable<IssueHistory>;
}
