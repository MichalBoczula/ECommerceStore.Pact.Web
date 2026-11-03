import { TestBed } from '@angular/core/testing';
import { Actions } from '@ngrx/effects';
import { Action } from '@ngrx/store';
import { firstValueFrom, Observable, of, Subject, throwError } from 'rxjs';
import { ArtifactDownloads } from '../../../shared/domain/artifact-downloads';
import { RegistryError } from '../../../shared/domain/registry-error';
import { RegistryRepository } from '../../registry/domain/registry.repository';
import { ApplicationVersion, PublicationDetail } from '../../registry/domain/registry.models';
import { evidenceFilter, loadRunSources, loadVerifications } from '../application/load-verifications';
import { publicationEvidence } from '../application/evidence-links';
import { VerificationData, VerificationSelection } from '../application/verification-view.models';
import { VerificationRepository } from '../domain/verification.repository';
import { VerificationRun } from '../domain/verification.models';
import { VerificationActions as Events } from './verification.actions';
import { VerificationEffects } from './verification.effects';
import { verificationFeature } from './verification.feature';

const consumerCommit = 'ab'.repeat(20);
const providerCommit = 'cd'.repeat(20);
const hash = 'ef'.repeat(32);
const timestamp = '2026-11-03T10:30:00.000Z';
const run: VerificationRun = {
  id: 'f8200a17-f83c-46be-8f2e-427e14e6c665', consumerPublicationId: 'publication-id', bindingId: 'binding-id', consumerVersionId: 'consumer-version', providerVersionId: 'provider-version',
  consumerApplicationId: 'payments', consumerCommitSha: consumerCommit, providerApplicationId: 'invoice', providerCommitSha: providerCommit,
  contractSha256: hash, status: 'Failed', summary: 'The response differs.', ciRunId: '9223372036854775808', ciAttempt: 2, ciCheckId: 'pact-provider',
  verifierName: 'pact-http', verifierVersion: '1.2.3', configurationSha256: hash, sourceRef: 'refs/heads/provider + fix', buildUrl: 'https://ci.example.test/run', publisherId: 'ci',
  startedAt: timestamp, finishedAt: timestamp, recordedAt: timestamp, expectedInteractions: 2, verifiedInteractions: 1, failedInteractions: 1,
  issues: [{ kind: 'Mismatch', code: 'MissingField', message: 'A field is missing.', interaction: 'read invoice', method: 'GET', path: '/invoices', jsonPath: '$.amount',
    expected: { present: true, json: '"decimal"' }, actual: { present: false }, actualPresent: false, evidenceUrl: null }], evidenceUrls: [],
};
const version: ApplicationVersion = { id: run.consumerVersionId, applicationId: 'payments', commitSha: consumerCommit, repositoryUrl: 'https://github.com/example/payments', imageDigest: null, registeredAt: timestamp };
const provider: ApplicationVersion = { ...version, id: run.providerVersionId, applicationId: 'invoice', commitSha: providerCommit };
const history: VerificationData = { kind: 'history', page: { items: [], nextCursor: null } };
const selection: VerificationSelection = { id: null, query: {}, ambiguous: false };

