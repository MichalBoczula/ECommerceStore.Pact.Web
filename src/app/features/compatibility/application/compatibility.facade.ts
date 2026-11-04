import { inject, Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { CompatibilityActions } from '../state/compatibility.actions';
import { compatibilityFeature } from '../state/compatibility.feature';
import { CompatibilitySelection } from './compatibility-view.models';

@Injectable()
export class CompatibilityFacade {
  private readonly store = inject(Store);
  private readonly router = inject(Router);
  readonly view = this.store.selectSignal(compatibilityFeature.selectCompatibilityState);
  selection(snapshot: ActivatedRouteSnapshot): CompatibilitySelection {
    return { kind: snapshot.data['kind'], id: snapshot.paramMap.get('id'), query: Object.fromEntries(snapshot.queryParamMap.keys.map(key => [key, snapshot.queryParamMap.get(key) ?? ''])),
      ambiguous: snapshot.queryParamMap.keys.some(key => snapshot.queryParamMap.getAll(key).length > 1) };
  }
  open(selection: CompatibilitySelection): void { this.store.dispatch(CompatibilityActions.opened({ selection })); }
  leave(): void { this.store.dispatch(CompatibilityActions.left()); }
  retry(): void { const selection = this.view().selection; if (selection) this.open(selection); }
  filter(values: Readonly<Record<string, string>>): void { void this.router.navigate([], { queryParams: Object.fromEntries(Object.entries(values).filter(([, value]) => value.trim() !== '').map(([key, value]) => [key, value.trim()])) }); }
  page(after: string | null): void { void this.router.navigate([], { queryParams: { ...this.view().selection?.query, after } }); }
}
