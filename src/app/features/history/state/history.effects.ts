import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, map, of, switchMap, takeUntil } from 'rxjs';
import { registryFailure } from '../../../shared/domain/registry-error';
import { loadHistory } from '../application/load-history';
import { HistoryRepository } from '../domain/history.repository';
import { HistoryActions as Events } from './history.actions';

@Injectable()
export class HistoryEffects {
  private readonly actions = inject(Actions);
  private readonly repository = inject(HistoryRepository);
  readonly load = createEffect(() => this.actions.pipe(ofType(Events.opened), switchMap(({ selection }) =>
    loadHistory(this.repository, selection).pipe(map(data => Events.loaded({ data })), catchError((error: unknown) => of(Events.failed({ error: registryFailure(error) }))),
      takeUntil(this.actions.pipe(ofType(Events.left)))))));
}
