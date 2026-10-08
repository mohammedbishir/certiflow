import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OrganizationStatus } from '@prisma/client';
import type { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service.js';
import type { AuthUser } from './types/auth-user.type.js';

function platformAdminEmails(config: ConfigService) {
  return (config.get<string>('PLATFORM_ADMIN_EMAILS') ?? '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * The platform owner reviews new organizations. The email must be listed in
 * PLATFORM_ADMIN_EMAILS *and* belong to an already-approved organization, so
 * nobody can claim the role by signing up first with the owner's address.
 */
export function isPlatformAdmin(
  config: ConfigService,
  user: { email: string; organization: { status: OrganizationStatus; isDemo: boolean } },
) {
  return (
    platformAdminEmails(config).includes(user.email.toLowerCase()) &&
    user.organization.status === OrganizationStatus.APPROVED &&
    !user.organization.isDemo
  );
}

@Injectable()
export class PlatformAdminGuard implements CanActivate {
  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: AuthUser }>();
    if (!request.user) throw new ForbiddenException('Access denied');

    const user = await this.prisma.user.findUnique({
      where: { id: request.user.id },
      select: {
        email: true,
        organization: { select: { status: true, isDemo: true } },
      },
    });
    if (!user || !isPlatformAdmin(this.config, user)) {
      throw new ForbiddenException('Platform owner access only');
    }
    return true;
  }
}
