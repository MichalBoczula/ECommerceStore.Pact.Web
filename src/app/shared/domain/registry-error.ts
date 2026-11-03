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

/** Plain serializable failure state, shared by read features. */
export interface RegistryFailure {
  readonly kind: RegistryErrorKind;
  readonly message: string;
  readonly traceId: string | null;
  readonly validation: Readonly<Record<string, readonly string[]>>;
}

export function registryFailure(error: unknown): RegistryFailure {
  return error instanceof RegistryError
    ? { kind: error.kind, message: error.message, traceId: error.traceId, validation: error.validation }
    : { kind: 'service', message: 'The registry request could not be completed.', traceId: null, validation: {} };
}
