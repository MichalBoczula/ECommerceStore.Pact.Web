import { TestBed } from '@angular/core/testing';
import { Title } from '@angular/platform-browser';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideStore } from '@ngrx/store';
import { routes } from './app.routes';
import { workspaceSections } from './features/core/navigation/workspace-sections';

describe('Workspace routing', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(new Response(JSON.stringify({ items: [], nextCursor: null }), { headers: { 'Content-Type': 'application/json' } }))));
    TestBed.configureTestingModule({ providers: [provideRouter(routes), provideStore()] });
  });
  afterEach(() => vi.unstubAllGlobals());

  it('opens the overview at the root address', async () => {
    const harness = await RouterTestingHarness.create('/');
    expect(TestBed.inject(Router).url).toBe('/overview');
    expect(harness.routeNativeElement?.querySelector('h1')?.textContent).toBe('Contract overview');
  });

  it('navigates through every section and replaces stale page content', async () => {
    const harness = await RouterTestingHarness.create();
    for (const section of workspaceSections) {
      await harness.navigateByUrl(`/${section.path}`);
      expect(harness.routeNativeElement?.querySelector('h1')?.textContent).toBe(section.title);
      expect(TestBed.inject(Title).getTitle()).toBe(`${section.label} | Pact`);
      if (!['applications', 'dependencies', 'contracts', 'verifications'].includes(section.path)) expect(harness.routeNativeElement?.textContent).toContain(section.emptyTitle);
    }
  });

  it('retains a bookmarked section and query when opened directly', async () => {
    const harness = await RouterTestingHarness.create('/verifications?providerApplicationId=invoice');
    expect(TestBed.inject(Router).url).toBe('/verifications?providerApplicationId=invoice');
    expect(harness.routeNativeElement?.querySelector('h1')?.textContent).toBe('Verification evidence');
  });

  it('shows a recoverable not-found page without silently redirecting a bad address', async () => {
    const harness = await RouterTestingHarness.create('/unknown/record');
    expect(TestBed.inject(Router).url).toBe('/unknown/record');
    expect(harness.routeNativeElement?.querySelector('h1')?.textContent).toBe('Page not found');
    expect(harness.routeNativeElement?.querySelector('a')?.getAttribute('href')).toBe('/overview');
  });
});
