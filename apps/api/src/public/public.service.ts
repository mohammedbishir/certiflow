import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventStatus } from '@prisma/client';
import { CertificatesService } from '../certificates/certificates.service.js';
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
        organization: {
          select: {
            name: true,
            logo: true,
          },
        },
      },
    });

    if (!event) {
      throw new NotFoundException('Registration link is invalid');
    }

    if (event.status !== EventStatus.ACTIVE) {
      throw new BadRequestException('Registration is closed for this event');
    }

    return {
      id: event.id,
      name: event.name,
      description: event.description,
      date: event.date,
      location: event.location,
      organizationName: event.organization.name,
      organizationLogo: event.organization.logo,
    };
  }

  async register(token: string, dto: RegisterParticipantDto) {
    const event = await this.prisma.event.findUnique({
      where: { registrationToken: token },
      select: {
        id: true,
        name: true,
        status: true,
      },
    });

    if (!event) {
      throw new NotFoundException('Registration link is invalid');
    }

    if (event.status !== EventStatus.ACTIVE) {
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

    const participant = await this.prisma.participant.create({
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
    });

    const certificate = await this.certificatesService.issueForParticipant(
      participant.id,
    );

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
