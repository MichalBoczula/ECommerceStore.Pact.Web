export interface PageRequest { readonly limit?: number; readonly after?: string; }
export interface Page<T> { readonly items: readonly T[]; readonly nextCursor: string | null; }

export interface RegisteredApplication {
  readonly applicationId: string;
  readonly versionCount: number;
}

export interface ApplicationVersion {
  readonly id: string;
  readonly applicationId: string;
  readonly commitSha: string;
  readonly repositoryUrl: string;
  readonly imageDigest: string | null;
  readonly registeredAt: string;
}

export interface Integration {
  readonly id: string;
  readonly consumerApplicationId: string;
  readonly providerApplicationId: string;
  readonly registeredAt: string;
}

export interface IntegrationFilter extends PageRequest {
  readonly applicationId?: string;
  readonly consumerApplicationId?: string;
  readonly providerApplicationId?: string;
}

export interface PublicationFilter extends PageRequest {
  readonly sourceApplicationId?: string;
  readonly commitSha?: string;
  readonly kind?: string;
  readonly consumerApplicationId?: string;
  readonly providerApplicationId?: string;
  readonly sourceRef?: string;
  readonly contractSha256?: string;
}

export interface ContractPublication {
  readonly id: string;
  readonly bindingId: string;
  readonly artifactSha256: string;
  readonly kind: string;
  readonly sourceApplicationId: string;
  readonly commitSha: string;
  readonly consumerApplicationId: string | null;
  readonly providerApplicationId: string;
  readonly sourceRef: string;
  readonly buildUrl: string;
  readonly publisherId: string;
  readonly publishedAt: string;
}

export interface PublicationSummary extends ContractPublication {
  readonly sourceVersionId: string;
  readonly repositoryUrl: string;
}

export interface PublicationDetail extends ContractPublication {
  readonly specificationVersion: string;
}

export interface ContractArtifact {
  readonly sha256: string;
  readonly kind: string;
  readonly specificationVersion: string;
  readonly length: number;
  readonly storedAt: string;
}
