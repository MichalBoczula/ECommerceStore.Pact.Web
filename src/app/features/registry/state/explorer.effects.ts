import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, defer, exhaustMap, map, of, switchMap, takeUntil, tap } from 'rxjs';
import { RegistryRepository } from '../domain/registry.repository';
import { ArtifactDownloads } from '../application/explorer.models';
import { failure, loadExplorer } from '../application/load-explorer';
import { ExplorerActions as Events } from './explorer.actions';

@Injectable()
export class ExplorerEffects {
  private readonly actions = inject(Actions);
  private readonly repository = inject(RegistryRepository);
  private readonly downloads = inject(ArtifactDownloads);

  readonly load = createEffect(() => this.actions.pipe(ofType(Events.opened), switchMap(({ selection }) =>
    loadExplorer(this.repository, selection).pipe(
      map(data => Events.loaded({ data })),
      catchError((error: unknown) => of(Events.failed({ error: failure(error) }))),
      takeUntil(this.actions.pipe(ofType(Events.left))),
    ))));

  readonly download = createEffect(() => this.actions.pipe(ofType(Events.downloadRequested), exhaustMap(({ sha256 }) =>
    defer(() => this.repository.artifactContent(sha256)).pipe(
      tap(bytes => this.downloads.save(bytes, sha256)),
      map(() => Events.downloadSaved()),
      catchError((error: unknown) => of(Events.downloadFailed({ error: failure(error) }))),
      takeUntil(this.actions.pipe(ofType(Events.opened, Events.left))),
    ))));
}
