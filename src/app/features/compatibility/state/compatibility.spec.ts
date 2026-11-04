import { TestBed } from '@angular/core/testing';
import { Actions } from '@ngrx/effects';
import { Action } from '@ngrx/store';
import { firstValueFrom, Observable, of, Subject, throwError } from 'rxjs';
import { RegistryError } from '../../../shared/domain/registry-error';
import { CompatibilityData, CompatibilitySelection } from '../application/compatibility-view.models';
import { compatibilityFilter, loadCompatibility } from '../application/load-compatibility';
import { CompatibilityDecision, VerificationProfile } from '../domain/compatibility.models';
import { CompatibilityRepository } from '../domain/compatibility.repository';
import { CompatibilityActions as Events } from './compatibility.actions';
import { CompatibilityEffects } from './compatibility.effects';
import { compatibilityFeature } from './compatibility.feature';

const id = '6a3d5b42-60ba-4855-b208-098aa7ba76ef'; const other = '47a2c65d-5b64-43cc-b71b-d98492f8ecfa';
const selection: CompatibilitySelection = { kind: 'decisions', id: null, query: {}, ambiguous: false };
const empty: CompatibilityData = { kind: 'decisions', page: { items: [], nextCursor: null } };
describe('explicit compatibility selection and request lifecycle', () => {
  const decisions = vi.fn<CompatibilityRepository['decisions']>(); const decision = vi.fn<CompatibilityRepository['decision']>(); const profiles = vi.fn<CompatibilityRepository['profiles']>(); const profile = vi.fn<CompatibilityRepository['profile']>();
  let repository: CompatibilityRepository; let actions: Subject<Action>;
  beforeEach(() => {
    for (const mock of [decisions, decision, profiles, profile]) mock.mockReset(); repository = { decisions, decision, profiles, profile }; actions = new Subject();
    TestBed.configureTestingModule({ providers: [CompatibilityEffects, { provide: CompatibilityRepository, useValue: repository }, { provide: Actions, useValue: actions }] });
  });
  it('reads stored selections and never elects latest versions or posts an evaluation', async () => {
    decisions.mockReturnValue(of(empty.page)); const query = { consumerCommitSha: 'ab'.repeat(20), providerCommitSha: 'cd'.repeat(20), contractSha256: 'ef'.repeat(32), profileId: id, status: 'Unverified', limit: '7', after: 'opaque+/=&?' };
    expect(await firstValueFrom(loadCompatibility(repository, { ...selection, query }))).toEqual(empty); expect(decisions).toHaveBeenCalledWith({ ...query, limit: 7 }); expect(decision).not.toHaveBeenCalled(); expect(profiles).not.toHaveBeenCalled();
  });
  it('passes exact profile name/version filters without resolving a latest profile', async () => {
    profiles.mockReturnValue(of({ items: [], nextCursor: null })); const query = { name: 'release', version: '1.2.3', providerApplicationId: 'invoice' };
    expect(await firstValueFrom(loadCompatibility(repository, { ...selection, kind: 'profiles', query }))).toEqual({ kind: 'profiles', page: { items: [], nextCursor: null } }); expect(profiles).toHaveBeenCalledWith({ ...query, limit: 25 });
  });
  it('validates returned detail IDs and preserves a stored negative decision', async () => {
    decision.mockReturnValueOnce(of({ id: other } as CompatibilityDecision)).mockReturnValueOnce(of({ id, compatible: false } as CompatibilityDecision));
    await expect(firstValueFrom(loadCompatibility(repository, { ...selection, kind: 'decision', id }))).rejects.toMatchObject({ kind: 'invalid-response' });
    expect(await firstValueFrom(loadCompatibility(repository, { ...selection, kind: 'decision', id }))).toMatchObject({ decision: { compatible: false } });
    profile.mockReturnValueOnce(of({ id: other } as VerificationProfile)).mockReturnValueOnce(of({ id } as VerificationProfile));
    await expect(firstValueFrom(loadCompatibility(repository, { ...selection, kind: 'profile', id }))).rejects.toMatchObject({ kind: 'invalid-response' });
    expect(await firstValueFrom(loadCompatibility(repository, { ...selection, kind: 'profile', id }))).toMatchObject({ profile: { id } });
  });
  const invalid: Record<string, string>[] = [{ limit: '0' }, { limit: '101' }, { limit: '0x10' }, { status: 'Compatible' }, { profileId: 'latest' }, { profileId: '00000000-0000-0000-0000-000000000000' }, { consumerCommitSha: 'ab12345' }, { providerCommitSha: 'main' }, { contractSha256: 'ab' }, { ciRunId: '123' }];
  it.each(invalid)('rejects invalid/unsupported filter %j before a request', async query => {
    await expect(firstValueFrom(loadCompatibility(repository, { ...selection, query }))).rejects.toMatchObject({ kind: 'validation' }); expect(decisions).not.toHaveBeenCalled();
  });
  it('rejects ambiguous fields, missing detail IDs and profile-only filter misuse', async () => {
    await expect(firstValueFrom(loadCompatibility(repository, { ...selection, ambiguous: true }))).rejects.toMatchObject({ kind: 'validation' });
    await expect(firstValueFrom(loadCompatibility(repository, { ...selection, kind: 'decision' }))).rejects.toMatchObject({ kind: 'validation' });
    expect(() => compatibilityFilter({ profileId: id }, true)).toThrow(RegistryError); expect(decisions).not.toHaveBeenCalled();
  });
  it('cancels replaced and left-page requests so stale decisions cannot appear', () => {
    const pending: Subject<typeof empty.page>[] = []; const stopped = vi.fn();
    decisions.mockImplementation(() => new Observable(observer => { const subject = new Subject<typeof empty.page>(); pending.push(subject); const sub = subject.subscribe(observer); return () => { stopped(); sub.unsubscribe(); }; }));
    const emitted: Action[] = []; const subscription = TestBed.inject(CompatibilityEffects).load.subscribe(v => emitted.push(v));
    actions.next(Events.opened({ selection })); actions.next(Events.opened({ selection: { ...selection, query: { status: 'Failed' } } }));
    expect(stopped).toHaveBeenCalledTimes(1); pending[0].next(empty.page); expect(emitted).toEqual([]); pending[1].next(empty.page); expect(emitted).toEqual([Events.loaded({ data: empty })]);
    actions.next(Events.left()); expect(stopped).toHaveBeenCalledTimes(2); subscription.unsubscribe();
  });
  it('keeps safe trace errors serializable and permits retry', () => {
    decisions.mockReturnValueOnce(throwError(() => new RegistryError('unavailable', 'The registry is currently unavailable.', 503, 'trace-decision'))).mockReturnValueOnce(of(empty.page));
    const emitted: Action[] = []; const subscription = TestBed.inject(CompatibilityEffects).load.subscribe(v => emitted.push(v)); actions.next(Events.opened({ selection })); actions.next(Events.opened({ selection }));
    expect(emitted[0]).toMatchObject({ error: { kind: 'unavailable', traceId: 'trace-decision' } }); expect(JSON.parse(JSON.stringify(emitted[0]))).toEqual(emitted[0]); expect(emitted[1]).toEqual(Events.loaded({ data: empty })); subscription.unsubscribe();
  });
  it('clears previous positive results while loading and after failure or navigation', () => {
    let state = compatibilityFeature.reducer(undefined, Events.loaded({ data: { kind: 'decision', decision: { id, compatible: true } as CompatibilityDecision } }));
    state = compatibilityFeature.reducer(state, Events.opened({ selection })); expect(state).toMatchObject({ status: 'loading', data: null, error: null });
    state = compatibilityFeature.reducer(state, Events.failed({ error: { kind: 'network', message: 'Unavailable.', traceId: null, validation: {} } })); expect(state.data).toBeNull(); expect(compatibilityFeature.reducer(state, Events.left()).selection).toBeNull();
  });
});
