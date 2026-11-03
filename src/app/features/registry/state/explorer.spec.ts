import { TestBed } from '@angular/core/testing';
import { Actions } from '@ngrx/effects';
import { firstValueFrom, Observable, of, Subject, throwError } from 'rxjs';
import { ArtifactDownloads } from '../../../shared/domain/artifact-downloads';
import { RegistryError } from '../../../shared/domain/registry-error';
import { ExplorerData, ExplorerSelection } from '../application/explorer.models';
import { loadExplorer } from '../application/load-explorer';
import { RegistryRepository } from '../domain/registry.repository';
import { ApplicationVersion, ContractArtifact, PublicationDetail } from '../domain/registry.models';
import { ExplorerEffects } from './explorer.effects';
import { ExplorerActions as Events } from './explorer.actions';
import { explorerFeature } from './explorer.feature';
import { commitUrl, webUrl } from '../../../shared/presentation/record-fields';

class TestRegistry extends RegistryRepository {
  override applications = vi.fn<RegistryRepository['applications']>();
  override versions = vi.fn<RegistryRepository['versions']>();
  override version = vi.fn<RegistryRepository['version']>();
  override integrations = vi.fn<RegistryRepository['integrations']>();
  override integration = vi.fn<RegistryRepository['integration']>();
  override publications = vi.fn<RegistryRepository['publications']>();
  override publication = vi.fn<RegistryRepository['publication']>();
  override artifact = vi.fn<RegistryRepository['artifact']>();
  override artifactContent = vi.fn<RegistryRepository['artifactContent']>();
}
const commit = 'ab'.repeat(20);
const hash = 'cd'.repeat(32);
const date = '2026-11-03T10:30:00.000Z';
const version: ApplicationVersion = { id: 'version-id', applicationId: 'payments', commitSha: commit, repositoryUrl: 'https://github.com/example/payments', imageDigest: null, registeredAt: date };
const publication: PublicationDetail = { id: 'publication-id', bindingId: 'binding-id', artifactSha256: hash, kind: 'ConsumerPact', specificationVersion: '3', sourceApplicationId: 'payments', commitSha: commit, consumerApplicationId: 'payments', providerApplicationId: 'invoice', sourceRef: 'refs/heads/main', buildUrl: 'https://ci.example.test/run/1', publisherId: 'ci', publishedAt: date };
const artifact: ContractArtifact = { sha256: hash, kind: 'ConsumerPact', specificationVersion: '3', length: 10, storedAt: date };
const selection: ExplorerSelection = { kind: 'applications', params: {}, query: {} };
const empty: ExplorerData = { kind: 'applications', page: { items: [], nextCursor: null } };

