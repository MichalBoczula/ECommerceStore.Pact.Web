import { DOCUMENT } from '@angular/common';
import { inject, Injectable } from '@angular/core';
import { ArtifactDownloads } from '../application/explorer.models';

@Injectable()
export class BrowserArtifactDownloads extends ArtifactDownloads {
  private readonly document = inject(DOCUMENT);
  override save(bytes: ArrayBuffer, sha256: string): void {
    const url = URL.createObjectURL(new Blob([bytes], { type: 'application/octet-stream' }));
    const anchor = this.document.createElement('a');
    anchor.href = url;
    anchor.download = `contract-${/^[a-f0-9]{64}$/i.test(sha256) ? sha256 : 'artifact'}.json`;
    this.document.body.append(anchor);
    try { anchor.click(); } finally { anchor.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
  }
}
