import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RecordFields } from '../../../shared/presentation/record-fields';
import { VerificationIssue } from '../../verifications/domain/verification.models';
import { DiagnosticValue } from '../../verifications/presentation/diagnostic-value';

@Component({
  selector: 'app-issue-snapshot', imports: [RecordFields, DiagnosticValue],
  template: `@if (issue(); as issue) {
    <p class="message">{{ issue.message }}</p><app-record-fields [fields]="[{ label: 'Interaction', value: issue.interaction ?? 'Not supplied' }, { label: 'Method', value: issue.method ?? 'Not supplied' }, { label: 'Path', value: issue.path ?? 'Not supplied' }, { label: 'JSON path', value: issue.jsonPath ?? 'Not supplied' }]" />
    <div class="diagnostics"><section [attr.aria-label]="label() + ' expected'"><h4>Expected</h4><app-diagnostic-value [value]="issue.expected" [label]="label() + ' expected'" /></section>
      <section [attr.aria-label]="label() + ' actual'"><h4>Actual</h4><app-diagnostic-value [value]="issue.actual" [label]="label() + ' actual'" /></section></div>
    <p class="note">actualPresent: {{ issue.actualPresent === null ? 'not reported' : issue.actualPresent }}</p>
    @if (issue.evidenceUrl; as url) { <app-record-fields [fields]="[{ label: 'Issue evidence', value: url, href: url }]" /> }
  } @else { <p class="note">No matching mismatch recorded in this run.</p> }`,
  styles: `:host { display: block; min-width: 0; } .message { white-space: pre-wrap; overflow-wrap: anywhere; }
    .diagnostics { display: grid; gap: 12px; margin: 20px 0 0; } .diagnostics section { padding: 16px; border: 1px solid var(--pact-border); border-radius: var(--pact-radius-8); min-width: 0; }
    .diagnostics section:first-child { background: var(--pact-passed-soft); } .diagnostics section:last-child { background: var(--pact-failed-soft); }
    h4 { margin: 0 0 8px; font-size: 13px; font-weight: 500; } .note { color: var(--pact-muted); font-size: 12px; line-height: 1.6; }`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IssueSnapshot { readonly issue = input.required<VerificationIssue | null>(); readonly label = input.required<string>(); }
