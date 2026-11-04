import { CanMatchFn, Routes } from '@angular/router';

const registryRoute: CanMatchFn = (_route, segments) => ['applications', 'dependencies', 'contracts'].includes(segments[0]?.path);

const historyRoute: CanMatchFn = (_route, segments) => segments[0]?.path === 'issue-history' || (segments[0]?.path === 'contracts' && segments[1]?.path === 'comparisons');

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'overview' },
  { path: '', canMatch: [historyRoute], loadChildren: () => import('./features/history/history.routes').then(m => m.HISTORY_ROUTES) },
  { path: '', canMatch: [registryRoute], loadChildren: () => import('./features/registry/registry.routes').then(m => m.REGISTRY_ROUTES) },
  { path: 'verifications', loadChildren: () => import('./features/verifications/verification.routes').then(m => m.VERIFICATION_ROUTES) },
  { path: 'compatibility', loadChildren: () => import('./features/compatibility/compatibility.routes').then(m => m.COMPATIBILITY_ROUTES) },
  { path: 'overview', loadChildren: () => import('./features/overview/overview.routes').then(m => m.OVERVIEW_ROUTES) },
  {
    path: '**',
    title: 'Page not found | Pact',
    loadComponent: () => import('./features/workspace/presentation/not-found-page').then((m) => m.NotFoundPage),
  },
];
