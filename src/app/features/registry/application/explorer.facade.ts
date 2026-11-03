import { inject, Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { explorerFeature } from '../state/explorer.feature';
import { ExplorerActions } from '../state/explorer.actions';
import { ExplorerKind, ExplorerSelection } from './explorer.models';

@Injectable()
export class ExplorerFacade {
  private readonly store = inject(Store);
  private readonly router = inject(Router);
  readonly view = this.store.selectSignal(explorerFeature.selectRegistryExplorerState);

  selection(snapshot: ActivatedRouteSnapshot): ExplorerSelection {
    return {
      kind: snapshot.data['kind'] as ExplorerKind,
      params: { ...snapshot.params },
      query: Object.fromEntries(snapshot.queryParamMap.keys.map(key => [key, snapshot.queryParamMap.get(key) ?? ''])),
      ambiguous: snapshot.queryParamMap.keys.some(key => snapshot.queryParamMap.getAll(key).length > 1),
    };
  }
  open(selection: ExplorerSelection): void { this.store.dispatch(ExplorerActions.opened({ selection })); }
  leave(): void { this.store.dispatch(ExplorerActions.left()); }
  retry(): void { const selection = this.view().selection; if (selection) this.open(selection); }
  download(): void {
    const view = this.view();
    if (view.data?.kind === 'publication' && view.download !== 'loading') {
      this.store.dispatch(ExplorerActions.downloadRequested({ sha256: view.data.artifact.sha256 }));
    }
  }
  filter(values: Record<string, string | undefined>): void {
    const queryParams = Object.fromEntries(Object.entries(values).flatMap(([key, value]) => typeof value === 'string' && value.trim() !== '' ? [[key, value.trim()]] : []));
    void this.router.navigate([], { queryParams });
  }
  page(after: string | null): void {
    void this.router.navigate([], { queryParams: { ...this.view().selection?.query, after } });
  }
}
