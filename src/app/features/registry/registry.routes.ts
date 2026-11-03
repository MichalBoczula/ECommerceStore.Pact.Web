import { provideEffects } from '@ngrx/effects';
import { provideState } from '@ngrx/store';
import { Routes } from '@angular/router';
import { provideRegistryReads } from '../../shared/infrastructure/registry.providers';
import { ArtifactDownloads } from './application/explorer.models';
import { ExplorerFacade } from './application/explorer.facade';
import { BrowserArtifactDownloads } from './infrastructure/browser-artifact-downloads';
import { explorerFeature } from './state/explorer.feature';
import { ExplorerEffects } from './state/explorer.effects';

const page = () => import('./presentation/explorer-page').then(m => m.ExplorerPage);
export const REGISTRY_ROUTES: Routes = [{ path: '', providers: [
  provideRegistryReads(), provideState(explorerFeature), provideEffects(ExplorerEffects), ExplorerFacade,
  { provide: ArtifactDownloads, useClass: BrowserArtifactDownloads },
], children: [
  { path: 'applications', title: 'Applications | Pact', data: { kind: 'applications' }, loadComponent: page },
  { path: 'applications/:applicationId', title: 'Application versions | Pact', data: { kind: 'versions' }, loadComponent: page },
  { path: 'applications/:applicationId/versions/:commitSha', title: 'Registered version | Pact', data: { kind: 'version' }, loadComponent: page },
  { path: 'dependencies', title: 'Dependencies | Pact', data: { kind: 'integrations' }, loadComponent: page },
  { path: 'dependencies/:consumerApplicationId/:providerApplicationId', title: 'Declared integration | Pact', data: { kind: 'integration' }, loadComponent: page },
  { path: 'contracts', title: 'Contracts | Pact', data: { kind: 'publications' }, loadComponent: page },
  { path: 'contracts/:id', title: 'Contract publication | Pact', data: { kind: 'publication' }, loadComponent: page },
] }];
