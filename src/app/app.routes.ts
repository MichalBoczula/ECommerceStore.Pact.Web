import { CanMatchFn, Routes } from '@angular/router';
import { workspaceSections } from './features/core/navigation/workspace-sections';

const registryRoute: CanMatchFn = (_route, segments) => ['applications', 'dependencies', 'contracts'].includes(segments[0]?.path);

const historyRoute: CanMatchFn = (_route, segments) => segments[0]?.path === 'issue-history' || (segments[0]?.path === 'contracts' && segments[1]?.path === 'comparisons');

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'overview' },
  { path: '', canMatch: [historyRoute], loadChildren: () => import('./features/history/history.routes').then(m => m.HISTORY_ROUTES) },
  { path: '', canMatch: [registryRoute], loadChildren: () => import('./features/registry/registry.routes').then(m => m.REGISTRY_ROUTES) },
  { path: 'verifications', loadChildren: () => import('./features/verifications/verification.routes').then(m => m.VERIFICATION_ROUTES) },
  ...workspaceSections.filter(section => !['applications', 'dependencies', 'contracts', 'verifications', 'issue-history'].includes(section.path)).map((section) => ({
    path: section.path,
    title: `${section.label} | Pact`,
    data: { section },
    loadComponent: section.path === 'overview'
      ? () => import('./features/overview/presentation/overview-page').then((m) => m.OverviewPage)
      : () => import('./features/workspace/presentation/section-page').then((m) => m.SectionPage),
  })),
  {
    path: '**',
    title: 'Page not found | Pact',
    loadComponent: () => import('./features/workspace/presentation/not-found-page').then((m) => m.NotFoundPage),
  },
];
