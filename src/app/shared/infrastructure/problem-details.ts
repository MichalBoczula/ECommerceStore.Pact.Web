import { RegistryError } from '../domain/registry-error';

export function object(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

export function problemError(status: number, body: unknown): RegistryError {
  const problem = object(body);
  const traceId = typeof problem?.['traceId'] === 'string' ? problem['traceId'] : null;
  const errors = object(problem?.['errors']);
  const validation = Object.fromEntries(Object.entries(errors ?? {}).flatMap(([key, messages]) =>
    Array.isArray(messages) && messages.every(message => typeof message === 'string') ? [[key, messages as string[]]] : []));

  if (status === 400 || status === 422) {
    return new RegistryError('validation', 'The registry rejected the request.', status, traceId, validation);
  }
  if (status === 404) return new RegistryError('not-found', 'The requested registry record was not found.', status, traceId);
  if (status === 503 || status === 502 || status === 504) {
    return new RegistryError('unavailable', 'The registry is currently unavailable.', status, traceId);
  }
  return new RegistryError('service', 'The registry could not complete the request.', status, traceId);
}
