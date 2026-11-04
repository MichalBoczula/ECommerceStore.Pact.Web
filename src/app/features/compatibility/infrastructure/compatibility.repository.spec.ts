import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { PACT_FETCH } from '../../../shared/infrastructure/pact-transport';
import { CompatibilityRepository } from '../domain/compatibility.repository';
import { KiotaCompatibilityRepository } from './kiota-compatibility.repository';

const id = '6a3d5b42-60ba-4855-b208-098aa7ba76ef';
const profileId = '47a2c65d-5b64-43cc-b71b-d98492f8ecfa';
const runId = 'f8200a17-f83c-46be-8f2e-427e14e6c665';
const hash = 'ab'.repeat(32); const commit = 'cd'.repeat(20); const date = '2026-11-04T10:00:00.000Z';
const required = { checkId: 'pact-provider', verifierName: 'pact-http', verifierVersion: '1.2.3', configurationSha256: hash };
const profile = { id: profileId, consumerApplicationId: 'payments', providerApplicationId: 'invoice', name: 'release', version: '1', contentSha256: hash, checks: [required], publisherId: 'payments-ci', registeredAt: date };
const check = { required, status: 'Passed', reason: 'Reported', evidenceId: runId, evidenceUrl: `/api/verification-runs/${runId}`, evidencePayloadSha256: hash, reportedStatus: 'Passed', observedVerifier: required, observedPublicationId: id, buildUrl: 'https://ci.example.test/run', publisherId: 'invoice-ci', issueCount: 0 };
const row = { consumerApplicationId: 'payments', consumerCommitSha: commit, providerApplicationId: 'invoice', providerCommitSha: 'ef'.repeat(20), consumerVersionId: id, providerVersionId: profileId, bindingId: id,
  contractSha256: hash, ciRunId: '9223372036854775808', ciAttempt: 2, providerSourceRef: 'refs/heads/feature/a + b', status: 'Passed', checks: [check], missingChecks: [] as string[], unresolvedChecks: [] as string[] };
const decision = { id, policy: 'explicit-ci-execution-v1', profile, status: 'Passed', compatible: true, rows: [row], sourceApplicationId: 'payments', publisherId: 'payments-ci', evaluatedAt: date };
const summary = { ...decision, profileId, profileName: profile.name, profileVersion: profile.version, consumerApplicationId: 'payments', providerApplicationId: 'invoice', rowCount: 1 };
function response(value: unknown, status = 200): Response { return new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } }); }

