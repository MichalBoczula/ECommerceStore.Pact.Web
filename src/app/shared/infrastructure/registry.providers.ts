import { makeEnvironmentProviders } from '@angular/core';
import { RegistryRepository } from '../../features/registry/domain/registry.repository';
import { KiotaRegistryRepository } from '../../features/registry/infrastructure/kiota-registry.repository';
import { VerificationRepository } from '../../features/verifications/domain/verification.repository';
import { KiotaVerificationRepository } from '../../features/verifications/infrastructure/kiota-verification.repository';

export function provideRegistryReads() {
  return makeEnvironmentProviders([
    { provide: RegistryRepository, useClass: KiotaRegistryRepository },
    { provide: VerificationRepository, useClass: KiotaVerificationRepository },
  ]);
}
