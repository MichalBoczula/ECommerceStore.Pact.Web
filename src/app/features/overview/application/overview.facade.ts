import { inject, Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { OverviewActions } from '../state/overview.actions';
import { overviewFeature } from '../state/overview.feature';
import { OverviewSelection } from './overview-view.models';

@Injectable()
export class OverviewFacade {
  private readonly store = inject(Store);
  private readonly router = inject(Router);
  readonly view = this.store.selectSignal(overviewFeature.selectOverviewState);
  selection(snapshot: ActivatedRouteSnapshot): OverviewSelection {
    return { query: Object.fromEntries(snapshot.queryParamMap.keys.map(key => [key, snapshot.queryParamMap.get(key) ?? ''])),
      ambiguous: snapshot.queryParamMap.keys.some(key => snapshot.queryParamMap.getAll(key).length > 1) };
  }
  open(selection: OverviewSelection): void { this.store.dispatch(OverviewActions.opened({ selection })); }
  leave(): void { this.store.dispatch(OverviewActions.left()); }
  retry(): void { const selection = this.view().selection; if (selection) this.open(selection); }
  filter(values: Readonly<Record<string, string>>): void { void this.router.navigate([], { queryParams: Object.fromEntries(Object.entries(values).filter(([, value]) => value.trim() !== '').map(([key, value]) => [key, value.trim()])) }); }
  page(after: string | null): void { void this.router.navigate([], { queryParams: { ...this.view().selection?.query, after } }); }
}
