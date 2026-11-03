import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { RegistryFailure } from '../domain/registry-error';

@Component({
  selector: 'app-registry-error-panel', imports: [MatButtonModule],
  template: `<section class="error-panel" role="alert"><h2>{{ title() }}</h2><p>{{ error().message }}</p>
    @for (entry of validation(); track entry[0]) { <p><strong>{{ entry[0] }}</strong>: {{ entry[1].join(' ') }}</p> }
    @if (error().traceId; as trace) { <p class="trace">Trace ID: {{ trace }}</p> }
    <button mat-stroked-button type="button" (click)="retry.emit()">Retry</button>
  </section>`,
  styles: `.error-panel { padding: 24px; border: 1px solid var(--pact-border); border-radius: var(--pact-radius-16); background: var(--pact-failed-soft); overflow-wrap: anywhere; }
    h2 { margin: 0 0 12px; font-size: 18px; } .trace { font-size: 12px; color: var(--pact-muted); }`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegistryErrorPanel {
  readonly error = input.required<RegistryFailure>();
  readonly retry = output<void>();
  readonly validation = computed(() => Object.entries(this.error().validation));
  readonly title = computed(() => ({ validation: 'Check the filters', 'not-found': 'Record not found', unavailable: 'Registry unavailable',
    network: 'Registry unavailable', service: 'Registry request failed', 'invalid-response': 'Registry response could not be read' })[this.error().kind]);
}