describe('compatibility reads through the generated Kiota client', () => {
  const fetchMock = vi.fn<typeof fetch>(); let repository: CompatibilityRepository;
  beforeEach(() => {
    fetchMock.mockReset(); TestBed.configureTestingModule({ providers: [{ provide: CompatibilityRepository, useClass: KiotaCompatibilityRepository }, { provide: PACT_FETCH, useValue: fetchMock }] });
    repository = TestBed.inject(CompatibilityRepository);
  });
  it('passes supported same-row filters and opaque cursors as anonymous GETs', async () => {
    fetchMock.mockResolvedValue(response({ items: [{ ...summary, rowCount: '1' }], nextCursor: 'opaque+/=&?' }));
    const filter = { consumerApplicationId: 'payments', providerApplicationId: 'invoice', consumerCommitSha: commit, providerCommitSha: row.providerCommitSha, contractSha256: hash, profileId, status: 'Passed' as const, limit: 12, after: 'opaque+/=&?' };
    const result = await firstValueFrom(repository.decisions(filter)); expect(result.items[0]).toMatchObject({ id, profileId, rowCount: 1, policy: decision.policy }); expect(result.nextCursor).toBe(filter.after);
    const url = new URL(String(fetchMock.mock.calls[0][0])); expect(url.pathname).toBe('/backend/api/compatibility-decisions'); expect(Object.fromEntries(url.searchParams)).toEqual({ ...filter, limit: '12' });
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: 'GET', credentials: 'omit', redirect: 'error' });
  });
  it('preserves exact matrix/profile/configuration/execution identities and nullable observed verifier metadata', async () => {
    fetchMock.mockResolvedValue(response(decision)); const result = await firstValueFrom(repository.decision(id));
    expect(result).toEqual({ ...decision, rows: [{ ...row, checks: [{ ...check, evidenceUrl: undefined }] }] });
    expect(result.rows[0].ciRunId).toBe('9223372036854775808'); expect(result.rows[0].checks[0].observedVerifier).toEqual(required);
    expect(new URL(String(fetchMock.mock.calls[0][0])).pathname).toBe(`/backend/api/compatibility-decisions/${id}`);
  });
  it.each(['Failed', 'Error', 'Unverified'])('retains a reported %s outcome without upgrading compatibility', async status => {
    fetchMock.mockResolvedValue(response({ ...decision, status, compatible: false, rows: [{ ...row, status, checks: [{ ...check, status, reportedStatus: status }], missingChecks: status === 'Unverified' ? [required.checkId] : [], unresolvedChecks: [required.checkId] }] }));
    const result = await firstValueFrom(repository.decision(id)); expect(result.status).toBe(status); expect(result.compatible).toBe(false); expect(result.rows[0].checks[0].reason).toBe('Reported');
  });
  it.each(['ContractNotPublished', 'MissingExecution', 'VerifierMismatch', 'SourceRefMismatch'])('keeps %s inapplicable/missing evidence Unverified', async reason => {
    const observed = reason === 'VerifierMismatch' || reason === 'SourceRefMismatch';
    const selected = { ...check, reason, status: 'Unverified', evidenceId: observed ? runId : null, reportedStatus: observed ? 'Passed' : null, observedVerifier: observed ? { ...required, verifierVersion: reason === 'VerifierMismatch' ? '2.0.0' : required.verifierVersion } : null, evidencePayloadSha256: observed ? hash : null };
    fetchMock.mockResolvedValue(response({ ...decision, status: 'Unverified', compatible: false, rows: [{ ...row, bindingId: reason === 'ContractNotPublished' ? null : row.bindingId, status: 'Unverified', checks: [selected], missingChecks: [required.checkId], unresolvedChecks: [required.checkId] }] }));
    const result = await firstValueFrom(repository.decision(id)); expect(result.rows[0].checks[0]).toMatchObject({ reason, status: 'Unverified', reportedStatus: observed ? 'Passed' : null }); expect(result.compatible).toBe(false);
  });
  it('browses pinned profile name/version filters and reads an exact immutable profile', async () => {
    fetchMock.mockResolvedValueOnce(response({ items: [profile], nextCursor: null })).mockResolvedValueOnce(response(profile));
    const filter = { consumerApplicationId: 'payments', providerApplicationId: 'invoice', name: 'release + extra', version: 'v1/2', limit: 4, after: 'profile+/=&?' };
    expect((await firstValueFrom(repository.profiles(filter))).items).toEqual([profile]);
    expect(Object.fromEntries(new URL(String(fetchMock.mock.calls[0][0])).searchParams)).toEqual({ ...filter, limit: '4' });
    expect(await firstValueFrom(repository.profile(profileId))).toEqual(profile); expect(new URL(String(fetchMock.mock.calls[1][0])).pathname).toBe(`/backend/api/verification-profiles/${profileId}`);
  });
  const invalid: Record<string, unknown>[] = [
    { policy: 'future-policy' }, { compatible: undefined }, { compatible: false }, { status: 'Compatible' }, { rows: [] }, { rows: Array(11).fill(row) }, { rows: [row, row] },
    { profile: { ...profile, checks: [] } }, { profile: { ...profile, checks: [required, required] } }, { rows: [{ ...row, providerApplicationId: 'other' }] },
    { rows: [{ ...row, checks: [] }] }, { rows: [{ ...row, checks: [{ ...check, required: { ...required, configurationSha256: '12'.repeat(32) } }] }] },
    { rows: [{ ...row, bindingId: null }] }, { rows: [{ ...row, ciAttempt: 0 }] }, { rows: [{ ...row, ciAttempt: 10001 }] },
    { rows: [{ ...row, status: 'Failed' }] }, { rows: [{ ...row, checks: [{ ...check, status: 'Error', reportedStatus: 'Error' }], unresolvedChecks: [required.checkId] }] },
    { rows: [{ ...row, checks: [{ ...check, reason: 'FutureReason' }] }] }, { rows: [{ ...row, checks: [{ ...check, reason: 'MissingExecution' }] }] },
    { rows: [{ ...row, checks: [{ ...check, evidenceId: null }] }] }, { rows: [{ ...row, checks: [{ ...check, observedVerifier: null }] }] },
    { rows: [{ ...row, checks: [{ ...check, reportedStatus: 'Failed' }] }] }, { rows: [{ ...row, checks: [{ ...check, issueCount: -1 }] }] },
    { rows: [{ ...row, checks: [{ ...check, issueCount: 101 }] }] }, { rows: [{ ...row, checks: [{ ...check, observedVerifier: { ...required, verifierVersion: '2' } }] }] },
    { rows: [{ ...row, missingChecks: [required.checkId] }] }, { rows: [{ ...row, unresolvedChecks: [required.checkId, required.checkId] }] },
  ];
  it.each(invalid)('rejects malformed, unbounded or unsafe positive snapshot case %#', async change => {
    fetchMock.mockResolvedValue(response({ ...decision, ...change })); await expect(firstValueFrom(repository.decision(id))).rejects.toMatchObject({ kind: 'invalid-response' });
  });
  it('keeps empty pages, bad summaries and unavailable records distinct', async () => {
    fetchMock.mockResolvedValueOnce(response({ items: [], nextCursor: null })).mockResolvedValueOnce(response({ items: [{ ...summary, rowCount: '9007199254740993' }], nextCursor: null })).mockResolvedValueOnce(response({ traceId: 'decision-503', detail: 'secret internal detail' }, 503));
    expect(await firstValueFrom(repository.decisions())).toEqual({ items: [], nextCursor: null }); await expect(firstValueFrom(repository.decisions())).rejects.toMatchObject({ kind: 'invalid-response' });
    await expect(firstValueFrom(repository.decision(id))).rejects.toMatchObject({ kind: 'unavailable', traceId: 'decision-503' });
  });
});
