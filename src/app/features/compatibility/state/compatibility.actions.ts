import { createActionGroup, emptyProps, props } from '@ngrx/store';
import { RegistryFailure } from '../../../shared/domain/registry-error';
import { CompatibilityData, CompatibilitySelection } from '../application/compatibility-view.models';

export const CompatibilityActions = createActionGroup({ source: 'Compatibility', events: {
  Opened: props<{ selection: CompatibilitySelection }>(), Loaded: props<{ data: CompatibilityData }>(), Failed: props<{ error: RegistryFailure }>(), Left: emptyProps(),
} });
