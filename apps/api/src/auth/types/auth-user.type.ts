import type { UserRole } from '@prisma/client';

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  organizationId: string;
};

export type AuthTokenPayload = {
  sub: string;
  email: string;
  role: UserRole;
  organizationId: string;
  type: 'access' | 'refresh';
};
