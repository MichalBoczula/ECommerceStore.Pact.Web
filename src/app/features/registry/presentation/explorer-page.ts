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
import { publicationEvidence } from '../../verifications/application/evidence-links';
import { ExplorerFacade } from '../application/explorer.facade';
import { ExplorerKind, ExplorerSelection } from '../application/explorer.models';
import { ApplicationVersion, ContractArtifact, Integration, PublicationDetail } from '../domain/registry.models';
import { commitUrl, RecordField, RecordFields } from '../../../shared/presentation/record-fields';
import { RegistryErrorPanel } from '../../../shared/presentation/registry-error-panel';

const filters: Partial<Record<ExplorerKind, readonly [string, string][]>> = {
  applications: [['search', 'Application ID prefix']],
  versions: [],
  integrations: [['applicationId', 'Application (either role)'], ['consumerApplicationId', 'Consumer application'], ['providerApplicationId', 'Provider application']],
  publications: [['sourceApplicationId', 'Source application'], ['commitSha', 'Exact source commit'], ['consumerApplicationId', 'Consumer application'], ['providerApplicationId', 'Provider application'], ['kind', 'Contract kind'], ['sourceRef', 'Source ref'], ['contractSha256', 'Contract SHA256']],
};
const titles: Record<ExplorerKind, string> = { applications: 'Applications', versions: 'Application versions', version: 'Registered version', integrations: 'Application dependencies', integration: 'Declared integration', publications: 'Contracts', publication: 'Contract publication' };

@Component({
  selector: 'app-explorer-page',
  imports: [DatePipe, RouterLink, ReactiveFormsModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule, RecordFields, RegistryErrorPanel],
  templateUrl: './explorer-page.html', styleUrl: './explorer-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExplorerPage {
  readonly facade = inject(ExplorerFacade);
  readonly publicationEvidence = publicationEvidence;
  readonly view = this.facade.view;
  readonly selection = signal<ExplorerSelection>({ kind: 'applications', params: {}, query: {} });
  readonly fields = computed(() => filters[this.selection().kind]);
  readonly title = computed(() => titles[this.selection().kind]);
  readonly params = computed(() => this.selection().params);
  readonly page = computed(() => { const data = this.view().data; return data && 'page' in data ? data.page : null; });
  readonly context = computed(() => {
    const query = this.selection().query;
    return ['integrations', 'integration'].includes(this.selection().kind) && query['sourceApplicationId'] && query['commitSha'] ? { sourceApplicationId: query['sourceApplicationId'], commitSha: query['commitSha'] } : {};
  });
  form = new FormGroup<Record<string, FormControl<string>>>({});

  constructor() {
    const route = inject(ActivatedRoute);
    const destroy = inject(DestroyRef);
    inject(Router).events.pipe(filter(event => event instanceof NavigationEnd), startWith(null),
      map(() => this.facade.selection(route.snapshot)), distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)), takeUntilDestroyed(),
    ).subscribe(selection => {
      this.selection.set(selection);
      this.form = new FormGroup(Object.fromEntries((filters[selection.kind] ?? []).map(([key]) => [key, new FormControl(selection.query[key] ?? '', { nonNullable: true })])));
      this.form.addControl('limit', new FormControl(selection.query['limit'] ?? '25', { nonNullable: true }));
      this.facade.open(selection);
    });
    destroy.onDestroy(() => this.facade.leave());
  }

  apply(): void { this.facade.filter({ ...this.context(), ...this.form.getRawValue() }); }
  clear(): void { this.facade.filter({}); }
  versionFields(value: ApplicationVersion): readonly RecordField[] {
    return [
      { label: 'Application', value: value.applicationId }, { label: 'Commit SHA', value: value.commitSha, href: commitUrl(value.repositoryUrl, value.commitSha) },
      { label: 'Version ID', value: value.id }, { label: 'Repository', value: value.repositoryUrl, href: value.repositoryUrl },
      { label: 'Image digest', value: value.imageDigest ?? 'Not supplied' }, { label: 'Registered at (UTC)', value: value.registeredAt },
    ];
  }
  integrationFields(value: Integration): readonly RecordField[] {
    return [{ label: 'Integration ID', value: value.id }, { label: 'Consumer', value: value.consumerApplicationId }, { label: 'Provider', value: value.providerApplicationId }, { label: 'Registered at (UTC)', value: value.registeredAt }];
  }
  publicationFields(value: PublicationDetail): readonly RecordField[] {
    return [
      { label: 'Publication ID', value: value.id }, { label: 'Binding ID', value: value.bindingId }, { label: 'Contract SHA256', value: value.artifactSha256 },
      { label: 'Kind', value: value.kind }, { label: 'Specification version', value: value.specificationVersion },
      { label: 'Consumer', value: value.consumerApplicationId ?? 'Not applicable (provider publication)' }, { label: 'Provider', value: value.providerApplicationId },
      { label: 'Source ref', value: value.sourceRef }, { label: 'CI build', value: value.buildUrl, href: value.buildUrl },
      { label: 'Publisher', value: value.publisherId }, { label: 'Published at (UTC)', value: value.publishedAt },
    ];
  }
  artifactFields(value: ContractArtifact): readonly RecordField[] {
    return [{ label: 'SHA256', value: value.sha256 }, { label: 'Kind', value: value.kind }, { label: 'Specification version', value: value.specificationVersion }, { label: 'Original size (bytes)', value: String(value.length) }, { label: 'Stored at (UTC)', value: value.storedAt }];
  }
  publicationsFor(integration: Integration, role: 'consumer' | 'provider') {
    const application = role === 'consumer' ? integration.consumerApplicationId : integration.providerApplicationId;
    return { sourceApplicationId: application, providerApplicationId: integration.providerApplicationId,
      ...(role === 'consumer' ? { consumerApplicationId: application, kind: 'ConsumerPact' } : { kind: 'ProviderOpenApi' }),
      ...(this.context().sourceApplicationId === application ? { commitSha: this.context().commitSha } : {}),
    };
  }
}
