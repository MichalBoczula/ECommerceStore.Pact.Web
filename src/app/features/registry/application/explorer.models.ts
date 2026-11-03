import { RegistryErrorKind } from '../../../shared/domain/registry-error';
import { ApplicationVersion, ContractArtifact, Integration, Page, PublicationDetail, PublicationSummary, RegisteredApplication } from '../domain/registry.models';

export type ExplorerKind = 'applications' | 'versions' | 'version' | 'integrations' | 'integration' | 'publications' | 'publication';
export interface ExplorerSelection {
  readonly kind: ExplorerKind;
  readonly params: Readonly<Record<string, string>>;
  readonly query: Readonly<Record<string, string>>;
  readonly ambiguous?: boolean;
}
export type ExplorerData =
  | { readonly kind: 'applications'; readonly page: Page<RegisteredApplication> }
  | { readonly kind: 'versions'; readonly page: Page<ApplicationVersion> }
  | { readonly kind: 'version'; readonly version: ApplicationVersion }
  | { readonly kind: 'integrations'; readonly page: Page<Integration> }
  | { readonly kind: 'integration'; readonly integration: Integration }
  | { readonly kind: 'publications'; readonly page: Page<PublicationSummary> }
  | { readonly kind: 'publication'; readonly publication: PublicationDetail; readonly artifact: ContractArtifact; readonly version: ApplicationVersion };

/** Plain serializable state; transport exceptions and generated DTOs never enter NgRx. */
export interface ExplorerFailure {
  readonly kind: RegistryErrorKind;
  readonly message: string;
  readonly traceId: string | null;
  readonly validation: Readonly<Record<string, readonly string[]>>;
}

export abstract class ArtifactDownloads {
  abstract save(bytes: ArrayBuffer, sha256: string): void;
}