describe('explicit verification selection', () => {
  it('preserves every evidence identity and opaque cursor, including CI IDs beyond safe integers', () => {
    const query = { applicationId: 'payments', consumerApplicationId: 'payments', providerApplicationId: 'invoice', consumerCommitSha: consumerCommit, providerCommitSha: providerCommit,
      contractSha256: hash, sourceRef: run.sourceRef, status: 'Failed', issueCode: 'Mismatch', jsonPath: '$.invoice[0].amount', ciRunId: run.ciRunId, ciAttempt: '2', ciCheckId: run.ciCheckId,
      verifierName: run.verifierName, verifierVersion: run.verifierVersion, configurationSha256: hash, limit: '12', after: 'opaque+/=&?' };
    expect(evidenceFilter(query)).toEqual({ ...query, ciAttempt: 2, limit: 12 });
  });
  it.each(['Passed', 'Failed', 'Error', 'Unverified'])('retains the explicit %s filter', status => { expect(evidenceFilter({ status }).status).toBe(status); });
  const invalid: Record<string, string>[] = [{ status: 'Unknown' }, { provider: 'invoice' }, { limit: '0' }, { limit: '101' }, { limit: '0x10' }, { ciAttempt: '1.5' }, { ciAttempt: '9007199254740993' }];
  it.each(invalid)('rejects unsupported or invalid selection %j', query => {
    expect(() => evidenceFilter(query)).toThrow(RegistryError);
  });
  it('loads only the exact report ID; history query parameters never select another run', async () => {
    const repository = { run: vi.fn(() => of(run)), runs: vi.fn() };
    expect(await firstValueFrom(loadVerifications(repository, { ...selection, id: run.id.toUpperCase(), query: { status: 'Passed' } }))).toEqual({ kind: 'run', run });
    expect(repository.run).toHaveBeenCalledWith(run.id.toUpperCase()); expect(repository.runs).not.toHaveBeenCalled();
    repository.run.mockReturnValue(of({ ...run, id: 'different' }));
    await expect(firstValueFrom(loadVerifications(repository, { ...selection, id: run.id }))).rejects.toMatchObject({ kind: 'invalid-response' });
  });
  it('rejects repeated URL filters without issuing a request', async () => {
    const repository = { run: vi.fn(), runs: vi.fn() };
    await expect(firstValueFrom(loadVerifications(repository, { ...selection, ambiguous: true }))).rejects.toMatchObject({ kind: 'validation' });
    expect(repository.runs).not.toHaveBeenCalled();
  });
  it('uses a consumer Pact hash for consumer publications and exact provider commits for provider schemas', () => {
    const publication: PublicationDetail = { id: 'id', bindingId: 'binding', artifactSha256: hash, kind: 'ConsumerPact', sourceApplicationId: 'payments', commitSha: consumerCommit,
      consumerApplicationId: 'payments', providerApplicationId: 'invoice', sourceRef: 'refs/heads/main', buildUrl: 'https://ci.example.test/run', publisherId: 'ci', publishedAt: timestamp, specificationVersion: '3' };
    expect(publicationEvidence(publication)).toEqual({ consumerApplicationId: 'payments', consumerCommitSha: consumerCommit, providerApplicationId: 'invoice', contractSha256: hash });
    expect(publicationEvidence({ ...publication, kind: 'ProviderOpenApi', consumerApplicationId: null, sourceApplicationId: 'invoice', commitSha: providerCommit })).toEqual({ providerApplicationId: 'invoice', providerCommitSha: providerCommit });
    expect(publicationEvidence({ ...publication, kind: 'FutureKind' })).toBeNull();
  });
});

