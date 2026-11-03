import { BreakpointObserver, BreakpointState } from '@angular/cdk/layout';
import { TestBed } from '@angular/core/testing';
import { MatSidenav } from '@angular/material/sidenav';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { WorkspaceShell } from './workspace-shell';

describe('WorkspaceShell', () => {
  const breakpoint = new BehaviorSubject<BreakpointState>({ matches: false, breakpoints: {} });

  beforeEach(() => {
    breakpoint.next({ matches: false, breakpoints: {} });
    TestBed.configureTestingModule({
      imports: [WorkspaceShell],
      providers: [
        provideRouter([]), provideNoopAnimations(),
        { provide: BreakpointObserver, useValue: { observe: () => breakpoint.asObservable() } },
      ],
    });
  });

  it('closes the drawer after mobile navigation and keeps it open on desktop', () => {
    const fixture = TestBed.createComponent(WorkspaceShell);
    const close = vi.fn().mockResolvedValue('close');
    const drawer = { close } as unknown as MatSidenav;
    fixture.componentInstance.closeOnMobile(drawer);
    expect(close).not.toHaveBeenCalled();
    breakpoint.next({ matches: true, breakpoints: {} });
    fixture.componentInstance.closeOnMobile(drawer);
    expect(close).toHaveBeenCalledOnce();
  });
});
