import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventStatus, Prisma } from '@prisma/client';
import { CertificatesService } from '../certificates/certificates.service.js';
import { canIssueCertificates } from '../organizations/org-access.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { RegisterParticipantDto } from './dto/register-participant.dto.js';

@Injectable()
export class PublicService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly certificatesService: CertificatesService,
  ) {}

  async getEventByToken(token: string) {
    const event = await this.prisma.event.findUnique({
      where: { registrationToken: token },
      select: {
        id: true,
        name: true,
        description: true,
        date: true,
        location: true,
        status: true,
        kind: true,
        templateId: true,
        organization: {
          select: {
            name: true,
            logo: true,
            status: true,
            isDemo: true,
          },
        },
      },
    });

    if (!event) {
      throw new NotFoundException('Registration link is invalid');
    }

    if (!event.templateId) {
      throw new BadRequestException(
        'Registration is not open yet — a certificate template has not been selected',
      );
    }

    if (
      event.status !== EventStatus.ACTIVE ||
      !canIssueCertificates(event.organization)
    ) {
      throw new BadRequestException('Registration is closed for this event');
    }

    return {
      id: event.id,
      name: event.name,
      description: event.description,
      date: event.date,
      location: event.location,
      kind: event.kind,
      organizationName: event.organization.name,
      organizationLogo: event.organization.logo,
      isDemo: event.organization.isDemo,
    };
  }

  async register(token: string, dto: RegisterParticipantDto) {
    const event = await this.prisma.event.findUnique({
      where: { registrationToken: token },
      select: {
        id: true,
        name: true,
        status: true,
        kind: true,
        templateId: true,
        organization: { select: { status: true, isDemo: true } },
      },
    });

    if (!event) {
      throw new NotFoundException('Registration link is invalid');
    }

    if (!event.templateId) {
      throw new BadRequestException(
        'Registration is not open yet — a certificate template has not been selected',
      );
    }

    if (
      event.status !== EventStatus.ACTIVE ||
      !canIssueCertificates(event.organization)
    ) {
      throw new BadRequestException('Registration is closed for this event');
    }

    const existing = await this.prisma.participant.findUnique({
      where: {
        eventId_email: {
          eventId: event.id,
          email: dto.email.toLowerCase(),
        },
      },
    });

    if (existing) {
      throw new ConflictException(
        'You are already registered for this event with this email',
      );
    }

    const participant = await this.prisma.participant
      .create({
        data: {
          eventId: event.id,
          fullName: dto.fullName.trim(),
          email: dto.email.toLowerCase().trim(),
          phone: dto.phone?.trim() || null,
        },
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
          createdAt: true,
        },
      })
      .catch((error: unknown) => {
        // Double submit: the unique (eventId, email) index wins the race.
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002'
        ) {
          throw new ConflictException(
            'You are already registered for this event with this email',
          );
        }
        throw error;
      });

    if (event.kind === 'SPORTS_MEET') {
      return {
        message:
          'Registered for the sports meet. Certificates are issued after game results (1st / 2nd / 3rd).',
        participant,
        event: {
          id: event.id,
          name: event.name,
        },
        certificate: null,
      };
    }

    const certificate = await this.certificatesService
      .issueForParticipant(participant.id)
      .catch(async (error: unknown) => {
        // Let the person retry instead of being stuck as "already registered".
        await this.prisma.participant
          .delete({ where: { id: participant.id } })
          .catch(() => undefined);
        throw error;
      });

    return {
      message: 'Registration successful',
      participant,
      event: {
        id: event.id,
        name: event.name,
      },
      certificate: {
        certificateNumber: certificate.certificateNumber,
        downloadUrl: `/public/certificates/${certificate.certificateNumber}/download`,
      },
    };
  }
}
