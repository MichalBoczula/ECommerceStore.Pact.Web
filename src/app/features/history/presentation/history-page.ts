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
import { RecordField, RecordFields, webUrl } from '../../../shared/presentation/record-fields';
import { RegistryErrorPanel } from '../../../shared/presentation/registry-error-panel';
import { VerificationRun } from '../../verifications/domain/verification.models';
import { EvidenceStatus } from '../../verifications/presentation/evidence-status';
import { HistoryFacade } from '../application/history.facade';
import { HistorySelection } from '../application/history-view.models';
import { ComparisonSource, ContractComparison, IssueTransition } from '../domain/history.models';
import { IssueSnapshot } from './issue-snapshot';

const comparisonFields = [['consumerApplicationId', 'Consumer application'], ['providerApplicationId', 'Provider application'], ['sourceApplicationId', 'Source application'], ['kind', 'Contract kind'], ['baselineRef', 'Source baseline ref'], ['limit', 'Page size']] as const;
const issueFields = [['beforeRunId', 'Before run ID'], ['afterRunId', 'After run ID'], ['baselineRef', 'Provider baseline ref']] as const;
const transitions: Record<IssueTransition, string> = { Appeared: 'Appeared', Observed: 'Observed', Persisting: 'Persisting', Resolved: 'Resolved — comparable passing evidence', Unconfirmed: 'Unconfirmed — no passing confirmation', RequirementsChanged: 'Requirements changed — no provider fix established', VerifierChanged: 'Verifier/check changed — not comparable' };

@Component({
  selector: 'app-history-page', imports: [DatePipe, RouterLink, ReactiveFormsModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule, RecordFields, RegistryErrorPanel, EvidenceStatus, IssueSnapshot],
  templateUrl: './history-page.html', styleUrl: './history-page.scss', changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HistoryPage {
  readonly facade = inject(HistoryFacade);
  readonly view = this.facade.view;
  readonly selection = signal<HistorySelection>({ kind: 'issues', id: null, query: {}, ambiguous: false });
  readonly fields = computed(() => this.selection().kind === 'issues' ? issueFields : comparisonFields);
  readonly title = computed(() => this.selection().kind === 'issues' ? 'Issue history' : this.selection().kind === 'comparison' ? 'Stored contract comparison' : 'Contract comparisons');
  readonly transitions = transitions;
  readonly webUrl = webUrl;
  form = new FormGroup<Record<string, FormControl<string>>>({});
  constructor() {
    const route = inject(ActivatedRoute);
    inject(Router).events.pipe(filter(event => event instanceof NavigationEnd), startWith(null), map(() => this.facade.selection(route.snapshot)), distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)), takeUntilDestroyed()).subscribe(selection => {
      this.selection.set(selection);
      this.form = new FormGroup(Object.fromEntries(this.fields().map(([key]) => [key, new FormControl(selection.query[key] ?? (key === 'limit' ? '25' : ''), { nonNullable: true })])));
      this.facade.open(selection);
    });
    inject(DestroyRef).onDestroy(() => this.facade.leave());
  }
  apply(): void { this.facade.filter(this.form.getRawValue()); }
  clear(): void { this.facade.filter({}); }
  sourceFields(source: ComparisonSource): readonly RecordField[] {
    return [{ label: 'Application', value: source.applicationId }, { label: 'Commit SHA', value: source.commitSha }, { label: 'Contract SHA256', value: source.artifactSha256 },
      { label: 'Source ref', value: source.sourceRef }, { label: 'Publication ID', value: source.publicationId }, { label: 'Binding ID', value: source.bindingId }, { label: 'Source version ID', value: source.sourceVersionId }, { label: 'Kind', value: source.kind }];
  }
  comparisonFields(value: ContractComparison): readonly RecordField[] {
    return [{ label: 'Comparison ID', value: value.id }, { label: 'Comparison profile', value: value.profile }, { label: 'Baseline ref', value: value.baselineRef },
      { label: 'Consumer', value: value.consumerApplicationId }, { label: 'Provider', value: value.providerApplicationId }, { label: 'Publisher', value: value.publisherId },
      { label: 'Tool', value: value.tool }, { label: 'Tool version', value: value.toolVersion }, { label: 'Compared at (UTC)', value: value.comparedAt }, { label: 'Reported consumer impact', value: value.consumerImpact }];
  }
  runFields(run: VerificationRun): readonly RecordField[] {
    return [{ label: 'Consumer commit', value: run.consumerCommitSha }, { label: 'Provider commit', value: run.providerCommitSha }, { label: 'Pact SHA256', value: run.contractSha256 },
      { label: 'CI run / attempt / check', value: `${run.ciRunId} / ${run.ciAttempt} / ${run.ciCheckId}` }, { label: 'Verifier / version', value: `${run.verifierName} / ${run.verifierVersion}` },
      { label: 'Configuration SHA256', value: run.configurationSha256 }, { label: 'Provider source ref', value: run.sourceRef }, { label: 'Recorded at (UTC)', value: run.recordedAt }];
  }
}
