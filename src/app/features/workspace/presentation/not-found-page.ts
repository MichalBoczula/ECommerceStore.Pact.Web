import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-not-found-page',
  imports: [MatButtonModule, RouterLink],
  template: `
    <header class="page-heading"><h1>Page not found</h1><p>This address does not match a page in the registry.</p></header>
    <section class="empty-state" aria-label="Return to the registry">
      <h2>Find your way back</h2>
      <p>Use the navigation to explore the contract workspace.</p>
      <a mat-flat-button routerLink="/overview">Back to overview</a>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotFoundPage {}
