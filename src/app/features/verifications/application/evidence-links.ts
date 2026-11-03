import { PublicationDetail } from '../../registry/domain/registry.models';

/** Verification reports pin the consumer Pact hash, not a provider OpenAPI artifact hash. */
export function publicationEvidence(publication: PublicationDetail): Record<string, string> | null {
  if (publication.kind === 'ConsumerPact' && publication.consumerApplicationId) return {
    consumerApplicationId: publication.consumerApplicationId, providerApplicationId: publication.providerApplicationId,
    consumerCommitSha: publication.commitSha, contractSha256: publication.artifactSha256,
  };
  if (publication.kind === 'ProviderOpenApi') return { providerApplicationId: publication.providerApplicationId, providerCommitSha: publication.commitSha };
  return null;
}
