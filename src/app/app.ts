import { ChangeDetectionStrategy, Component } from '@angular/core';
import { WorkspaceShell } from './features/core/layout/workspace-shell';

@Component({
  selector: 'app-root',
  imports: [WorkspaceShell],
  template: '<app-workspace-shell />',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {}
