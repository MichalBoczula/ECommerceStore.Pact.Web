import { Integration, PublicationDetail } from '../../registry/domain/registry.models';

/** A declaration stays application-level; a known source commit becomes an explicit history filter. */
export function integrationEvidence(integration: Integration, context: { sourceApplicationId?: string; commitSha?: string }): Record<string, string> {
  const scope: Record<string, string> = { consumerApplicationId: integration.consumerApplicationId, providerApplicationId: integration.providerApplicationId };
  if (context.commitSha && context.sourceApplicationId === integration.consumerApplicationId) scope['consumerCommitSha'] = context.commitSha;
  if (context.commitSha && context.sourceApplicationId === integration.providerApplicationId) scope['providerCommitSha'] = context.commitSha;
  return scope;
}

/** Verification reports pin the consumer Pact hash, not a provider OpenAPI artifact hash. */
export function publicationEvidence(publication: PublicationDetail): Record<string, string> | null {
  if (publication.kind === 'ConsumerPact' && publication.consumerApplicationId) return {
    consumerApplicationId: publication.consumerApplicationId, providerApplicationId: publication.providerApplicationId,
    consumerCommitSha: publication.commitSha, contractSha256: publication.artifactSha256,
  };
  if (publication.kind === 'ProviderOpenApi') return { providerApplicationId: publication.providerApplicationId, providerCommitSha: publication.commitSha };
  return null;
}
