import { createFeature, createReducer, on } from '@ngrx/store';
import { RegistryFailure } from '../../../shared/domain/registry-error';
import { CompatibilityData, CompatibilitySelection } from '../application/compatibility-view.models';
import { CompatibilityActions as Events } from './compatibility.actions';

export interface CompatibilityState {
  readonly selection: CompatibilitySelection | null;
  readonly status: 'idle' | 'loading' | 'loaded' | 'error';
  readonly data: CompatibilityData | null;
  readonly error: RegistryFailure | null;
}
const initial: CompatibilityState = { selection: null, status: 'idle', data: null, error: null };
export const compatibilityFeature = createFeature({ name: 'compatibility', reducer: createReducer(initial,
  on(Events.opened, (_state, { selection }) => ({ ...initial, selection, status: 'loading' as const })),
  on(Events.loaded, (state, { data }) => ({ ...state, status: 'loaded' as const, data })),
  on(Events.failed, (state, { error }) => ({ ...state, status: 'error' as const, data: null, error })),
  on(Events.left, () => initial),
) });
