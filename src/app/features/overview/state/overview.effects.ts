import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, map, of, switchMap, takeUntil } from 'rxjs';
import { registryFailure } from '../../../shared/domain/registry-error';
import { VerificationRepository } from '../../verifications/domain/verification.repository';
import { loadOverview } from '../application/load-overview';
import { OverviewRepository } from '../domain/overview.repository';
import { OverviewActions as Events } from './overview.actions';

@Injectable()
export class OverviewEffects {
  private readonly actions = inject(Actions);
  private readonly repository = inject(OverviewRepository);
  private readonly verifications = inject(VerificationRepository);
  readonly load = createEffect(() => this.actions.pipe(ofType(Events.opened), switchMap(({ selection }) =>
    loadOverview(this.repository, this.verifications, selection).pipe(map(data => Events.loaded({ data })), catchError((error: unknown) => of(Events.failed({ error: registryFailure(error) }))),
      takeUntil(this.actions.pipe(ofType(Events.left)))))));
}
