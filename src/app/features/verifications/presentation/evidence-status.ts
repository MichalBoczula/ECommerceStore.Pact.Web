import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { VerificationStatus } from '../domain/verification.models';

@Component({
  selector: 'app-evidence-status',
  template: `<span [class]="'badge status-' + status()">{{ status() }}</span>`,
  styles: `.badge { display: inline-flex; align-items: center; justify-content: center; min-width: 112px; min-height: 32px; padding: 4px 12px; border-radius: var(--pact-radius-8); font-size: 13px; font-weight: 500; }
    .status-Passed { color: var(--pact-passed); background: var(--pact-passed-soft); }
    .status-Failed { color: var(--pact-failed); background: var(--pact-failed-soft); }
    .status-Error { color: var(--pact-error); background: var(--pact-error-soft); }
    .status-Unverified { color: var(--pact-unverified); background: var(--pact-unverified-soft); }`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EvidenceStatus { readonly status = input.required<VerificationStatus>(); }
