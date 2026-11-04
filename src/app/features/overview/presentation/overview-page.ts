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
import { RecordField, RecordFields } from '../../../shared/presentation/record-fields';
import { RegistryErrorPanel } from '../../../shared/presentation/registry-error-panel';
import { EvidenceStatus } from '../../verifications/presentation/evidence-status';
import { edgeQuery, evidenceQuery } from '../application/load-overview';
import { OverviewFacade } from '../application/overview.facade';
import { OverviewSelection } from '../application/overview-view.models';
import { RegistryInventory } from '../domain/overview.models';
import { DependencyTopology } from './dependency-topology';
import { ReportCountFields } from './report-counts';

const primary = [['applicationId', 'Application (either role)'], ['consumerApplicationId', 'Consumer application'], ['providerApplicationId', 'Provider application'], ['sourceRef', 'Provider source ref']] as const;
const advanced = [['consumerCommitSha', 'Exact consumer commit'], ['providerCommitSha', 'Exact provider commit'], ['contractSha256', 'Consumer Pact SHA256'], ['ciRunId', 'CI run ID'], ['ciAttempt', 'CI attempt'], ['ciCheckId', 'CI check ID'], ['verifierName', 'Verifier name'], ['verifierVersion', 'Verifier version'], ['configurationSha256', 'Configuration SHA256'], ['issueCode', 'Issue code'], ['jsonPath', 'JSON path']] as const;

@Component({
  selector: 'app-overview-page', imports: [DatePipe, RouterLink, ReactiveFormsModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule, RegistryErrorPanel, RecordFields, EvidenceStatus, DependencyTopology, ReportCountFields],
  templateUrl: './overview-page.html', styleUrl: './overview-page.scss', changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OverviewPage {
  readonly facade = inject(OverviewFacade);
  readonly view = this.facade.view;
  readonly selection = signal<OverviewSelection>({ query: {}, ambiguous: false });
  readonly selectedId = signal<string | null>(null);
  readonly primary = primary; readonly advanced = advanced;
  readonly statuses = ['Passed', 'Failed', 'Error', 'Unverified'] as const;
  readonly advancedOpen = computed(() => advanced.some(([key]) => this.selection().query[key] !== undefined));
  readonly graph = computed(() => this.view().data?.graph.data ?? null);
  readonly selectedEdge = computed(() => this.graph()?.edges.find(e => e.integration.id === this.selectedId()) ?? null);
  readonly evidenceQuery = evidenceQuery;
  readonly edgeQuery = edgeQuery;
  readonly historyQuery = computed(() => Object.fromEntries(Object.entries(this.selection().query).filter(([key]) => key !== 'after' && key !== 'limit')));
  form = new FormGroup<Record<string, FormControl<string>>>({});
  constructor() {
    const route = inject(ActivatedRoute);
    inject(Router).events.pipe(filter(event => event instanceof NavigationEnd), startWith(null), map(() => this.facade.selection(route.snapshot)), distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)), takeUntilDestroyed()).subscribe(selection => {
      this.selection.set(selection); this.selectedId.set(null);
      this.form = new FormGroup(Object.fromEntries([...primary, ...advanced, ['status', ''], ['limit', '']].map(([key]) => [key, new FormControl(selection.query[key] ?? (key === 'limit' ? '25' : ''), { nonNullable: true })])));
      this.facade.open(selection);
    });
    inject(DestroyRef).onDestroy(() => this.facade.leave());
  }
  apply(): void { this.facade.filter(this.form.getRawValue()); }
  clear(): void { this.facade.filter({}); }
  inventory(value: RegistryInventory): readonly RecordField[] { return [{ label: 'Application versions', value: String(value.applicationVersions) }, { label: 'Contract publications', value: String(value.contractPublications) }, { label: 'Verification profiles', value: String(value.verificationProfiles) }, { label: 'Stored comparisons', value: String(value.contractComparisons) }, { label: 'Compatibility decisions', value: String(value.compatibilityDecisions) }]; }
}
