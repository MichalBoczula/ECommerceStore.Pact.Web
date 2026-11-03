import { inject, Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { VerificationActions } from '../state/verification.actions';
import { verificationFeature } from '../state/verification.feature';
import { VerificationSelection } from './verification-view.models';

@Injectable()
export class VerificationFacade {
  private readonly store = inject(Store);
  private readonly router = inject(Router);
  readonly view = this.store.selectSignal(verificationFeature.selectVerificationEvidenceState);
  selection(snapshot: ActivatedRouteSnapshot): VerificationSelection {
    return { id: snapshot.paramMap.get('id'), query: Object.fromEntries(snapshot.queryParamMap.keys.map(key => [key, snapshot.queryParamMap.get(key) ?? ''])),
      ambiguous: snapshot.queryParamMap.keys.some(key => snapshot.queryParamMap.getAll(key).length > 1) };
  }
  open(selection: VerificationSelection): void { this.store.dispatch(VerificationActions.opened({ selection })); }
  leave(): void { this.store.dispatch(VerificationActions.left()); }
  retry(): void { const selection = this.view().selection; if (selection) this.open(selection); }
  filter(values: Readonly<Record<string, string>>): void {
    const queryParams = Object.fromEntries(Object.entries(values).filter(([, value]) => value.trim() !== '').map(([key, value]) => [key, value.trim()]));
    void this.router.navigate([], { queryParams });
  }
  page(after: string | null): void { void this.router.navigate([], { queryParams: { ...this.view().selection?.query, after } }); }
  download(): void {
    const view = this.view();
    if (view.data?.kind === 'run' && view.download !== 'loading') this.store.dispatch(VerificationActions.downloadRequested({ sha256: view.data.run.contractSha256 }));
  }
}
