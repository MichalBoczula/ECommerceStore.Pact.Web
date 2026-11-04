import { Routes } from '@angular/router';
import { provideEffects } from '@ngrx/effects';
import { provideState } from '@ngrx/store';
import { CompatibilityFacade } from './application/compatibility.facade';
import { CompatibilityRepository } from './domain/compatibility.repository';
import { KiotaCompatibilityRepository } from './infrastructure/kiota-compatibility.repository';
import { CompatibilityEffects } from './state/compatibility.effects';
import { compatibilityFeature } from './state/compatibility.feature';

const page = () => import('./presentation/compatibility-page').then(m => m.CompatibilityPage);
export const COMPATIBILITY_ROUTES: Routes = [{ path: '', providers: [provideState(compatibilityFeature), provideEffects(CompatibilityEffects), CompatibilityFacade,
  { provide: CompatibilityRepository, useClass: KiotaCompatibilityRepository },
], children: [
  { path: '', pathMatch: 'full', title: 'Compatibility | Pact', data: { kind: 'decisions' }, loadComponent: page },
  { path: 'decisions/:id', title: 'Compatibility decision | Pact', data: { kind: 'decision' }, loadComponent: page },
  { path: 'profiles', title: 'Verification profiles | Pact', data: { kind: 'profiles' }, loadComponent: page },
  { path: 'profiles/:id', title: 'Verification profile | Pact', data: { kind: 'profile' }, loadComponent: page },
] }];
