import { createFeature, createReducer, on } from '@ngrx/store';
import { ExplorerData, ExplorerFailure, ExplorerSelection } from '../application/explorer.models';
import { ExplorerActions as Actions } from './explorer.actions';

export interface ExplorerState {
  readonly selection: ExplorerSelection | null;
  readonly status: 'idle' | 'loading' | 'loaded' | 'error';
  readonly data: ExplorerData | null;
  readonly error: ExplorerFailure | null;
  readonly download: 'idle' | 'loading' | 'saved' | 'error';
  readonly downloadError: ExplorerFailure | null;
}
const initialState: ExplorerState = { selection: null, status: 'idle', data: null, error: null, download: 'idle', downloadError: null };

export const explorerFeature = createFeature({ name: 'registryExplorer', reducer: createReducer(initialState,
  on(Actions.opened, (_state, { selection }) => ({ ...initialState, selection, status: 'loading' as const })),
  on(Actions.loaded, (state, { data }) => ({ ...state, status: 'loaded' as const, data })),
  on(Actions.failed, (state, { error }) => ({ ...state, status: 'error' as const, data: null, error })),
  on(Actions.left, () => initialState),
  on(Actions.downloadRequested, state => ({ ...state, download: 'loading' as const, downloadError: null })),
  on(Actions.downloadSaved, state => ({ ...state, download: 'saved' as const })),
  on(Actions.downloadFailed, (state, { error }) => ({ ...state, download: 'error' as const, downloadError: error })),
) });
