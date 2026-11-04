import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { ReportCounts } from '../domain/overview.models';

@Component({
  selector: 'app-report-counts',
  template: `<dl>@for (field of fields(); track field.label) { <div><dt>{{ field.label }}</dt><dd>{{ field.value }}</dd></div> }</dl>`,
  styles: `dl { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 100px), 1fr)); gap: 20px 16px; margin: 0; }
    div { min-width: 0; } dt { color: var(--pact-muted); font-size: 12px; margin-bottom: 6px; } dd { margin: 0; font-size: 14px; overflow-wrap: anywhere; line-height: 1.6; }`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReportCountFields {
  readonly counts = input.required<ReportCounts>();
  readonly fields = computed(() => [{ label: 'Passed reports', value: this.counts().passed }, { label: 'Failed reports', value: this.counts().failed }, { label: 'Error reports', value: this.counts().error }, { label: 'Unverified reports', value: this.counts().unverified }]);
}
