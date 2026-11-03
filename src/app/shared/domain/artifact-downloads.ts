export abstract class ArtifactDownloads {
  abstract save(bytes: ArrayBuffer, sha256: string): void;
}
