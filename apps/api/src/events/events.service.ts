import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventStatus } from '@prisma/client';
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
            certificate: {
              select: { certificateNumber: true },
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
            certificateNumber: existing.certificate?.certificateNumber,
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

  private createRegistrationToken() {
    return randomBytes(12).toString('hex');
  }
}
