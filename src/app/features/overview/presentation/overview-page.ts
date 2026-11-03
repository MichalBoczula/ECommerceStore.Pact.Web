import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-overview-page',
  imports: [MatButtonModule, RouterLink],
  templateUrl: './overview-page.html',
  styleUrl: './overview-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OverviewPage {
  readonly areas = [
    { title: 'Contracts', label: 'Explore contracts', path: '/contracts', description: 'Immutable artifacts, exact source versions, and publication provenance.' },
    { title: 'Verification evidence', label: 'View verifications', path: '/verifications', description: 'Consumer requirements, provider results, and the CI executions behind them.' },
    { title: 'Compatibility', label: 'Explore compatibility', path: '/compatibility', description: 'Explicit version pairs, pinned checks, and evidence for every decision.' },
  ];
}
