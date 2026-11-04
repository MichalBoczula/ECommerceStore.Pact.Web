import { inject, Injectable } from '@angular/core';
import { PactTransport } from '../../../shared/infrastructure/pact-transport';
import { page, pageQuery } from '../../../shared/infrastructure/read-mapping';
import { ComparisonFilter, IssueHistoryRequest } from '../domain/history.models';
import { HistoryRepository } from '../domain/history.repository';
import * as map from './history.mapper';

@Injectable()
export class KiotaHistoryRepository extends HistoryRepository {
  private readonly transport = inject(PactTransport);
  override comparisons(filter: ComparisonFilter = {}) {
    return this.transport.read(api => api.api.contractComparisons.get({ queryParameters: { ...filter, ...pageQuery(filter) } }), dto => page(dto, map.comparisonSummary));
  }
  override comparison(id: string) { return this.transport.read(api => api.api.contractComparisons.byId(id).get(), map.comparison); }
  override issueHistory(request: IssueHistoryRequest) { return this.transport.read(api => api.api.issueHistory.get({ queryParameters: { ...request } }), map.issueHistory, true); }
}
