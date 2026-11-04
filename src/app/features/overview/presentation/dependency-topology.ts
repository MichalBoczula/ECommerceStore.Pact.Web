import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { DependencyGraph } from '../domain/overview.models';
import { graphLayout } from './graph-layout';

@Component({
  selector: 'app-dependency-topology',
  template: `<div class="graph-scroll" tabindex="0" role="region" aria-label="Scrollable dependency diagram; consumer to provider arrows">
    <svg [attr.width]="layout().width" [attr.height]="layout().height" role="group" aria-label="Declared dependencies; not runtime traces">
      <defs><marker id="dependency-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" /></marker></defs>
      @for (edge of layout().paths; track edge.id) {
        <g role="button" tabindex="0" [attr.aria-label]="'Select ' + edge.label" [attr.aria-pressed]="selectedId() === edge.id" [class.selected]="selectedId() === edge.id"
          (click)="selected.emit(edge.id)" (keydown.enter)="selected.emit(edge.id)" (keydown.space)="$event.preventDefault(); selected.emit(edge.id)">
          <title>{{ edge.label }} · {{ edge.empty ? 'No matching reports' : 'Recorded evidence available' }}</title>
          <circle [attr.cx]="edge.focusX" [attr.cy]="edge.focusY" r="12" fill="transparent" />
          <path class="hit" [attr.d]="edge.path" /><path class="edge" [class.empty]="edge.empty" [attr.d]="edge.path" marker-end="url(#dependency-arrow)" />
        </g>
      }
      @for (node of layout().nodes; track node.applicationId) {
        <g [attr.transform]="'translate(' + node.x + ',' + node.y + ')'" class="node"><title>{{ node.applicationId }}</title><rect width="160" height="76" rx="8" /><text x="16" y="30">{{ label(node.applicationId) }}</text><text x="16" y="54" class="node-caption">Declared application</text></g>
      }
    </svg>
  </div>`,
  styles: `:host { display: block; min-width: 0; } .graph-scroll { overflow: auto; max-height: 480px; border-radius: var(--pact-radius-8); } svg { display: block; }
    .graph-scroll:focus-visible { outline: 3px solid var(--pact-blue); outline-offset: 3px; }
    marker path { fill: var(--pact-muted); } .edge { fill: none; stroke: var(--pact-muted); stroke-width: 2; } .edge.empty { stroke-dasharray: 5 5; }
    .hit { fill: none; stroke: transparent; stroke-width: 24; } g[role=button] { cursor: pointer; outline: none; }
    g.selected .edge, g[role=button]:focus-visible .edge { stroke: var(--pact-blue); stroke-width: 4; }
    .node rect { fill: var(--pact-white); stroke: var(--pact-border); } .node text { fill: var(--pact-ink); font: 500 13px Roboto, sans-serif; }
    .node .node-caption { fill: var(--pact-muted); font: 12px Roboto, sans-serif; }`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DependencyTopology {
  readonly graph = input.required<DependencyGraph>();
  readonly selectedId = input<string | null>(null);
  readonly selected = output<string>();
  readonly layout = computed(() => graphLayout(this.graph()));
  label(value: string): string { return value.length > 18 ? `${value.slice(0, 17)}…` : value; }
}
