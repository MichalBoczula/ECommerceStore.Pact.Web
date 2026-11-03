import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, defer, exhaustMap, filter, map, of, switchMap, takeUntil, tap } from 'rxjs';
import { ArtifactDownloads } from '../../../shared/domain/artifact-downloads';
import { registryFailure } from '../../../shared/domain/registry-error';
import { RegistryRepository } from '../../registry/domain/registry.repository';
import { loadRunSources, loadVerifications } from '../application/load-verifications';
import { VerificationRepository } from '../domain/verification.repository';
import { VerificationActions as Events } from './verification.actions';

@Injectable()
export class VerificationEffects {
  private readonly actions = inject(Actions);
  private readonly reports = inject(VerificationRepository);
  private readonly registry = inject(RegistryRepository);
  private readonly downloads = inject(ArtifactDownloads);
  private readonly changed = this.actions.pipe(ofType(Events.opened, Events.left));

  readonly load = createEffect(() => this.actions.pipe(ofType(Events.opened), switchMap(({ selection }) =>
    loadVerifications(this.reports, selection).pipe(map(data => Events.loaded({ data })),
      catchError((error: unknown) => of(Events.failed({ error: registryFailure(error) }))), takeUntil(this.actions.pipe(ofType(Events.left)))))));

  readonly sources = createEffect(() => this.actions.pipe(ofType(Events.loaded), filter(({ data }) => data.kind === 'run'), switchMap(({ data }) =>
    data.kind === 'run' ? loadRunSources(this.registry, data.run).pipe(map(sources => Events.sourcesLoaded({ sources })), takeUntil(this.changed)) : of())));

  readonly download = createEffect(() => this.actions.pipe(ofType(Events.downloadRequested), exhaustMap(({ sha256 }) =>
    defer(() => this.registry.artifactContent(sha256)).pipe(tap(bytes => this.downloads.save(bytes, sha256)), map(() => Events.downloadStarted()),
      catchError((error: unknown) => of(Events.downloadFailed({ error: registryFailure(error) }))), takeUntil(this.changed)))));
}
