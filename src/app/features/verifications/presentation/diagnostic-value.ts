import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { DiagnosticValue as Value } from '../domain/verification.models';

@Component({
  selector: 'app-diagnostic-value',
  template: `@if (value(); as value) { @if (value.present) {
    <span class="value-kind">JSON value</span><pre tabindex="0" [attr.aria-label]="label() + ' JSON value'">{{ value.json }}</pre>
  } @else { <span class="value-kind">Missing value</span><pre>{{ missing }}</pre> } }`,
  styles: `:host { display: block; min-width: 0; } .value-kind { color: var(--pact-muted); font-size: 12px; }
    pre { margin: 8px 0 0; white-space: pre-wrap; overflow-wrap: anywhere; word-break: break-word; max-height: 32rem; overflow: auto; font-size: 13px; line-height: 1.7; }`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DiagnosticValue {
  readonly value = input.required<Value>();
  readonly label = input.required<string>();
  readonly missing = '<missing>';
}