describe('verification effects and secondary provenance', () => {
  const runs = vi.fn<VerificationRepository['runs']>();
  const getRun = vi.fn<VerificationRepository['run']>();
  const getVersion = vi.fn<RegistryRepository['version']>();
  const content = vi.fn<RegistryRepository['artifactContent']>();
  const save = vi.fn();
  let actions: Subject<Action>;
  let registry: RegistryRepository;
  beforeEach(() => {
    runs.mockReset(); getRun.mockReset(); getVersion.mockReset(); content.mockReset(); save.mockReset(); actions = new Subject();
    registry = { version: getVersion, artifactContent: content } as unknown as RegistryRepository;
    TestBed.configureTestingModule({ providers: [VerificationEffects, { provide: VerificationRepository, useValue: { runs, run: getRun } },
      { provide: RegistryRepository, useValue: registry }, { provide: Actions, useValue: actions }, { provide: ArtifactDownloads, useValue: { save } }] });
  });
  it('cancels old reads on filter changes and when leaving, preventing late records from replacing the current page', () => {
    const pending: Subject<{ items: []; nextCursor: null }>[] = [];
    const stopped = vi.fn();
    runs.mockImplementation(() => new Observable(observer => {
      const subject = new Subject<{ items: []; nextCursor: null }>(); pending.push(subject); const subscription = subject.subscribe(observer);
      return () => { subscription.unsubscribe(); stopped(); };
    }));
    const emitted: Action[] = []; const subscription = TestBed.inject(VerificationEffects).load.subscribe(value => emitted.push(value));
    actions.next(Events.opened({ selection })); actions.next(Events.opened({ selection: { ...selection, query: { status: 'Error' } } }));
    expect(stopped).toHaveBeenCalledTimes(1); pending[0].next({ items: [], nextCursor: null }); expect(emitted).toEqual([]);
    pending[1].next({ items: [], nextCursor: null }); expect(emitted).toEqual([Events.loaded({ data: history })]);
    actions.next(Events.left()); expect(stopped).toHaveBeenCalledTimes(2); subscription.unsubscribe();
  });
  it('retains safe errors and remains alive for retry', () => {
    runs.mockReturnValueOnce(throwError(() => new RegistryError('unavailable', 'The registry is currently unavailable.', 503, 'trace-1'))).mockReturnValueOnce(of({ items: [], nextCursor: null }));
    const emitted: Action[] = []; const subscription = TestBed.inject(VerificationEffects).load.subscribe(value => emitted.push(value));
    actions.next(Events.opened({ selection })); actions.next(Events.opened({ selection }));
    expect(emitted).toEqual([Events.failed({ error: { kind: 'unavailable', message: 'The registry is currently unavailable.', traceId: 'trace-1', validation: {} } }), Events.loaded({ data: history })]);
    expect(JSON.parse(JSON.stringify(emitted[0]))).toEqual(emitted[0]); subscription.unsubscribe();
  });
  it('validates supplementary version identity and tolerates missing repository links without changing report evidence', async () => {
    getVersion.mockImplementation((application) => application === 'payments' ? of(version) : of({ ...provider, id: 'wrong-version' }));
    const result = await firstValueFrom(loadRunSources(registry, run));
    expect(result.consumer.version).toEqual(version); expect(result.provider.version).toBeNull(); expect(result.provider.error?.kind).toBe('invalid-response');
    getVersion.mockReturnValue(throwError(() => new RegistryError('unavailable', 'The registry is currently unavailable.')));
    expect((await firstValueFrom(loadRunSources(registry, run))).consumer.error?.kind).toBe('unavailable'); expect(run.status).toBe('Failed');
  });
  it('cancels supplementary metadata on a new selection', () => {
    const pending = new Subject<ApplicationVersion>(); getVersion.mockReturnValue(pending);
    const emitted: Action[] = []; const subscription = TestBed.inject(VerificationEffects).sources.subscribe(value => emitted.push(value));
    actions.next(Events.loaded({ data: { kind: 'run', run } })); expect(getVersion).toHaveBeenCalledTimes(2);
    actions.next(Events.opened({ selection })); pending.next(version); pending.complete(); expect(emitted).toEqual([]); subscription.unsubscribe();
  });
  it('saves unchanged bytes, suppresses duplicate downloads, and cancels a pending download on navigation', () => {
    const pending = new Subject<ArrayBuffer>(); content.mockReturnValue(pending);
    const emitted: Action[] = []; const subscription = TestBed.inject(VerificationEffects).download.subscribe(value => emitted.push(value));
    actions.next(Events.downloadRequested({ sha256: hash })); actions.next(Events.downloadRequested({ sha256: hash })); expect(content).toHaveBeenCalledTimes(1);
    const bytes = new Uint8Array([0, 255, 12]).buffer; pending.next(bytes); pending.complete(); expect(save).toHaveBeenCalledExactlyOnceWith(bytes, hash); expect(emitted).toEqual([Events.downloadStarted()]);
    const stale = new Subject<ArrayBuffer>(); content.mockReturnValue(stale); actions.next(Events.downloadRequested({ sha256: hash })); actions.next(Events.left()); stale.next(bytes);
    expect(save).toHaveBeenCalledTimes(1); subscription.unsubscribe();
  });
  it('shows download failures without claiming a download started', () => {
    content.mockReturnValue(throwError(() => new RegistryError('network', 'The registry could not be reached.')));
    const emitted: Action[] = []; const subscription = TestBed.inject(VerificationEffects).download.subscribe(value => emitted.push(value));
    actions.next(Events.downloadRequested({ sha256: hash })); expect(emitted).toEqual([Events.downloadFailed({ error: { kind: 'network', message: 'The registry could not be reached.', traceId: null, validation: {} } })]);
    expect(save).not.toHaveBeenCalled(); subscription.unsubscribe();
  });
  it('clears old run data, source links and notifications for a new URL selection', () => {
    let state = verificationFeature.reducer(undefined, Events.opened({ selection: { ...selection, id: run.id } }));
    state = verificationFeature.reducer(state, Events.loaded({ data: { kind: 'run', run } }));
    state = verificationFeature.reducer(state, Events.sourcesLoaded({ sources: { consumer: { version, error: null }, provider: { version: provider, error: null } } }));
    state = verificationFeature.reducer(state, Events.downloadStarted()); state = verificationFeature.reducer(state, Events.opened({ selection }));
    expect(state).toMatchObject({ status: 'loading', data: null, sources: null, download: 'idle', error: null, downloadError: null });
    expect(verificationFeature.reducer(state, Events.left()).selection).toBeNull();
  });
});
