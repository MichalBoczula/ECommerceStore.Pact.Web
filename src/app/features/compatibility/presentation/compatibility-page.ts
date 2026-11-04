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
import { EvidenceStatus } from '../../verifications/presentation/evidence-status';
import { CompatibilityFacade } from '../application/compatibility.facade';
import { CompatibilitySelection } from '../application/compatibility-view.models';
import { CompatibilityCheck, CompatibilityDecision, CompatibilityReason, CompatibilityRow, RequiredCheck, VerificationProfile } from '../domain/compatibility.models';

const decisionFields = [['consumerApplicationId', 'Consumer application'], ['providerApplicationId', 'Provider application'], ['consumerCommitSha', 'Consumer commit SHA'], ['providerCommitSha', 'Provider commit SHA'], ['contractSha256', 'Pact SHA256'], ['profileId', 'Profile ID'], ['status', 'Decision status'], ['limit', 'Page size']] as const;
const profileFilters = [['consumerApplicationId', 'Consumer application'], ['providerApplicationId', 'Provider application'], ['name', 'Profile name'], ['version', 'Profile version'], ['limit', 'Page size']] as const;
const reasons: Record<CompatibilityReason, string> = { ContractNotPublished: 'Consumer Pact not published for this exact selection.', MissingExecution: 'No report for this exact CI run, attempt and check.', VerifierMismatch: 'Reported verifier does not match the pinned required check.', SourceRefMismatch: 'Reported provider source ref does not match the selection.', Reported: 'Exact selected evidence applies to this required check.' };

@Component({
  selector: 'app-compatibility-page', imports: [DatePipe, RouterLink, ReactiveFormsModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule, RecordFields, RegistryErrorPanel, EvidenceStatus],
  templateUrl: './compatibility-page.html', styleUrl: './compatibility-page.scss', changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CompatibilityPage {
  readonly facade = inject(CompatibilityFacade);
  readonly view = this.facade.view;
  readonly selection = signal<CompatibilitySelection>({ kind: 'decisions', id: null, query: {}, ambiguous: false });
  readonly isList = computed(() => ['decisions', 'profiles'].includes(this.selection().kind));
  readonly fields = computed(() => this.selection().kind === 'profiles' ? profileFilters : decisionFields);
  readonly title = computed(() => ({ decisions: 'Compatibility', decision: 'Compatibility decision', profiles: 'Verification profiles', profile: 'Verification profile' })[this.selection().kind]);
  readonly page = computed(() => { const data = this.view().data; return data?.kind === 'decisions' || data?.kind === 'profiles' ? data.page : null; });
  readonly reasons = reasons;
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
  profileFields(value: VerificationProfile): readonly RecordField[] {
    return [{ label: 'Profile ID', value: value.id }, { label: 'Name / version', value: `${value.name} / ${value.version}` }, { label: 'Content SHA256', value: value.contentSha256 },
      { label: 'Consumer', value: value.consumerApplicationId }, { label: 'Provider', value: value.providerApplicationId }, { label: 'Publisher', value: value.publisherId }, { label: 'Registered at (UTC)', value: value.registeredAt }];
  }
  decisionFields(value: CompatibilityDecision): readonly RecordField[] {
    return [{ label: 'Decision ID', value: value.id }, { label: 'Policy', value: value.policy }, { label: 'Source application', value: value.sourceApplicationId }, { label: 'Publisher', value: value.publisherId }, { label: 'Evaluated at (UTC)', value: value.evaluatedAt }];
  }
  checkFields(value: RequiredCheck): readonly RecordField[] {
    return [{ label: 'Check ID', value: value.checkId }, { label: 'Verifier / version', value: `${value.verifierName} / ${value.verifierVersion}` }, { label: 'Configuration SHA256', value: value.configurationSha256 }];
  }
  rowFields(value: CompatibilityRow): readonly RecordField[] {
    return [{ label: 'Consumer version ID', value: value.consumerVersionId }, { label: 'Provider version ID', value: value.providerVersionId }, { label: 'Consumer Pact binding ID', value: value.bindingId ?? 'Not published' },
      { label: 'Pact SHA256', value: value.contractSha256 }, { label: 'CI run / attempt', value: `${value.ciRunId} / ${value.ciAttempt}` }, { label: 'Provider source ref', value: value.providerSourceRef }];
  }
  evidenceFields(value: CompatibilityCheck): readonly RecordField[] {
    return [{ label: 'Evidence ID', value: value.evidenceId ?? 'No selected report' }, { label: 'Evidence payload SHA256', value: value.evidencePayloadSha256 ?? 'Not available' }, { label: 'Observed publisher', value: value.publisherId ?? 'Not available' }, { label: 'Recorded issue count', value: String(value.issueCount) }];
  }
}
