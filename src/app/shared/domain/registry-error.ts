export type RegistryErrorKind = 'validation' | 'not-found' | 'unavailable' | 'service' | 'network' | 'invalid-response';

/** A presentation-safe error. Raw responses and internal exception text stay outside the domain. */
export class RegistryError extends Error {
  constructor(
    readonly kind: RegistryErrorKind,
    message: string,
    readonly status: number | null = null,
    readonly traceId: string | null = null,
    readonly validation: Readonly<Record<string, readonly string[]>> = {},
  ) {
    super(message);
    this.name = 'RegistryError';
  }
}
