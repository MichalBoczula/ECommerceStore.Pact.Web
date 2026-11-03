import { DOCUMENT } from '@angular/common';
import { inject, Injectable, InjectionToken } from '@angular/core';
import { parse } from 'lossless-json';
import { Observable } from 'rxjs';
import { RegistryError } from '../domain/registry-error';
import type { PactApiClient } from './api-clients/pact/pactApiClient';
import { problemError } from './problem-details';
import { invalidResponse } from './read-mapping';

export const PACT_FETCH = new InjectionToken<typeof fetch>('Pact fetch', { providedIn: 'root', factory: () => globalThis.fetch.bind(globalThis) });

/** One adapter and AbortController per subscription: concurrent reads never share response state. */
@Injectable({ providedIn: 'root' })
export class PactTransport {
  private readonly fetch = inject(PACT_FETCH);
  private readonly origin = inject(DOCUMENT).location.origin;

  read<T, U>(request: (api: PactApiClient) => Promise<T | undefined>, map: (dto: T, raw: unknown) => U, diagnostics = false): Observable<U> {
    return new Observable(subscriber => {
      const controller = new AbortController();
      let response: Response | undefined;
      let raw: unknown;
      const perform = async (url: string, init: RequestInit): Promise<Response> => {
        const address = new URL(url, this.origin);
        const headers = new Headers(init.headers);
        if (address.origin !== this.origin || !address.pathname.startsWith('/backend/api/') ||
          init.method !== 'GET' || headers.has('authorization') || headers.has('proxy-authorization') || headers.has('cookie')) {
          return invalidResponse();
        }
        response = await this.fetch(address.href, {
          ...init, headers, credentials: 'omit', redirect: 'error', cache: 'no-store', signal: controller.signal,
        });
        if (!response.ok) {
          let problem: unknown;
          if (response.headers.get('content-type')?.includes('json')) {
            try { problem = await response.clone().json(); } catch { /* Invalid error body gets the same safe error. */ }
          }
          throw problemError(response.status, problem);
        }
        if (diagnostics) raw = parse(await response.clone().text());
        return response;
      };
      import('./pact-client').then(({ createReadClient }) => {
        if (subscriber.closed) return undefined;
        return request(createReadClient(`${this.origin}/backend`, perform));
      }).then(dto => {
        if (subscriber.closed) return;
        if (dto === undefined) return invalidResponse();
        subscriber.next(map(dto, raw));
        subscriber.complete();
      }).catch((error: unknown) => {
        if (subscriber.closed) return;
        subscriber.error(error instanceof RegistryError ? error : response ?
          new RegistryError('invalid-response', 'The registry returned an invalid response.', response.status) :
          new RegistryError('network', 'The registry could not be reached.'));
      });
      return () => controller.abort();
    });
  }
}