describe('registry use cases and effect lifecycle', () => {
  let repository: TestRegistry;
  let actions: Subject<ReturnType<typeof Events.opened> | ReturnType<typeof Events.left> | ReturnType<typeof Events.downloadRequested>>;
  const save = vi.fn();
  beforeEach(() => {
    repository = new TestRegistry(); actions = new Subject(); save.mockReset();
    TestBed.configureTestingModule({ providers: [ExplorerEffects, { provide: RegistryRepository, useValue: repository }, { provide: Actions, useValue: actions }, { provide: ArtifactDownloads, useValue: { save } }] });
  });

  it('passes exact URL filters and opaque cursors without selecting a latest version', async () => {
    repository.publications.mockReturnValue(of({ items: [], nextCursor: 'opaque+/=' }));
    const query = { sourceApplicationId: 'payments', commitSha: commit, kind: 'ConsumerPact', consumerApplicationId: 'payments', providerApplicationId: 'invoice', sourceRef: 'refs/heads/a + b', contractSha256: hash, limit: '12', after: 'opaque+/=' };
    expect(await firstValueFrom(loadExplorer(repository, { kind: 'publications', params: {}, query }))).toEqual({ kind: 'publications', page: { items: [], nextCursor: 'opaque+/=' } });
    expect(repository.publications).toHaveBeenCalledWith({ ...query, limit: 12 });
  });

  it('loads exact publication, artifact and source version provenance', async () => {
    repository.publication.mockReturnValue(of(publication)); repository.artifact.mockReturnValue(of(artifact)); repository.version.mockReturnValue(of(version));
    expect(await firstValueFrom(loadExplorer(repository, { kind: 'publication', params: { id: publication.id }, query: {} }))).toEqual({ kind: 'publication', publication, artifact, version });
    expect(repository.version).toHaveBeenCalledWith('payments', commit);
    expect(repository.artifact).toHaveBeenCalledWith(hash);
  });

  it('rejects mismatched artifact and source records rather than presenting false provenance', async () => {
    repository.publication.mockReturnValue(of(publication)); repository.artifact.mockReturnValue(of({ ...artifact, sha256: 'other' })); repository.version.mockReturnValue(of(version));
    await expect(firstValueFrom(loadExplorer(repository, { kind: 'publication', params: { id: publication.id }, query: {} }))).rejects.toMatchObject({ kind: 'invalid-response' });
    repository.artifact.mockReturnValue(of(artifact)); repository.version.mockReturnValue(of({ ...version, commitSha: 'other' }));
    await expect(firstValueFrom(loadExplorer(repository, { kind: 'publication', params: { id: publication.id }, query: {} }))).rejects.toMatchObject({ kind: 'invalid-response' });
  });

  it.each(['0', '101', '1.5', 'abc', '0x10', '1e2'])('rejects invalid URL page size %s before requesting', async limit => {
    await expect(firstValueFrom(loadExplorer(repository, { ...selection, query: { limit } }))).rejects.toMatchObject({ kind: 'validation' });
    expect(repository.applications).not.toHaveBeenCalled();
  });
  it('rejects duplicate URL filters', async () => {
    await expect(firstValueFrom(loadExplorer(repository, { ...selection, ambiguous: true }))).rejects.toMatchObject({ kind: 'validation' });
  });

  it('cancels the previous selection, keeps the latest response and cancels on leaving', () => {
    const pending: Subject<{ items: []; nextCursor: null }>[] = [];
    const unsubscribed = vi.fn();
    repository.applications.mockImplementation(() => new Observable(observer => {
      const response = new Subject<{ items: []; nextCursor: null }>(); pending.push(response);
      const subscription = response.subscribe(observer);
      return () => { subscription.unsubscribe(); unsubscribed(); };
    }));
    const emitted: unknown[] = [];
    const subscription = TestBed.inject(ExplorerEffects).load.subscribe(value => emitted.push(value));
    actions.next(Events.opened({ selection }));
    actions.next(Events.opened({ selection: { ...selection, query: { search: 'new' } } }));
    expect(unsubscribed).toHaveBeenCalledTimes(1);
    pending[0].next({ items: [], nextCursor: null }); expect(emitted).toEqual([]);
    pending[1].next({ items: [], nextCursor: null }); expect(emitted).toEqual([Events.loaded({ data: empty })]);
    actions.next(Events.left()); expect(unsubscribed).toHaveBeenCalledTimes(2);
    subscription.unsubscribe();
  });

  it('maps errors to serializable state and stays alive for retry', () => {
    repository.applications.mockReturnValueOnce(throwError(() => new RegistryError('unavailable', 'The registry is currently unavailable.', 503, 'trace-1'))).mockReturnValueOnce(of({ items: [], nextCursor: null }));
    const emitted: ReturnType<typeof Events.failed | typeof Events.loaded>[] = [];
    const subscription = TestBed.inject(ExplorerEffects).load.subscribe(value => emitted.push(value));
    actions.next(Events.opened({ selection })); actions.next(Events.opened({ selection }));
    expect(emitted[0]).toEqual(Events.failed({ error: { kind: 'unavailable', message: 'The registry is currently unavailable.', traceId: 'trace-1', validation: {} } }));
    expect(JSON.parse(JSON.stringify(emitted[0]))).toEqual(emitted[0]);
    expect(emitted[1]).toEqual(Events.loaded({ data: empty })); subscription.unsubscribe();
  });

  it('saves original download bytes once, suppresses duplicate clicks and cancels on a new selection', () => {
    const pending = new Subject<ArrayBuffer>(); repository.artifactContent.mockReturnValue(pending);
    const emitted: unknown[] = [];
    const subscription = TestBed.inject(ExplorerEffects).download.subscribe(value => emitted.push(value));
    actions.next(Events.downloadRequested({ sha256: hash })); actions.next(Events.downloadRequested({ sha256: hash }));
    expect(repository.artifactContent).toHaveBeenCalledTimes(1);
    const bytes = new Uint8Array([0, 255, 12]).buffer; pending.next(bytes); pending.complete();
    expect(save).toHaveBeenCalledExactlyOnceWith(bytes, hash); expect(emitted).toEqual([Events.downloadSaved()]);
    const stale = new Subject<ArrayBuffer>(); repository.artifactContent.mockReturnValue(stale);
    actions.next(Events.downloadRequested({ sha256: hash })); actions.next(Events.opened({ selection })); stale.next(bytes);
    expect(save).toHaveBeenCalledTimes(1); subscription.unsubscribe();
  });

  it('reports a failed download without silently claiming success', () => {
    repository.artifactContent.mockReturnValue(throwError(() => new RegistryError('network', 'The registry could not be reached.')));
    const emitted: unknown[] = [];
    const subscription = TestBed.inject(ExplorerEffects).download.subscribe(value => emitted.push(value));
    actions.next(Events.downloadRequested({ sha256: hash }));
    expect(emitted).toEqual([Events.downloadFailed({ error: { kind: 'network', message: 'The registry could not be reached.', traceId: null, validation: {} } })]);
    expect(save).not.toHaveBeenCalled(); subscription.unsubscribe();
  });

  it('clears stale records, errors and download notifications when navigating', () => {
    let state = explorerFeature.reducer(undefined, Events.opened({ selection }));
    state = explorerFeature.reducer(state, Events.loaded({ data: empty }));
    state = explorerFeature.reducer(state, Events.downloadSaved());
    state = explorerFeature.reducer(state, Events.opened({ selection: { ...selection, query: { search: 'new' } } }));
    expect(state).toMatchObject({ status: 'loading', data: null, error: null, download: 'idle', downloadError: null });
    state = explorerFeature.reducer(state, Events.left()); expect(state.status).toBe('idle'); expect(state.selection).toBeNull();
  });
});

describe('external provenance links', () => {
  it.each(['javascript:alert(1)', 'data:text/html,<script>alert(1)</script>', 'file:///tmp/file', 'https://user:password@example.test/repo', 'not a URL'])('renders unsafe URL %s only as text', value => { expect(webUrl(value)).toBeNull(); });
  it('builds exact GitHub commit links and does not invent links for other repository hosts', () => {
    expect(commitUrl('https://github.com/example/payments.git', commit)).toBe(`https://github.com/example/payments/commit/${commit}`);
    expect(commitUrl('https://git.example.test/payments', commit)).toBeNull();
    expect(commitUrl('https://github.com/example/payments', 'bad')).toBeNull();
  });
});
