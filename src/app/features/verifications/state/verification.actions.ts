import { createActionGroup, emptyProps, props } from '@ngrx/store';
import { RegistryFailure } from '../../../shared/domain/registry-error';
import { RunSources, VerificationData, VerificationSelection } from '../application/verification-view.models';

export const VerificationActions = createActionGroup({ source: 'Verification evidence', events: {
  Opened: props<{ selection: VerificationSelection }>(), Loaded: props<{ data: VerificationData }>(),
  Failed: props<{ error: RegistryFailure }>(), Left: emptyProps(), 'Sources loaded': props<{ sources: RunSources }>(),
  'Download requested': props<{ sha256: string }>(), 'Download started': emptyProps(), 'Download failed': props<{ error: RegistryFailure }>(),
} });
