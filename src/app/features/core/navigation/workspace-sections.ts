export interface WorkspaceSection {
  readonly path: string;
  readonly label: string;
  readonly title: string;
  readonly description: string;
  readonly emptyTitle: string;
  readonly emptyDescription: string;
}

export const workspaceSections = [
  {
    path: 'overview', label: 'Overview', title: 'Contract overview',
    description: 'Understand dependencies. Follow each result back to exact evidence.',
    emptyTitle: 'Your contract workspace starts here',
    emptyDescription: 'Explore application dependencies, inspect verification evidence, and understand compatibility across exact versions.',
  },
  {
    path: 'applications', label: 'Applications', title: 'Applications',
    description: 'Find applications and the versions behind their contracts.',
    emptyTitle: 'Application versions belong here',
    emptyDescription: 'Registered applications, commit identities, and their declared integrations will appear here when registry browsing is connected.',
  },
  {
    path: 'dependencies', label: 'Dependencies', title: 'Application dependencies',
    description: 'Explore directed consumer and provider relationships.',
    emptyTitle: 'Follow the dependencies',
    emptyDescription: 'Declared and tested dependencies will link to their supporting contracts and verification evidence. These relationships do not represent runtime traces.',
  },
  {
    path: 'contracts', label: 'Contracts', title: 'Contracts',
    description: 'Inspect immutable artifacts and their publication provenance.',
    emptyTitle: 'Every contract has a source',
    emptyDescription: 'Consumer Pacts and provider OpenAPI publications will be available with their exact hashes, source versions, and original downloads.',
  },
  {
    path: 'verifications', label: 'Verifications', title: 'Verification evidence',
    description: 'Trace verification results back to the exact CI execution.',
    emptyTitle: 'Evidence makes the difference',
    emptyDescription: 'Verification reports will show interactions, expected and actual values, and links to the responsible commits and CI runs.',
  },
  {
    path: 'compatibility', label: 'Compatibility', title: 'Compatibility',
    description: 'Inspect decisions for explicit consumer and provider versions.',
    emptyTitle: 'Compatibility needs complete evidence',
    emptyDescription: 'Decisions will show their pinned verification profile, exact version pairs, contract hash, selected CI execution, and any missing checks.',
  },
  {
    path: 'issue-history', label: 'Issue history', title: 'Issue history',
    description: 'Understand when a requirement failed and what proves its fix.',
    emptyTitle: 'Follow an issue to its confirmed fix',
    emptyDescription: 'Comparable verification runs will explain issue transitions. Removing a consumer requirement alone does not establish a provider fix.',
  },
] as const satisfies readonly WorkspaceSection[];
