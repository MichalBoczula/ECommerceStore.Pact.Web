import { ApplicationVersionResultDto, ContractArtifactResultDto, ContractPublicationResultDto, IntegrationResultDto, PublicationSummaryResultDto, RegisteredApplicationResultDto } from '../../../shared/infrastructure/api-clients/pact/models';
import { count, optionalText, text, timestamp } from '../../../shared/infrastructure/read-mapping';
import { ApplicationVersion, ContractArtifact, ContractPublication, Integration, PublicationDetail, PublicationSummary, RegisteredApplication } from '../domain/registry.models';

export function application(dto: RegisteredApplicationResultDto): RegisteredApplication {
  return { applicationId: text(dto.applicationId), versionCount: count(dto.versionCount) };
}

export function version(dto: ApplicationVersionResultDto): ApplicationVersion {
  return {
    id: text(dto.id), applicationId: text(dto.applicationId), commitSha: text(dto.commitSha),
    repositoryUrl: text(dto.repositoryUrl), imageDigest: optionalText(dto.imageDigest), registeredAt: timestamp(dto.registeredAt),
  };
}

export function integration(dto: IntegrationResultDto): Integration {
  return { id: text(dto.id), consumerApplicationId: text(dto.consumerApplicationId), providerApplicationId: text(dto.providerApplicationId), registeredAt: timestamp(dto.registeredAt) };
}

function publication(dto: ContractPublicationResultDto | PublicationSummaryResultDto): ContractPublication {
  return {
    id: text(dto.id), bindingId: text(dto.bindingId), artifactSha256: text(dto.artifactSha256), kind: text(dto.kind),
    sourceApplicationId: text(dto.sourceApplicationId), commitSha: text(dto.commitSha), consumerApplicationId: optionalText(dto.consumerApplicationId),
    providerApplicationId: text(dto.providerApplicationId), sourceRef: text(dto.sourceRef), buildUrl: text(dto.buildUrl),
    publisherId: text(dto.publisherId), publishedAt: timestamp(dto.publishedAt),
  };
}

export function publicationSummary(dto: PublicationSummaryResultDto): PublicationSummary {
  return { ...publication(dto), sourceVersionId: text(dto.sourceVersionId), repositoryUrl: text(dto.repositoryUrl) };
}

export function publicationDetail(dto: ContractPublicationResultDto): PublicationDetail {
  return { ...publication(dto), specificationVersion: text(dto.specificationVersion) };
}

export function artifact(dto: ContractArtifactResultDto): ContractArtifact {
  return { sha256: text(dto.sha256), kind: text(dto.kind), specificationVersion: text(dto.specificationVersion), length: count(dto.length), storedAt: timestamp(dto.storedAt) };
}
