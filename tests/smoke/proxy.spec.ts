import { createServer, Server } from 'node:http';
import { expect, test } from '@playwright/test';

// A transport fixture, not live registry evidence. Real API/Mongo acceptance belongs to WEB/09.
test.describe('Angular same-origin proxy', () => {
  let server: Server;
  const requests: { method?: string; url?: string; host?: string }[] = [];
  const original = Buffer.from('{\n "amount":9007199254740993, "value":null\n}\n');

  test.beforeAll(async () => {
    server = createServer((request, response) => {
      requests.push({ method: request.method, url: request.url, host: request.headers.host });
      if (request.url?.endsWith('/content')) {
        response.writeHead(200, { 'Content-Type': 'application/json' }).end(original);
      } else {
        response.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify({ items: [], nextCursor: null }));
      }
    });
    await new Promise<void>((resolve, reject) => {
      server.once('error', reject);
      server.listen(5198, '127.0.0.1', resolve);
    });
  });
  test.afterAll(async () => {
    if (server) await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  });

  test('removes only /backend, retains /api, query encoding and original bytes', async ({ request }) => {
    const response = await request.get('/backend/api/applications?after=opaque%2F%2B%3D&limit=10');
    expect(response.ok()).toBe(true);
    expect(await response.json()).toEqual({ items: [], nextCursor: null });
    expect(requests[0]).toEqual({ method: 'GET', url: '/api/applications?after=opaque%2F%2B%3D&limit=10', host: '127.0.0.1:5198' });
    const download = await request.get(`/backend/api/artifacts/${'a'.repeat(64)}/content`);
    expect(await download.body()).toEqual(original);
    const app = await request.get('/backendish');
    expect(app.headers()['content-type']).toContain('text/html');
    expect(requests).toHaveLength(2);
  });
});
