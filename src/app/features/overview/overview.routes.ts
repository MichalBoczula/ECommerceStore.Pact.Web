import { Routes } from '@angular/router';
import { provideEffects } from '@ngrx/effects';
import { provideState } from '@ngrx/store';
import { provideRegistryReads } from '../../shared/infrastructure/registry.providers';
import { OverviewFacade } from './application/overview.facade';
import { OverviewRepository } from './domain/overview.repository';
import { KiotaOverviewRepository } from './infrastructure/kiota-overview.repository';
import { OverviewEffects } from './state/overview.effects';
import { overviewFeature } from './state/overview.feature';

export const OVERVIEW_ROUTES: Routes = [{ path: '', title: 'Overview | Pact', providers: [provideRegistryReads(), provideState(overviewFeature), provideEffects(OverviewEffects), OverviewFacade,
  { provide: OverviewRepository, useClass: KiotaOverviewRepository },
], loadComponent: () => import('./presentation/overview-page').then(m => m.OverviewPage) }];
