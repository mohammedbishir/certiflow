import { ForbiddenException } from '@nestjs/common';
import { OrganizationStatus } from '@prisma/client';

type OrgAccess = { status: OrganizationStatus; isDemo: boolean };

export function canIssueCertificates(org: OrgAccess) {
  return org.isDemo || org.status === OrganizationStatus.APPROVED;
}

export function assertCanIssueCertificates(org: OrgAccess) {
  if (canIssueCertificates(org)) return;
  if (org.status === OrganizationStatus.REJECTED) {
    throw new ForbiddenException(
      'Your organization was not approved, so it cannot publish events or issue certificates.',
    );
  }
  throw new ForbiddenException(
    'Your organization is awaiting approval. Events and certificates unlock once it is approved.',
  );
}

export function assertNotDemo(org: { isDemo: boolean }) {
  if (org.isDemo) {
    throw new ForbiddenException('This is turned off in the demo.');
  }
}
