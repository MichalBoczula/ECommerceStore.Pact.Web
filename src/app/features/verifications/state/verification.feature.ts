import { createFeature, createReducer, on } from '@ngrx/store';
import { RegistryFailure } from '../../../shared/domain/registry-error';
import { RunSources, VerificationData, VerificationSelection } from '../application/verification-view.models';
import { VerificationActions as Events } from './verification.actions';

export interface VerificationState {
  readonly selection: VerificationSelection | null;
  readonly status: 'idle' | 'loading' | 'loaded' | 'error';
  readonly data: VerificationData | null;
  readonly error: RegistryFailure | null;
  readonly sources: RunSources | null;
  readonly download: 'idle' | 'loading' | 'started' | 'error';
  readonly downloadError: RegistryFailure | null;
}
const initial: VerificationState = { selection: null, status: 'idle', data: null, error: null, sources: null, download: 'idle', downloadError: null };
export const verificationFeature = createFeature({ name: 'verificationEvidence', reducer: createReducer(initial,
  on(Events.opened, (_state, { selection }) => ({ ...initial, selection, status: 'loading' as const })),
  on(Events.loaded, (state, { data }) => ({ ...state, status: 'loaded' as const, data })),
  on(Events.failed, (state, { error }) => ({ ...state, status: 'error' as const, data: null, error })),
  on(Events.sourcesLoaded, (state, { sources }) => ({ ...state, sources })),
  on(Events.left, () => initial),
  on(Events.downloadRequested, state => ({ ...state, download: 'loading' as const, downloadError: null })),
  on(Events.downloadStarted, state => ({ ...state, download: 'started' as const })),
  on(Events.downloadFailed, (state, { error }) => ({ ...state, download: 'error' as const, downloadError: error })),
) });
