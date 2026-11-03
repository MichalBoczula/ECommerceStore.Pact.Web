import { AnonymousAuthenticationProvider } from '@microsoft/kiota-abstractions';
import { FetchRequestAdapter, HttpClient } from '@microsoft/kiota-http-fetchlibrary';
import { createPactApiClient } from './api-clients/pact/pactApiClient';

/** Loaded on the first read, so shell-only navigation does not download the SDK. */
export function createReadClient(baseUrl: string, perform: (url: string, init: RequestInit) => Promise<Response>) {
  // A single terminal middleware avoids implicit retry/redirect policies for this anonymous boundary.
  const http = new HttpClient(perform, { next: undefined, execute: perform });
  const adapter = new FetchRequestAdapter(new AnonymousAuthenticationProvider(), undefined, undefined, http);
  adapter.baseUrl = baseUrl;
  return createPactApiClient(adapter);
}
