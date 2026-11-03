import { BreakpointObserver } from '@angular/cdk/layout';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatSidenav, MatSidenavModule } from '@angular/material/sidenav';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { map } from 'rxjs';
import { workspaceSections } from '../navigation/workspace-sections';

@Component({
  selector: 'app-workspace-shell',
  imports: [MatButtonModule, MatIconModule, MatListModule, MatSidenavModule, RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './workspace-shell.html',
  styleUrl: './workspace-shell.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkspaceShell {
  readonly sections = workspaceSections;
  readonly drawerOpen = signal(false);
  readonly isMobile = toSignal(
    inject(BreakpointObserver).observe('(max-width: 767px)').pipe(map((state) => state.matches)),
    { initialValue: false },
  );

  closeOnMobile(drawer: MatSidenav): void {
    if (this.isMobile()) void drawer.close();
  }
}
