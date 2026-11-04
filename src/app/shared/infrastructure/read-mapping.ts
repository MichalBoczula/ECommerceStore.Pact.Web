import { UntypedNode } from '@microsoft/kiota-abstractions';
import { Page } from '../../features/registry/domain/registry.models';
import { RegistryError } from '../domain/registry-error';

export function invalidResponse(): never {
  throw new RegistryError('invalid-response', 'The registry returned an invalid response.');
}

export function text(value: unknown): string {
  return typeof value === 'string' ? value : invalidResponse();
}

export function optionalText(value: unknown): string | null {
  return value == null ? null : text(value);
}

export function boolean(value: unknown): boolean {
  return typeof value === 'boolean' ? value : invalidResponse();
}

export function timestamp(value: Date | null | undefined): string {
  return value instanceof Date && Number.isFinite(value.getTime()) ? value.toISOString() : invalidResponse();
}

export function count(node: UntypedNode | null | undefined): number {
  const raw = node?.getValue();
  // ASP.NET's OpenAPI describes integer|string. Never truncate, round or default missing counts to zero.
  const value = typeof raw === 'string' && /^\d+$/.test(raw) ? Number(raw) : raw;
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : invalidResponse();
}

export function page<T, U>(dto: { items?: T[] | null; nextCursor?: string | null }, map: (item: T) => U): Page<U> {
  if (!Array.isArray(dto.items)) return invalidResponse();
  return { items: dto.items.map(map), nextCursor: optionalText(dto.nextCursor) };
}

/** Kiota represents ASP.NET's integer|string query unions as strings. */
export function pageQuery(request: { limit?: number; after?: string }): { limit: string | undefined; after: string | undefined } {
  if (request.limit !== undefined && (!Number.isInteger(request.limit) || request.limit < 1 || request.limit > 100)) {
    throw new RegistryError('validation', 'Page size must be an integer from 1 to 100.');
  }
  return { limit: request.limit?.toString(), after: request.after };
}
