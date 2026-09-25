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
    const existing = await this.prisma.certificate.findFirst({
      where: { participantId, gameResultId: null },
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

    // Sports meets issue placement certificates via results — not on roster add.
    if (participant.event.kind === 'SPORTS_MEET') {
      throw new BadRequestException(
        'Sports meet certificates are issued from game results (1st / 2nd / 3rd)',
      );
    }

    const template = participant.event.template;
    if (!template) {
      throw new BadRequestException(
        'Select a certificate template before issuing certificates',
      );
    }

    return this.createCertificateRecord({
      participant,
      template,
      gameName: null,
      placementLabel: null,
      teamLabel: null,
      gameResultId: null,
    });
  }

  async issueForGameResult(
    gameResultId: string,
    options?: { regenerate?: boolean },
  ) {
    const existing = await this.prisma.certificate.findUnique({
      where: { gameResultId },
    });
    if (existing && !options?.regenerate) {
      return existing;
    }

    const result = await this.prisma.gameResult.findUnique({
      where: { id: gameResultId },
      include: {
        participant: true,
        game: {
          include: {
            template: true,
            event: {
              include: {
                organization: true,
                template: true,
              },
            },
          },
        },
      },
    });

    if (!result) {
      throw new NotFoundException('Game result not found');
    }

    const template = result.game.template ?? result.game.event.template;
    if (!template) {
      throw new BadRequestException(
        'Select a certificate template on the event (or this game) before issuing',
      );
    }

    const payload = {
      participant: {
        id: result.participant.id,
        fullName: result.participant.fullName,
        eventId: result.game.eventId,
        event: result.game.event,
      },
      template,
      gameName: result.game.name,
      placementLabel: this.placementLabel(result.placement),
      teamLabel: result.teamLabel,
      gameResultId: result.id,
    };

    // Edit place/team: keep same cert #, rebuild PDF
    if (existing) {
      return this.regenerateCertificateRecord(existing, payload);
    }

    return this.createCertificateRecord(payload);
  }

  private placementLabel(placement: 'FIRST' | 'SECOND' | 'THIRD') {
    if (placement === 'FIRST') return '1st Place';
    if (placement === 'SECOND') return '2nd Place';
    return '3rd Place';
  }

  private async regenerateCertificateRecord(
    existing: {
      id: string;
      certificateNumber: string;
      verificationToken: string;
      pdfPath: string;
    },
    args: {
      participant: {
        id: string;
        fullName: string;
        eventId: string;
        event: {
          name: string;
          date: Date;
          location: string | null;
          organization: {
            name: string;
            signatoryName: string | null;
            signatoryDesignation: string | null;
          };
        };
      };
      template: {
        titleText: string;
        subtitleText: string | null;
        bodyText: string | null;
        backgroundUrl: string | null;
        templatePdfUrl: string | null;
        designJson: unknown;
        nameXPercent: number;
        nameYPercent: number;
        nameFontSize: number;
        nameColor: string;
      };
      gameName: string | null;
      placementLabel: string | null;
      teamLabel: string | null;
      gameResultId: string | null;
    },
  ) {
    const { participant, template } = args;
    const pdfPath = await this.pdfService.generateCertificatePdf({
      certificateNumber: existing.certificateNumber,
      verificationToken: existing.verificationToken,
      participantName: participant.fullName,
      eventName: participant.event.name,
      eventDate: participant.event.date,
      eventLocation: participant.event.location,
      organizationName: participant.event.organization.name,
      signatoryName: participant.event.organization.signatoryName,
      signatoryDesignation:
        participant.event.organization.signatoryDesignation,
      titleText: template.titleText,
      subtitleText: template.subtitleText ?? 'This is to certify that',
      bodyText: template.bodyText ?? 'has successfully participated in',
      backgroundUrl: template.backgroundUrl,
      templatePdfUrl: template.templatePdfUrl,
      designJson: template.designJson,
      nameXPercent: template.nameXPercent,
      nameYPercent: template.nameYPercent,
      nameFontSize: template.nameFontSize,
      nameColor: template.nameColor,
      gameName: args.gameName,
      placementLabel: args.placementLabel,
      teamLabel: args.teamLabel,
    });

    return this.prisma.certificate.update({
      where: { id: existing.id },
      data: {
        pdfPath,
        issuedAt: new Date(),
        status: CertificateStatus.VALID,
      },
    });
  }

  private async createCertificateRecord(args: {
    participant: {
      id: string;
      fullName: string;
      eventId: string;
      event: {
        name: string;
        date: Date;
        location: string | null;
        organization: {
          name: string;
          signatoryName: string | null;
          signatoryDesignation: string | null;
        };
      };
    };
    template: {
      titleText: string;
      subtitleText: string | null;
      bodyText: string | null;
      backgroundUrl: string | null;
      templatePdfUrl: string | null;
      designJson: unknown;
      nameXPercent: number;
      nameYPercent: number;
      nameFontSize: number;
      nameColor: string;
    };
    gameName: string | null;
    placementLabel: string | null;
    teamLabel: string | null;
    gameResultId: string | null;
  }) {
    const { participant, template } = args;
    const certificateNumber = await this.createCertificateNumber();
    const verificationToken = randomBytes(16).toString('hex');

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
      titleText: template.titleText,
      subtitleText: template.subtitleText ?? 'This is to certify that',
      bodyText: template.bodyText ?? 'has successfully participated in',
      backgroundUrl: template.backgroundUrl,
      templatePdfUrl: template.templatePdfUrl,
      designJson: template.designJson,
      nameXPercent: template.nameXPercent,
      nameYPercent: template.nameYPercent,
      nameFontSize: template.nameFontSize,
      nameColor: template.nameColor,
      gameName: args.gameName,
      placementLabel: args.placementLabel,
      teamLabel: args.teamLabel,
    });

    return this.prisma.certificate.create({
      data: {
        certificateNumber,
        verificationToken,
        pdfPath,
        eventId: participant.eventId,
        participantId: participant.id,
        gameResultId: args.gameResultId,
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
        gameResult: {
          select: {
            id: true,
            placement: true,
            teamLabel: true,
            game: {
              select: {
                id: true,
                name: true,
                category: true,
              },
            },
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

  /**
   * Admin edit: update name/email (and sports place/team), then rebuild PDF.
   * Certificate number stays the same.
   */
  async update(
    organizationId: string,
    certificateId: string,
    dto: {
      fullName?: string;
      email?: string;
      placement?: 'FIRST' | 'SECOND' | 'THIRD';
      teamLabel?: string | null;
    },
  ) {
    const certificate = await this.prisma.certificate.findFirst({
      where: {
        id: certificateId,
        event: { organizationId },
      },
      include: {
        participant: true,
        gameResult: true,
        event: {
          include: {
            organization: true,
            template: true,
          },
        },
      },
    });

    if (!certificate) {
      throw new NotFoundException('Certificate not found');
    }

    if (
      (dto.placement !== undefined || dto.teamLabel !== undefined) &&
      !certificate.gameResultId
    ) {
      throw new BadRequestException(
        'Placement and team can only be edited on sports place certificates',
      );
    }

    if (dto.fullName?.trim() || dto.email) {
      const email = dto.email?.toLowerCase().trim();
      if (email && email !== certificate.participant.email) {
        const clash = await this.prisma.participant.findFirst({
          where: {
            eventId: certificate.eventId,
            email,
            NOT: { id: certificate.participantId },
          },
        });
        if (clash) {
          throw new BadRequestException(
            'Another participant already uses this email on this event',
          );
        }
      }

      await this.prisma.participant.update({
        where: { id: certificate.participantId },
        data: {
          fullName: dto.fullName?.trim() || undefined,
          email: email || undefined,
        },
      });
    }

    if (certificate.gameResultId) {
      if (dto.placement !== undefined || dto.teamLabel !== undefined) {
        await this.prisma.gameResult.update({
          where: { id: certificate.gameResultId },
          data: {
            placement: dto.placement,
            teamLabel:
              dto.teamLabel === undefined
                ? undefined
                : dto.teamLabel?.trim() || null,
          },
        });
      }

      const updated = await this.issueForGameResult(certificate.gameResultId, {
        regenerate: true,
      });

      return {
        message: 'Certificate updated',
        certificate: await this.getEditableCertificate(
          organizationId,
          updated.id,
        ),
      };
    }

    // Workshop / participation certificate — rebuild PDF with new name
    const participant = await this.prisma.participant.findUniqueOrThrow({
      where: { id: certificate.participantId },
      include: {
        event: {
          include: {
            organization: true,
            template: true,
          },
        },
      },
    });

    const template = participant.event.template;
    if (!template) {
      throw new BadRequestException(
        'Event has no certificate template — cannot rebuild PDF',
      );
    }

    const rebuilt = await this.regenerateCertificateRecord(certificate, {
      participant: {
        id: participant.id,
        fullName: participant.fullName,
        eventId: participant.eventId,
        event: participant.event,
      },
      template,
      gameName: null,
      placementLabel: null,
      teamLabel: null,
      gameResultId: null,
    });

    return {
      message: 'Certificate updated',
      certificate: await this.getEditableCertificate(
        organizationId,
        rebuilt.id,
      ),
    };
  }

  private async getEditableCertificate(
    organizationId: string,
    certificateId: string,
  ) {
    const certificate = await this.prisma.certificate.findFirst({
      where: {
        id: certificateId,
        event: { organizationId },
      },
      include: {
        participant: {
          select: { id: true, fullName: true, email: true },
        },
        gameResult: {
          select: {
            id: true,
            placement: true,
            teamLabel: true,
            game: {
              select: { id: true, name: true, category: true },
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
