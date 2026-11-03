import { createActionGroup, emptyProps, props } from '@ngrx/store';
import { RegistryFailure } from '../../../shared/domain/registry-error';
import { HistoryData, HistorySelection } from '../application/history-view.models';

export const HistoryActions = createActionGroup({ source: 'History', events: {
  Opened: props<{ selection: HistorySelection }>(), Loaded: props<{ data: HistoryData }>(), Failed: props<{ error: RegistryFailure }>(), Left: emptyProps(),
} });
