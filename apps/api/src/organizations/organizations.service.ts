import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { mkdir, unlink, writeFile } from 'fs/promises';
import path from 'path';
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

const ALLOWED_BRAND_MIME = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/svg+xml',
]);

@Injectable()
export class OrganizationsService {
  constructor(private readonly prisma: PrismaService) {}

  getOrgUploadDir() {
    return path.join(process.cwd(), 'uploads', 'organizations');
  }

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

  async uploadLogo(organizationId: string, file?: Express.Multer.File) {
    const url = await this.saveBrandFile(organizationId, file, 'logo');
    const current = await this.getMine(organizationId);
    await this.deleteUploadFile(current.logo);

    const organization = await this.prisma.organization.update({
      where: { id: organizationId },
      data: { logo: url },
      select: organizationSelect,
    });

    return {
      message: 'Logo uploaded successfully',
      organization,
    };
  }

  async clearLogo(organizationId: string) {
    const current = await this.getMine(organizationId);
    await this.deleteUploadFile(current.logo);

    const organization = await this.prisma.organization.update({
      where: { id: organizationId },
      data: { logo: null },
      select: organizationSelect,
    });

    return {
      message: 'Logo removed',
      organization,
    };
  }

  async uploadSignature(organizationId: string, file?: Express.Multer.File) {
    const url = await this.saveBrandFile(organizationId, file, 'signature');
    const current = await this.getMine(organizationId);
    await this.deleteUploadFile(current.signatureUrl);

    const organization = await this.prisma.organization.update({
      where: { id: organizationId },
      data: { signatureUrl: url },
      select: organizationSelect,
    });

    return {
      message: 'Signature uploaded successfully',
      organization,
    };
  }

  async clearSignature(organizationId: string) {
    const current = await this.getMine(organizationId);
    await this.deleteUploadFile(current.signatureUrl);

    const organization = await this.prisma.organization.update({
      where: { id: organizationId },
      data: { signatureUrl: null },
      select: organizationSelect,
    });

    return {
      message: 'Signature removed',
      organization,
    };
  }

  private async saveBrandFile(
    organizationId: string,
    file: Express.Multer.File | undefined,
    kind: 'logo' | 'signature',
  ) {
    if (!file) {
      throw new BadRequestException('Image file is required');
    }

    if (!ALLOWED_BRAND_MIME.has(file.mimetype)) {
      throw new BadRequestException(
        'Only PNG, JPG, WEBP, or SVG files are allowed',
      );
    }

    const dir = this.getOrgUploadDir();
    await mkdir(dir, { recursive: true });

    const extension = this.extensionForMime(file.mimetype);
    const fileName = `${organizationId.slice(0, 8)}-${kind}-${Date.now()}${extension}`;
    await writeFile(path.join(dir, fileName), file.buffer);

    return `/uploads/organizations/${fileName}`;
  }

  private extensionForMime(mime: string) {
    if (mime === 'image/png') return '.png';
    if (mime === 'image/webp') return '.webp';
    if (mime === 'image/svg+xml') return '.svg';
    return '.jpg';
  }

  private async deleteUploadFile(fileUrl?: string | null) {
    if (!fileUrl?.startsWith('/uploads/organizations/')) {
      return;
    }

    const absolutePath = path.join(
      process.cwd(),
      fileUrl.replace(/^\//, ''),
    );

    try {
      await unlink(absolutePath);
    } catch {
      // File may already be missing.
    }
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
