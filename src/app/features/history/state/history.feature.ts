import { createFeature, createReducer, on } from '@ngrx/store';
import { RegistryFailure } from '../../../shared/domain/registry-error';
import { HistoryData, HistorySelection } from '../application/history-view.models';
import { HistoryActions as Events } from './history.actions';

export interface HistoryState {
  readonly selection: HistorySelection | null;
  readonly status: 'idle' | 'loading' | 'loaded' | 'error';
  readonly data: HistoryData | null;
  readonly error: RegistryFailure | null;
}
const initial: HistoryState = { selection: null, status: 'idle', data: null, error: null };
export const historyFeature = createFeature({ name: 'contractHistory', reducer: createReducer(initial,
  on(Events.opened, (_state, { selection }) => ({ ...initial, selection, status: 'loading' as const })),
  on(Events.loaded, (state, { data }) => ({ ...state, status: 'loaded' as const, data })),
  on(Events.failed, (state, { error }) => ({ ...state, status: 'error' as const, data: null, error })),
  on(Events.left, () => initial),
) });
