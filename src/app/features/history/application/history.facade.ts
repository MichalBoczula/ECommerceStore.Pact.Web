import { inject, Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { HistoryActions } from '../state/history.actions';
import { historyFeature } from '../state/history.feature';
import { HistorySelection } from './history-view.models';

@Injectable()
export class HistoryFacade {
  private readonly store = inject(Store);
  private readonly router = inject(Router);
  readonly view = this.store.selectSignal(historyFeature.selectContractHistoryState);
  selection(snapshot: ActivatedRouteSnapshot): HistorySelection {
    return { kind: snapshot.data['kind'], id: snapshot.paramMap.get('id'), query: Object.fromEntries(snapshot.queryParamMap.keys.map(key => [key, snapshot.queryParamMap.get(key) ?? ''])),
      ambiguous: snapshot.queryParamMap.keys.some(key => snapshot.queryParamMap.getAll(key).length > 1) };
  }
  open(selection: HistorySelection): void { this.store.dispatch(HistoryActions.opened({ selection })); }
  leave(): void { this.store.dispatch(HistoryActions.left()); }
  retry(): void { const selection = this.view().selection; if (selection) this.open(selection); }
  filter(values: Readonly<Record<string, string>>): void { void this.router.navigate([], { queryParams: Object.fromEntries(Object.entries(values).filter(([, value]) => value.trim() !== '').map(([key, value]) => [key, value.trim()])) }); }
  page(after: string | null): void { void this.router.navigate([], { queryParams: { ...this.view().selection?.query, after } }); }
}
