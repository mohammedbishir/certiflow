import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EventStatus, OrganizationStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class PlatformService {
  constructor(private readonly prisma: PrismaService) {}

  listOrganizations(status?: OrganizationStatus) {
    return this.prisma.organization.findMany({
      where: { isDemo: false, ...(status ? { status } : {}) },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        website: true,
        status: true,
        reviewedAt: true,
        createdAt: true,
        users: {
          select: { name: true, email: true },
          orderBy: { createdAt: 'asc' },
          take: 1,
        },
        _count: { select: { events: true, templates: true } },
      },
    });
  }

  async setStatus(
    id: string,
    status: OrganizationStatus,
    reviewerOrganizationId: string,
  ) {
    if (id === reviewerOrganizationId && status !== OrganizationStatus.APPROVED) {
      throw new BadRequestException("You can't reject your own organization");
    }
    const organization = await this.prisma.organization.findUnique({
      where: { id },
      select: { id: true, isDemo: true },
    });
    if (!organization) throw new NotFoundException('Organization not found');
    if (organization.isDemo) {
      throw new BadRequestException('The demo organization cannot be reviewed');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      // A rejected org must not keep live registration links.
      if (status === OrganizationStatus.REJECTED) {
        await tx.event.updateMany({
          where: { organizationId: id, status: EventStatus.ACTIVE },
          data: { status: EventStatus.INACTIVE },
        });
      }
      return tx.organization.update({
        where: { id },
        data: { status, reviewedAt: new Date() },
        select: { id: true, name: true, status: true, reviewedAt: true },
      });
    });

    return {
      message:
        status === OrganizationStatus.APPROVED
          ? `${updated.name} approved`
          : `${updated.name} rejected`,
      organization: updated,
    };
  }
}
