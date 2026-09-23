import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { UpdateOrganizationDto } from './dto/update-organization.dto.js';

const organizationSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  logo: true,
  website: true,
  signatoryName: true,
  signatoryDesignation: true,
  signatureUrl: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class OrganizationsService {
  constructor(private readonly prisma: PrismaService) {}

  async getMine(organizationId: string) {
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: organizationSelect,
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    return organization;
  }

  async updateMine(organizationId: string, dto: UpdateOrganizationDto) {
    if (dto.email) {
      const existing = await this.prisma.organization.findFirst({
        where: {
          email: dto.email,
          NOT: { id: organizationId },
        },
      });

      if (existing) {
        throw new ConflictException('Organization email is already in use');
      }
    }

    const organization = await this.prisma.organization.update({
      where: { id: organizationId },
      data: {
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        logo: dto.logo,
        website: dto.website,
        signatoryName: dto.signatoryName,
        signatoryDesignation: dto.signatoryDesignation,
        signatureUrl: dto.signatureUrl,
      },
      select: organizationSelect,
    });

    return {
      message: 'Organization updated successfully',
      organization,
    };
  }

  async getDashboardStats(organizationId: string) {
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { id: true, name: true },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    const [
      eventsTotal,
      eventsActive,
      participantsTotal,
      certificatesTotal,
      certificatesValid,
      certificatesRevoked,
      templatesActive,
      recentEvents,
    ] = await Promise.all([
      this.prisma.event.count({ where: { organizationId } }),
      this.prisma.event.count({
        where: { organizationId, status: 'ACTIVE' },
      }),
      this.prisma.participant.count({
        where: { event: { organizationId } },
      }),
      this.prisma.certificate.count({
        where: { event: { organizationId } },
      }),
      this.prisma.certificate.count({
        where: {
          event: { organizationId },
          status: 'VALID',
        },
      }),
      this.prisma.certificate.count({
        where: {
          event: { organizationId },
          status: 'REVOKED',
        },
      }),
      this.prisma.certificateTemplate.count({
        where: { organizationId, isActive: true },
      }),
      this.prisma.event.findMany({
        where: { organizationId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          name: true,
          date: true,
          status: true,
          location: true,
          _count: {
            select: {
              participants: true,
              certificates: true,
            },
          },
        },
      }),
    ]);

    return {
      organization,
      counts: {
        eventsTotal,
        eventsActive,
        participantsTotal,
        certificatesTotal,
        certificatesValid,
        certificatesRevoked,
        templatesActive,
      },
      recentEvents,
    };
  }
}
