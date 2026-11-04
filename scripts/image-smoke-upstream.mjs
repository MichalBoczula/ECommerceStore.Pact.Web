// Synthetic HTTP server for the production image boundary; never bundled or published.
import { createServer } from 'node:http';

let requests = 0;
createServer((request, response) => {
  requests++;
  response.setHeader('Cache-Control', 'public, max-age=999');
  response.setHeader('Set-Cookie', 'upstream-smoke=blocked; HttpOnly');
  if (request.url === '/api/artifact') {
    response.setHeader('Content-Type', 'application/json');
    response.end('{"exact":9007199254740993,"nullable":null,"text":"żółć"}\r\n');
  } else if (request.url === '/api/unavailable') {
    response.writeHead(503, { 'Content-Type': 'application/problem+json' });
    response.end('{"status":503,"code":"registry_unavailable"}');
  } else {
    response.setHeader('Content-Type', 'application/json');
    response.end(JSON.stringify({ method: request.method, path: request.url, headers: request.headers, requests }));
  }
}).listen(8080, '0.0.0.0');
