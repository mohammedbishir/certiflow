import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventKind, EventStatus, Placement } from '@prisma/client';
import { randomBytes } from 'crypto';
import { CertificatesService } from '../certificates/certificates.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateEventDto } from './dto/create-event.dto.js';
import { UpdateEventDto } from './dto/update-event.dto.js';

const eventSelect = {
  id: true,
  organizationId: true,
  templateId: true,
  name: true,
  description: true,
  date: true,
  location: true,
  registrationToken: true,
  status: true,
  kind: true,
  createdAt: true,
  updatedAt: true,
  template: {
    select: {
      id: true,
      name: true,
      templateType: true,
      titleText: true,
      isActive: true,
    },
  },
  _count: {
    select: {
      participants: true,
      games: true,
    },
  },
} as const;

@Injectable()
export class EventsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly certificatesService: CertificatesService,
  ) {}

  async findAll(organizationId: string) {
    return this.prisma.event.findMany({
      where: { organizationId },
      select: eventSelect,
      orderBy: { date: 'desc' },
    });
  }

  async findOne(organizationId: string, id: string) {
    const event = await this.prisma.event.findFirst({
      where: { id, organizationId },
      select: eventSelect,
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    // Events without a template cannot stay active for registration.
    if (event.status === EventStatus.ACTIVE && !event.templateId) {
      return this.prisma.event.update({
        where: { id },
        data: { status: EventStatus.INACTIVE },
        select: eventSelect,
      });
    }

    return event;
  }

  async create(organizationId: string, dto: CreateEventDto) {
    if (dto.templateId) {
      await this.assertTemplate(organizationId, dto.templateId);
    }

    const requestedStatus = dto.status ?? EventStatus.INACTIVE;
    if (requestedStatus === EventStatus.ACTIVE && !dto.templateId) {
      throw new BadRequestException(
        'Select a certificate template before activating this event',
      );
    }

    const event = await this.prisma.event.create({
      data: {
        organizationId,
        templateId: dto.templateId,
        name: dto.name,
        description: dto.description,
        date: new Date(dto.date),
        location: dto.location,
        status: requestedStatus,
        kind: dto.kind ?? EventKind.WORKSHOP,
        registrationToken: this.createRegistrationToken(),
      },
      select: eventSelect,
    });

    return {
      message: 'Event created successfully',
      event,
    };
  }

  async update(organizationId: string, id: string, dto: UpdateEventDto) {
    const existing = await this.findOne(organizationId, id);

    if (dto.templateId) {
      await this.assertTemplate(organizationId, dto.templateId);
    }

    const nextTemplateId =
      dto.templateId === undefined ? existing.templateId : dto.templateId;
    const nextStatus = dto.status ?? existing.status;

    if (nextStatus === EventStatus.ACTIVE && !nextTemplateId) {
      throw new BadRequestException(
        'Select a certificate template before activating this event',
      );
    }

    // Removing the template while active closes registration automatically.
    const statusToSave =
      !nextTemplateId && existing.status === EventStatus.ACTIVE
        ? EventStatus.INACTIVE
        : nextStatus;

    const event = await this.prisma.event.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        date: dto.date ? new Date(dto.date) : undefined,
        location: dto.location,
        status: statusToSave,
        kind: dto.kind,
        templateId: dto.templateId === undefined ? undefined : dto.templateId,
      },
      select: eventSelect,
    });

    return {
      message:
        statusToSave === EventStatus.INACTIVE &&
        existing.status === EventStatus.ACTIVE &&
        !nextTemplateId
          ? 'Event updated and deactivated — a certificate template is required for registration'
          : 'Event updated successfully',
      event,
    };
  }

  async remove(organizationId: string, id: string) {
    await this.findOne(organizationId, id);

    await this.prisma.event.delete({
      where: { id },
    });

    return {
      message: 'Event deleted successfully',
    };
  }

  async setStatus(organizationId: string, id: string, status: EventStatus) {
    const existing = await this.findOne(organizationId, id);

    if (status === EventStatus.ACTIVE && !existing.templateId) {
      throw new BadRequestException(
        'Select a certificate template before activating this event',
      );
    }

    const event = await this.prisma.event.update({
      where: { id },
      data: { status },
      select: eventSelect,
    });

    return {
      message:
        status === EventStatus.ACTIVE
          ? 'Event activated successfully'
          : 'Event deactivated successfully',
      event,
    };
  }

  async listParticipants(organizationId: string, eventId: string) {
    await this.findOne(organizationId, eventId);

    return this.prisma.participant.findMany({
      where: { eventId },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async importParticipantsCsv(
    organizationId: string,
    eventId: string,
    csv: string,
  ) {
    const event = await this.findOne(organizationId, eventId);

    if (!event.templateId) {
      throw new BadRequestException(
        'Select a certificate template before importing participants',
      );
    }

    const rows = this.parseParticipantCsv(csv);
    if (rows.length === 0) {
      throw new BadRequestException(
        'CSV has no valid rows. Expected headers: fullName,email,phone',
      );
    }

    if (rows.length > 500) {
      throw new BadRequestException('CSV import is limited to 500 rows');
    }

    const results: Array<{
      row: number;
      email: string;
      status: 'created' | 'skipped' | 'failed';
      message: string;
      certificateNumber?: string;
    }> = [];

    let created = 0;
    let skipped = 0;
    let failed = 0;

    for (const row of rows) {
      try {
        const email = row.email.toLowerCase();
        const existing = await this.prisma.participant.findUnique({
          where: {
            eventId_email: {
              eventId,
              email,
            },
          },
          include: {
            certificates: {
              where: { gameResultId: null },
              select: { certificateNumber: true },
              take: 1,
            },
          },
        });

        if (existing) {
          skipped += 1;
          results.push({
            row: row.row,
            email,
            status: 'skipped',
            message: 'Already registered for this event',
            certificateNumber: existing.certificates[0]?.certificateNumber,
          });
          continue;
        }

        const participant = await this.prisma.participant.create({
          data: {
            eventId,
            fullName: row.fullName,
            email,
            phone: row.phone || null,
          },
        });

        // Sports meets: roster only — certificates come from game results.
        if (event.kind === EventKind.SPORTS_MEET) {
          created += 1;
          results.push({
            row: row.row,
            email,
            status: 'created',
            message: 'Athlete added to roster (no certificate yet)',
          });
          continue;
        }

        const certificate =
          await this.certificatesService.issueForParticipant(participant.id);

        created += 1;
        results.push({
          row: row.row,
          email,
          status: 'created',
          message: 'Participant added and certificate issued',
          certificateNumber: certificate.certificateNumber,
        });
      } catch (error) {
        failed += 1;
        results.push({
          row: row.row,
          email: row.email,
          status: 'failed',
          message:
            error instanceof Error ? error.message : 'Failed to import row',
        });
      }
    }

    return {
      message: `Import finished: ${created} created, ${skipped} skipped, ${failed} failed`,
      summary: { created, skipped, failed, total: rows.length },
      results,
    };
  }

  private parseParticipantCsv(csv: string) {
    const lines = csv
      .replace(/^\uFEFF/, '')
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    if (lines.length < 2) {
      return [];
    }

    const headers = this.splitCsvLine(lines[0]).map((header) =>
      header.trim().toLowerCase().replace(/[\s_-]+/g, ''),
    );

    const fullNameIndex = headers.findIndex((header) =>
      ['fullname', 'name', 'participantname'].includes(header),
    );
    const emailIndex = headers.findIndex((header) => header === 'email');
    const phoneIndex = headers.findIndex((header) =>
      ['phone', 'mobile', 'phonenumber'].includes(header),
    );

    if (fullNameIndex < 0 || emailIndex < 0) {
      throw new BadRequestException(
        'CSV must include fullName (or name) and email columns',
      );
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const rows: Array<{
      row: number;
      fullName: string;
      email: string;
      phone?: string;
    }> = [];

    for (let i = 1; i < lines.length; i += 1) {
      const cells = this.splitCsvLine(lines[i]);
      const fullName = (cells[fullNameIndex] ?? '').trim();
      const email = (cells[emailIndex] ?? '').trim();
      const phone =
        phoneIndex >= 0 ? (cells[phoneIndex] ?? '').trim() : undefined;

      if (!fullName && !email) {
        continue;
      }

      if (fullName.length < 2 || !emailPattern.test(email)) {
        throw new BadRequestException(
          `Invalid data on CSV row ${i + 1}. Need a valid name and email.`,
        );
      }

      rows.push({
        row: i + 1,
        fullName,
        email,
        phone: phone || undefined,
      });
    }

    return rows;
  }

  private splitCsvLine(line: string) {
    const cells: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i += 1) {
      const char = line[i];
      const next = line[i + 1];

      if (char === '"' && inQuotes && next === '"') {
        current += '"';
        i += 1;
        continue;
      }

      if (char === '"') {
        inQuotes = !inQuotes;
        continue;
      }

      if (char === ',' && !inQuotes) {
        cells.push(current);
        current = '';
        continue;
      }

      current += char;
    }

    cells.push(current);
    return cells;
  }

  private async assertTemplate(organizationId: string, templateId: string) {
    const template = await this.prisma.certificateTemplate.findFirst({
      where: { id: templateId, organizationId, isActive: true },
    });

    if (!template) {
      throw new BadRequestException('Invalid or inactive template');
    }
  }

  async listGames(organizationId: string, eventId: string) {
    await this.findOne(organizationId, eventId);
    return this.prisma.eventGame.findMany({
      where: { eventId },
      include: {
        _count: { select: { results: true } },
        results: {
          include: {
            participant: {
              select: { id: true, fullName: true, email: true },
            },
            certificate: {
              select: {
                id: true,
                certificateNumber: true,
                status: true,
              },
            },
          },
          orderBy: { placement: 'asc' },
        },
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async createGame(
    organizationId: string,
    eventId: string,
    dto: { name: string; category?: string; sortOrder?: number },
  ) {
    const event = await this.findOne(organizationId, eventId);
    if (event.kind !== EventKind.SPORTS_MEET) {
      throw new BadRequestException(
        'Games are only available on Sports Meet events',
      );
    }

    const game = await this.prisma.eventGame.create({
      data: {
        eventId,
        name: dto.name.trim(),
        category: dto.category?.trim() || null,
        sortOrder: dto.sortOrder ?? 0,
      },
    });

    return { message: 'Game added', game };
  }

  async updateGame(
    organizationId: string,
    eventId: string,
    gameId: string,
    dto: { name?: string; category?: string | null; sortOrder?: number },
  ) {
    await this.assertGame(organizationId, eventId, gameId);
    const game = await this.prisma.eventGame.update({
      where: { id: gameId },
      data: {
        name: dto.name?.trim(),
        category:
          dto.category === undefined
            ? undefined
            : dto.category?.trim() || null,
        sortOrder: dto.sortOrder,
      },
    });
    return { message: 'Game updated', game };
  }

  async deleteGame(organizationId: string, eventId: string, gameId: string) {
    await this.assertGame(organizationId, eventId, gameId);
    await this.prisma.eventGame.delete({ where: { id: gameId } });
    return { message: 'Game deleted' };
  }

  async upsertGameResult(
    organizationId: string,
    eventId: string,
    gameId: string,
    dto: {
      email: string;
      fullName?: string;
      placement: Placement;
      teamLabel?: string;
      issueCertificate?: boolean;
    },
  ) {
    await this.assertGame(organizationId, eventId, gameId);
    const email = dto.email.toLowerCase().trim();

    let participant = await this.prisma.participant.findUnique({
      where: { eventId_email: { eventId, email } },
    });

    if (!participant) {
      if (!dto.fullName?.trim()) {
        throw new BadRequestException(
          'Athlete not in roster — provide fullName to add them',
        );
      }
      participant = await this.prisma.participant.create({
        data: {
          eventId,
          email,
          fullName: dto.fullName.trim(),
        },
      });
    }

    const result = await this.prisma.gameResult.upsert({
      where: {
        gameId_participantId: {
          gameId,
          participantId: participant.id,
        },
      },
      create: {
        gameId,
        participantId: participant.id,
        placement: dto.placement,
        teamLabel: dto.teamLabel?.trim() || null,
      },
      update: {
        placement: dto.placement,
        teamLabel: dto.teamLabel?.trim() || null,
      },
      include: {
        participant: {
          select: { id: true, fullName: true, email: true },
        },
        certificate: {
          select: { id: true, certificateNumber: true, status: true },
        },
      },
    });

    let certificate = result.certificate;
    if (dto.issueCertificate !== false) {
      certificate = await this.certificatesService.issueForGameResult(result.id, {
        regenerate: Boolean(result.certificate),
      });
    }

    return {
      message: certificate
        ? result.certificate
          ? 'Result updated and certificate re-issued'
          : 'Result saved and certificate issued'
        : 'Result saved',
      result: { ...result, certificate },
      certificate,
    };
  }

  async importGameResultsCsv(
    organizationId: string,
    eventId: string,
    gameId: string,
    csv: string,
  ) {
    await this.assertGame(organizationId, eventId, gameId);
    const rows = this.parseResultCsv(csv);
    if (rows.length === 0) {
      throw new BadRequestException(
        'CSV has no valid rows. Expected: fullName,email,placement (1/2/3 or FIRST/SECOND/THIRD)',
      );
    }

    const summary = { created: 0, failed: 0, total: rows.length };
    const results: Array<{
      row: number;
      email: string;
      status: 'created' | 'failed';
      message: string;
      certificateNumber?: string;
    }> = [];

    for (const row of rows) {
      try {
        const out = await this.upsertGameResult(organizationId, eventId, gameId, {
          email: row.email,
          fullName: row.fullName,
          placement: row.placement,
          teamLabel: row.teamLabel,
          issueCertificate: true,
        });
        summary.created += 1;
        results.push({
          row: row.row,
          email: row.email,
          status: 'created',
          message: out.message,
          certificateNumber: out.certificate?.certificateNumber,
        });
      } catch (error) {
        summary.failed += 1;
        results.push({
          row: row.row,
          email: row.email,
          status: 'failed',
          message: error instanceof Error ? error.message : 'Failed',
        });
      }
    }

    return {
      message: 'Game results import finished',
      summary,
      results,
    };
  }

  private async assertGame(
    organizationId: string,
    eventId: string,
    gameId: string,
  ) {
    await this.findOne(organizationId, eventId);
    const game = await this.prisma.eventGame.findFirst({
      where: { id: gameId, eventId },
    });
    if (!game) {
      throw new NotFoundException('Game not found');
    }
    return game;
  }

  private parseResultCsv(csv: string) {
    const lines = csv
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    if (lines.length < 2) return [];

    const headers = this.splitCsvLine(lines[0]).map((h) =>
      h.trim().toLowerCase(),
    );
    const idx = {
      fullName: headers.findIndex((h) =>
        ['fullname', 'name', 'athlete'].includes(h),
      ),
      email: headers.findIndex((h) => h === 'email'),
      placement: headers.findIndex((h) =>
        ['placement', 'place', 'rank', 'position'].includes(h),
      ),
      teamLabel: headers.findIndex((h) =>
        ['team', 'teamlabel', 'house'].includes(h),
      ),
    };

    if (idx.email < 0 || idx.placement < 0) return [];

    const rows: Array<{
      row: number;
      fullName?: string;
      email: string;
      placement: Placement;
      teamLabel?: string;
    }> = [];

    for (let i = 1; i < lines.length; i++) {
      const cells = this.splitCsvLine(lines[i]);
      const email = (cells[idx.email] || '').trim().toLowerCase();
      const placementRaw = (cells[idx.placement] || '').trim();
      const placement = this.parsePlacement(placementRaw);
      if (!email || !placement) continue;
      rows.push({
        row: i + 1,
        email,
        fullName:
          idx.fullName >= 0 ? cells[idx.fullName]?.trim() : undefined,
        placement,
        teamLabel:
          idx.teamLabel >= 0 ? cells[idx.teamLabel]?.trim() : undefined,
      });
    }
    return rows;
  }

  private parsePlacement(value: string): Placement | null {
    const v = value.trim().toUpperCase();
    if (['1', '1ST', 'FIRST', 'GOLD', 'I'].includes(v)) return Placement.FIRST;
    if (['2', '2ND', 'SECOND', 'SILVER', 'II'].includes(v))
      return Placement.SECOND;
    if (['3', '3RD', 'THIRD', 'BRONZE', 'III'].includes(v))
      return Placement.THIRD;
    return null;
  }

  private createRegistrationToken() {
    return randomBytes(12).toString('hex');
  }
}
