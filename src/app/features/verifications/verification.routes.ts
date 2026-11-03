import { Routes } from '@angular/router';
import { provideEffects } from '@ngrx/effects';
import { provideState } from '@ngrx/store';
import { ArtifactDownloads } from '../../shared/domain/artifact-downloads';
import { BrowserArtifactDownloads } from '../../shared/infrastructure/browser-artifact-downloads';
import { provideRegistryReads } from '../../shared/infrastructure/registry.providers';
import { VerificationFacade } from './application/verification.facade';
import { VerificationEffects } from './state/verification.effects';
import { verificationFeature } from './state/verification.feature';

const page = () => import('./presentation/verification-page').then(m => m.VerificationPage);
export const VERIFICATION_ROUTES: Routes = [{ path: '', providers: [provideRegistryReads(), provideState(verificationFeature), provideEffects(VerificationEffects), VerificationFacade,
  { provide: ArtifactDownloads, useClass: BrowserArtifactDownloads },
], children: [
  { path: '', title: 'Verifications | Pact', loadComponent: page },
  { path: ':id', title: 'Verification details | Pact', loadComponent: page },
] }];
