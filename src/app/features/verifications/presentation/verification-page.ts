import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { ActivatedRoute, NavigationEnd, Router, RouterLink } from '@angular/router';
import { distinctUntilChanged, filter, map, startWith } from 'rxjs';
import { commitUrl, RecordField, RecordFields, webUrl } from '../../../shared/presentation/record-fields';
import { RegistryErrorPanel } from '../../../shared/presentation/registry-error-panel';
import { verificationStatuses } from '../application/load-verifications';
import { VerificationFacade } from '../application/verification.facade';
import { VerificationSelection } from '../application/verification-view.models';
import { VerificationEvidence, VerificationRun } from '../domain/verification.models';
import { DiagnosticValue } from './diagnostic-value';
import { EvidenceStatus } from './evidence-status';

const primary = [['applicationId', 'Application (either role)'], ['consumerApplicationId', 'Consumer application'], ['providerApplicationId', 'Provider application']] as const;
const advanced = [['consumerCommitSha', 'Exact consumer commit'], ['providerCommitSha', 'Exact provider commit'], ['contractSha256', 'Consumer contract SHA256'], ['sourceRef', 'Provider source ref'], ['issueCode', 'Issue code'], ['jsonPath', 'JSON path'], ['ciRunId', 'CI run ID'], ['ciAttempt', 'CI attempt'], ['ciCheckId', 'CI check ID'], ['verifierName', 'Verifier name'], ['verifierVersion', 'Verifier version'], ['configurationSha256', 'Configuration SHA256']] as const;

@Component({
  selector: 'app-verification-page',
  imports: [DatePipe, RouterLink, ReactiveFormsModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule, RecordFields, RegistryErrorPanel, DiagnosticValue, EvidenceStatus],
  templateUrl: './verification-page.html', styleUrl: './verification-page.scss', changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VerificationPage {
  readonly facade = inject(VerificationFacade);
  readonly view = this.facade.view;
  readonly selection = signal<VerificationSelection>({ id: null, query: {}, ambiguous: false });
  readonly primary = primary;
  readonly advanced = advanced;
  readonly statuses = verificationStatuses;
  readonly advancedOpen = computed(() => advanced.some(([key]) => this.selection().query[key] !== undefined));
  readonly invalidStatus = computed(() => {
    const status = this.selection().query['status']; return status && !this.statuses.some(value => value === status) ? status : null;
  });
  readonly run = computed(() => { const data = this.view().data; return data?.kind === 'run' ? data.run : null; });
  readonly title = computed(() => { const run = this.run(); return run ? `${run.consumerApplicationId} → ${run.providerApplicationId}` : this.selection().id ? 'Verification details' : 'Verification evidence'; });
  readonly webUrl = webUrl;
  readonly consumerCommitUrl = computed(() => { const version = this.view().sources?.consumer.version; return version ? commitUrl(version.repositoryUrl, version.commitSha) : null; });
  readonly providerCommitUrl = computed(() => { const version = this.view().sources?.provider.version; return version ? commitUrl(version.repositoryUrl, version.commitSha) : null; });
  form = new FormGroup<Record<string, FormControl<string>>>({});

  constructor() {
    const route = inject(ActivatedRoute);
    inject(Router).events.pipe(filter(event => event instanceof NavigationEnd), startWith(null), map(() => this.facade.selection(route.snapshot)),
      distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)), takeUntilDestroyed(),
    ).subscribe(selection => {
      this.selection.set(selection);
      this.form = new FormGroup(Object.fromEntries([...primary, ...advanced, ['status', ''], ['limit', '']].map(([key]) =>
        [key, new FormControl(selection.query[key] ?? (key === 'limit' ? '25' : ''), { nonNullable: true })])));
      this.facade.open(selection);
    });
    inject(DestroyRef).onDestroy(() => this.facade.leave());
  }
  apply(): void { this.facade.filter(this.form.getRawValue()); }
  clear(): void { this.facade.filter({}); }
  summaryFields(run: VerificationEvidence): readonly RecordField[] {
    return [{ label: 'Consumer commit', value: run.consumerCommitSha }, { label: 'Provider commit', value: run.providerCommitSha },
      { label: 'Contract SHA256', value: run.contractSha256 }, { label: 'CI run / attempt / check', value: `${run.ciRunId} / ${run.ciAttempt} / ${run.ciCheckId}` }];
  }
  provenance(run: VerificationRun): readonly RecordField[] {
    return [{ label: 'Verification ID', value: run.id }, { label: 'Consumer publication ID', value: run.consumerPublicationId }, { label: 'Binding ID', value: run.bindingId },
      { label: 'Consumer version ID', value: run.consumerVersionId }, { label: 'Provider version ID', value: run.providerVersionId },
      { label: 'Verifier', value: run.verifierName }, { label: 'Verifier version', value: run.verifierVersion }, { label: 'Configuration SHA256', value: run.configurationSha256 },
      { label: 'Provider source ref', value: run.sourceRef }, { label: 'CI build', value: run.buildUrl, href: run.buildUrl }, { label: 'Publisher', value: run.publisherId },
      { label: 'Started at (UTC)', value: run.startedAt }, { label: 'Finished at (UTC)', value: run.finishedAt }, { label: 'Recorded at (UTC)', value: run.recordedAt }];
  }
  evidence(run: VerificationRun): readonly RecordField[] { return run.evidenceUrls.map((url, index) => ({ label: `Evidence link ${index + 1}`, value: url, href: url })); }
}
