import { createActionGroup, emptyProps, props } from '@ngrx/store';
import { ExplorerData, ExplorerFailure, ExplorerSelection } from '../application/explorer.models';

export const ExplorerActions = createActionGroup({ source: 'Registry explorer', events: {
  Opened: props<{ selection: ExplorerSelection }>(),
  Loaded: props<{ data: ExplorerData }>(),
  Failed: props<{ error: ExplorerFailure }>(),
  Left: emptyProps(),
  'Download requested': props<{ sha256: string }>(),
  'Download saved': emptyProps(),
  'Download failed': props<{ error: ExplorerFailure }>(),
} });
