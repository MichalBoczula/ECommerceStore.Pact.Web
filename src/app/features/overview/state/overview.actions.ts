import { createActionGroup, emptyProps, props } from '@ngrx/store';
import { RegistryFailure } from '../../../shared/domain/registry-error';
import { OverviewData, OverviewSelection } from '../application/overview-view.models';

export const OverviewActions = createActionGroup({ source: 'Overview', events: {
  Opened: props<{ selection: OverviewSelection }>(), Loaded: props<{ data: OverviewData }>(), Failed: props<{ error: RegistryFailure }>(), Left: emptyProps(),
} });
