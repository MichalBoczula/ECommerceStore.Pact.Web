import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, map, of, switchMap, takeUntil } from 'rxjs';
import { registryFailure } from '../../../shared/domain/registry-error';
import { loadCompatibility } from '../application/load-compatibility';
import { CompatibilityRepository } from '../domain/compatibility.repository';
import { CompatibilityActions as Events } from './compatibility.actions';

@Injectable()
export class CompatibilityEffects {
  private readonly actions = inject(Actions);
  private readonly repository = inject(CompatibilityRepository);
  readonly load = createEffect(() => this.actions.pipe(ofType(Events.opened), switchMap(({ selection }) =>
    loadCompatibility(this.repository, selection).pipe(map(data => Events.loaded({ data })), catchError((error: unknown) => of(Events.failed({ error: registryFailure(error) }))),
      takeUntil(this.actions.pipe(ofType(Events.left)))))));
}
