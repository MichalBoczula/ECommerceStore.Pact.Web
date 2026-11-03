import { Routes } from '@angular/router';
import { provideEffects } from '@ngrx/effects';
import { provideState } from '@ngrx/store';
import { HistoryFacade } from './application/history.facade';
import { HistoryRepository } from './domain/history.repository';
import { KiotaHistoryRepository } from './infrastructure/kiota-history.repository';
import { HistoryEffects } from './state/history.effects';
import { historyFeature } from './state/history.feature';

const page = () => import('./presentation/history-page').then(m => m.HistoryPage);
export const HISTORY_ROUTES: Routes = [{ path: '', providers: [provideState(historyFeature), provideEffects(HistoryEffects), HistoryFacade,
  { provide: HistoryRepository, useClass: KiotaHistoryRepository },
], children: [
  { path: 'contracts/comparisons', title: 'Contract comparisons | Pact', data: { kind: 'comparisons' }, loadComponent: page },
  { path: 'contracts/comparisons/:id', title: 'Stored contract comparison | Pact', data: { kind: 'comparison' }, loadComponent: page },
  { path: 'issue-history', title: 'Issue history | Pact', data: { kind: 'issues' }, loadComponent: page },
] }];
