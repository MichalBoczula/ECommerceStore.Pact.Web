import { createFeature, createReducer, on } from '@ngrx/store';
import { RegistryFailure } from '../../../shared/domain/registry-error';
import { OverviewData, OverviewSelection } from '../application/overview-view.models';
import { OverviewActions as Events } from './overview.actions';

export interface OverviewState {
  readonly selection: OverviewSelection | null;
  readonly status: 'idle' | 'loading' | 'loaded' | 'error';
  readonly data: OverviewData | null;
  readonly error: RegistryFailure | null;
}
const initial: OverviewState = { selection: null, status: 'idle', data: null, error: null };
export const overviewFeature = createFeature({ name: 'overview', reducer: createReducer(initial,
  on(Events.opened, (_state, { selection }) => ({ ...initial, selection, status: 'loading' as const })),
  on(Events.loaded, (state, { data }) => ({ ...state, status: 'loaded' as const, data })),
  on(Events.failed, (state, { error }) => ({ ...state, status: 'error' as const, data: null, error })),
  on(Events.left, () => initial),
) });
