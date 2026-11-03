import { Page } from '@playwright/test';

// Controlled transport fixtures only. These are never bundled into application assets.
export const consumerCommit = 'ab'.repeat(20);
export const otherCommit = 'ef'.repeat(20);
export const providerCommit = '12'.repeat(20);
export const contractHash = 'cd'.repeat(32);
export const providerHash = '34'.repeat(32);
export const publicationId = 'd6f2a36b-f87d-4e51-810b-b58368fa08e7';
export const providerPublicationId = 'e8df3223-76db-4963-a0a8-74d21c86c469';
export const versionId = '86cae4b2-3cfb-45e6-bb73-5c464c6fa5b3';
const date = '2026-11-03T10:30:00.000Z';
export const originalContent = '{\n  "amount": 9007199254740993,\n  "memo": "<script>text only</script>",\n  "nullable": null\n}\n';
export const cursor = 'opaque+/=&?cursor';
export const sourceVersion = { id: versionId, applicationId: 'payments', commitSha: consumerCommit, repositoryUrl: 'https://github.com/example/payments', imageDigest: `sha256:${'56'.repeat(32)}`, registeredAt: date };
export const providerVersion = { ...sourceVersion, id: 'bb864dd4-218f-4eaf-9ef8-ec493bde6cd7', applicationId: 'invoice', commitSha: providerCommit, repositoryUrl: 'https://github.com/example/invoice', imageDigest: null };
export const declaration = { id: providerPublicationId, consumerApplicationId: 'payments', providerApplicationId: 'invoice', registeredAt: date };
export const consumerPublication = { id: publicationId, bindingId: providerPublicationId, sourceVersionId: versionId, artifactSha256: contractHash, kind: 'ConsumerPact', specificationVersion: '3', sourceApplicationId: 'payments', commitSha: consumerCommit, consumerApplicationId: 'payments', providerApplicationId: 'invoice', sourceRef: 'refs/heads/feature/a + b', buildUrl: 'https://ci.example.test/runs/123', publisherId: 'payments-ci', repositoryUrl: sourceVersion.repositoryUrl, publishedAt: date };
export const providerPublication = { ...consumerPublication, id: providerPublicationId, sourceVersionId: providerVersion.id, artifactSha256: providerHash, kind: 'ProviderOpenApi', specificationVersion: '3.1.1', sourceApplicationId: 'invoice', commitSha: providerCommit, consumerApplicationId: null, repositoryUrl: providerVersion.repositoryUrl };

export async function registryFixture(page: Page): Promise<string[]> {
  const requests: string[] = [];
  await page.route('**/backend/api/**', async route => {
    const request = route.request();
    requests.push(request.url());
    if (request.method() !== 'GET' || request.headers()['authorization']) throw new Error('Explorer must make anonymous reads.');
    const { pathname, searchParams: q } = new URL(request.url());
    const path = pathname.replace('/backend/api', '');
    const reply = (value: unknown) => route.fulfill({ json: value });
    const paged = (items: unknown[], nextCursor: string | null = null) => reply({ items, nextCursor });
    if (path === '/applications') {
      if (q.has('after')) return paged([{ applicationId: 'wallet', versionCount: 1 }]);
      const apps = [{ applicationId: 'payments', versionCount: 2 }, { applicationId: 'invoice', versionCount: 1 }].filter(app => !q.get('search') || app.applicationId.startsWith(q.get('search')!));
      return paged(apps, q.has('search') ? null : cursor);
    }
    if (path === '/applications/payments/versions') return paged([sourceVersion, { ...sourceVersion, id: providerPublicationId, commitSha: otherCommit, imageDigest: null }]);
    if (path === '/applications/invoice/versions') return paged([providerVersion]);
    if (path === `/applications/payments/versions/${consumerCommit}`) return reply(sourceVersion);
    if (path === `/applications/invoice/versions/${providerCommit}`) return reply(providerVersion);
    if (path === '/integrations') return paged([declaration]);
    if (path === '/integrations/payments/invoice') return reply(declaration);
    if (path === '/contract-publications') {
      return paged([consumerPublication, providerPublication].filter(publication => ['sourceApplicationId', 'commitSha', 'consumerApplicationId', 'providerApplicationId', 'kind', 'sourceRef'].every(key => !q.get(key) || publication[key as keyof typeof publication] === q.get(key)) && (!q.get('contractSha256') || publication.artifactSha256 === q.get('contractSha256'))));
    }
    if (path === `/contract-publications/${publicationId}`) return reply(consumerPublication);
    if (path === `/contract-publications/${providerPublicationId}`) return reply(providerPublication);
    if (path === `/artifacts/${contractHash}/content` || path === `/artifacts/${providerHash}/content`) return route.fulfill({ contentType: 'application/json', body: originalContent });
    if (path === `/artifacts/${contractHash}` || path === `/artifacts/${providerHash}`) return reply({ sha256: path.slice('/artifacts/'.length), kind: path.includes(providerHash) ? 'ProviderOpenApi' : 'ConsumerPact', specificationVersion: path.includes(providerHash) ? '3.1.1' : '3', length: Buffer.byteLength(originalContent), storedAt: date });
    return route.fulfill({ status: 404, contentType: 'application/problem+json', body: JSON.stringify({ title: 'Not found', traceId: 'fixture-not-found' }) });
  });
  return requests;
}
