import { defer, map, Observable } from 'rxjs';
import { RegistryError } from '../../../shared/domain/registry-error';
import { DecisionFilter, ProfileFilter } from '../domain/compatibility.models';
import { CompatibilityRepository } from '../domain/compatibility.repository';
import { CompatibilityData, CompatibilitySelection } from './compatibility-view.models';

const decisionFields = ['consumerApplicationId', 'providerApplicationId', 'consumerCommitSha', 'providerCommitSha', 'contractSha256', 'profileId', 'status', 'limit', 'after'];
const profileFields = ['consumerApplicationId', 'providerApplicationId', 'name', 'version', 'limit', 'after'];
const uuid = /^(?!00000000-0000-0000-0000-000000000000$)[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function compatibilityFilter(query: Readonly<Record<string, string>>, profiles = false): DecisionFilter & ProfileFilter {
  const allowed = profiles ? profileFields : decisionFields;
  if (Object.keys(query).some(key => !allowed.includes(key))) throw new RegistryError('validation', 'Unsupported compatibility filter.');
  const limit = query['limit'] === undefined ? 25 : Number(query['limit']);
  if ((query['limit'] !== undefined && !/^\d+$/.test(query['limit'])) || !Number.isInteger(limit) || limit < 1 || limit > 100) throw new RegistryError('validation', 'Page size must be an integer from 1 to 100.');
  if (query['status'] !== undefined && !['Passed', 'Failed', 'Error', 'Unverified'].includes(query['status'])) throw new RegistryError('validation', 'Choose Passed, Failed, Error or Unverified.');
  if (query['profileId'] !== undefined && !uuid.test(query['profileId'])) throw new RegistryError('validation', 'Choose a nonempty verification profile UUID.');
  for (const key of ['consumerCommitSha', 'providerCommitSha', 'contractSha256']) if (query[key] !== undefined && !(key === 'contractSha256' ? /^[a-f0-9]{64}$/i : /^[a-f0-9]{40}$/i).test(query[key])) throw new RegistryError('validation', 'Use full commit SHAs and contract SHA256 hashes.');
  return { ...query, limit } as DecisionFilter & ProfileFilter;
}
export function loadCompatibility(repository: CompatibilityRepository, selection: CompatibilitySelection): Observable<CompatibilityData> {
  return defer(() => {
    if (selection.ambiguous) throw new RegistryError('validation', 'Use one value for each URL filter.');
    const filter = compatibilityFilter(selection.query, selection.kind === 'profiles' || selection.kind === 'profile');
    if (selection.kind === 'decisions') return repository.decisions(filter).pipe(map(page => ({ kind: 'decisions' as const, page })));
    if (selection.kind === 'profiles') return repository.profiles(filter).pipe(map(page => ({ kind: 'profiles' as const, page })));
    if (!selection.id || !uuid.test(selection.id)) throw new RegistryError('validation', 'Choose a nonempty stored record UUID.');
    const id = selection.id;
    if (selection.kind === 'decision') return repository.decision(id).pipe(map(decision => {
      if (decision.id.toLowerCase() !== id.toLowerCase()) throw new RegistryError('invalid-response', 'The registry returned a different decision snapshot.');
      return { kind: 'decision' as const, decision };
    }));
    return repository.profile(id).pipe(map(profile => {
      if (profile.id.toLowerCase() !== id.toLowerCase()) throw new RegistryError('invalid-response', 'The registry returned a different verification profile.');
      return { kind: 'profile' as const, profile };
    }));
  });
}
