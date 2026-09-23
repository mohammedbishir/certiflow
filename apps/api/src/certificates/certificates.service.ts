import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CertificateStatus } from '@prisma/client';
import { randomBytes } from 'crypto';
import { createReadStream, existsSync } from 'fs';
import type { Response } from 'express';
import { PrismaService } from '../prisma/prisma.service.js';
import { PdfService } from '../pdf/pdf.service.js';

@Injectable()
export class CertificatesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pdfService: PdfService,
  ) {}

  async issueForParticipant(participantId: string) {
    const existing = await this.prisma.certificate.findUnique({
      where: { participantId },
    });
    if (existing) {
      return existing;
    }

    const participant = await this.prisma.participant.findUnique({
      where: { id: participantId },
      include: {
        event: {
          include: {
            organization: true,
            template: true,
          },
        },
      },
    });

    if (!participant) {
      throw new NotFoundException('Participant not found');
    }

    const certificateNumber = await this.createCertificateNumber();
    const verificationToken = randomBytes(16).toString('hex');
    const template = participant.event.template;

    const pdfPath = await this.pdfService.generateCertificatePdf({
      certificateNumber,
      verificationToken,
      participantName: participant.fullName,
      eventName: participant.event.name,
      eventDate: participant.event.date,
      eventLocation: participant.event.location,
      organizationName: participant.event.organization.name,
      signatoryName: participant.event.organization.signatoryName,
      signatoryDesignation:
        participant.event.organization.signatoryDesignation,
      titleText: template?.titleText ?? 'Certificate of Participation',
      subtitleText: template?.subtitleText ?? 'This is to certify that',
      bodyText: template?.bodyText ?? 'has successfully participated in',
    });

    return this.prisma.certificate.create({
      data: {
        certificateNumber,
        verificationToken,
        pdfPath,
        eventId: participant.eventId,
        participantId: participant.id,
      },
    });
  }

  async getByNumber(certificateNumber: string) {
    const certificate = await this.prisma.certificate.findUnique({
      where: { certificateNumber },
      include: {
        participant: {
          select: {
            fullName: true,
            email: true,
          },
        },
        event: {
          select: {
            name: true,
            date: true,
            location: true,
            organization: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    if (!certificate) {
      throw new NotFoundException('Certificate not found');
    }

    return certificate;
  }

  async verify(code: string) {
    const certificate = code.startsWith('CERT-')
      ? await this.prisma.certificate.findUnique({
          where: { certificateNumber: code },
          include: this.verifyInclude,
        })
      : await this.prisma.certificate.findUnique({
          where: { verificationToken: code },
          include: this.verifyInclude,
        });

    if (!certificate) {
      throw new NotFoundException('Certificate not found or invalid');
    }

    return {
      valid: certificate.status === 'VALID',
      status: certificate.status,
      certificateNumber: certificate.certificateNumber,
      issuedAt: certificate.issuedAt,
      participantName: certificate.participant.fullName,
      eventName: certificate.event.name,
      eventDate: certificate.event.date,
      eventLocation: certificate.event.location,
      organizationName: certificate.event.organization.name,
      downloadUrl: `/public/certificates/${certificate.certificateNumber}/download`,
    };
  }

  private readonly verifyInclude = {
    participant: {
      select: {
        fullName: true,
      },
    },
    event: {
      select: {
        name: true,
        date: true,
        location: true,
        organization: {
          select: {
            name: true,
          },
        },
      },
    },
  } as const;

  async downloadByNumber(certificateNumber: string, res: Response) {
    const certificate = await this.getByNumber(certificateNumber);

    if (certificate.status === CertificateStatus.REVOKED) {
      throw new BadRequestException(
        'This certificate has been revoked and cannot be downloaded',
      );
    }

    if (!existsSync(certificate.pdfPath)) {
      throw new NotFoundException('Certificate file not found');
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${certificate.certificateNumber}.pdf"`,
    );

    createReadStream(certificate.pdfPath).pipe(res);
  }

  async listByEvent(organizationId: string, eventId: string) {
    const event = await this.prisma.event.findFirst({
      where: { id: eventId, organizationId },
    });
    if (!event) {
      throw new NotFoundException('Event not found');
    }

    return this.prisma.certificate.findMany({
      where: { eventId },
      include: {
        participant: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
      orderBy: { issuedAt: 'desc' },
    });
  }

  async revoke(organizationId: string, certificateId: string) {
    const certificate = await this.findOrgCertificate(
      organizationId,
      certificateId,
    );

    if (certificate.status === CertificateStatus.REVOKED) {
      throw new BadRequestException('Certificate is already revoked');
    }

    const updated = await this.prisma.certificate.update({
      where: { id: certificate.id },
      data: { status: CertificateStatus.REVOKED },
    });

    return {
      message: 'Certificate revoked',
      certificate: updated,
    };
  }

  async restore(organizationId: string, certificateId: string) {
    const certificate = await this.findOrgCertificate(
      organizationId,
      certificateId,
    );

    if (certificate.status === CertificateStatus.VALID) {
      throw new BadRequestException('Certificate is already valid');
    }

    const updated = await this.prisma.certificate.update({
      where: { id: certificate.id },
      data: { status: CertificateStatus.VALID },
    });

    return {
      message: 'Certificate restored',
      certificate: updated,
    };
  }

  private async findOrgCertificate(
    organizationId: string,
    certificateId: string,
  ) {
    const certificate = await this.prisma.certificate.findFirst({
      where: {
        id: certificateId,
        event: { organizationId },
      },
    });

    if (!certificate) {
      throw new NotFoundException('Certificate not found');
    }

    return certificate;
  }

  private async createCertificateNumber() {
    const year = new Date().getFullYear();
    const count = await this.prisma.certificate.count({
      where: {
        certificateNumber: {
          startsWith: `CERT-${year}-`,
        },
      },
    });
    const next = String(count + 1).padStart(6, '0');
    return `CERT-${year}-${next}`;
  }
}
