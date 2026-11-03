import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { WorkspaceSection } from '../../core/navigation/workspace-sections';

@Component({
  selector: 'app-section-page',
  imports: [MatButtonModule, RouterLink],
  template: `
    @if (section(); as section) {
      <header class="page-heading">
        <h1>{{ section.title }}</h1>
        <p>{{ section.description }}</p>
      </header>
      <section class="empty-state" aria-labelledby="section-title">
        <span class="section-label">{{ section.label }}</span>
        <h2 id="section-title">{{ section.emptyTitle }}</h2>
        <p>{{ section.emptyDescription }}</p>
        <p class="empty-state-note">No registry data loaded.</p>
        <a mat-stroked-button routerLink="/overview">Back to overview</a>
      </section>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SectionPage {
  private readonly data = toSignal(inject(ActivatedRoute).data);
  readonly section = computed(() => this.data()?.['section'] as WorkspaceSection | undefined);
}
