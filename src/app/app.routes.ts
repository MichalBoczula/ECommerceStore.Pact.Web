import { CanMatchFn, Routes } from '@angular/router';
import { workspaceSections } from './features/core/navigation/workspace-sections';

const registryRoute: CanMatchFn = (_route, segments) => ['applications', 'dependencies', 'contracts'].includes(segments[0]?.path);

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'overview' },
  { path: '', canMatch: [registryRoute], loadChildren: () => import('./features/registry/registry.routes').then(m => m.REGISTRY_ROUTES) },
  ...workspaceSections.filter(section => !['applications', 'dependencies', 'contracts'].includes(section.path)).map((section) => ({
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
