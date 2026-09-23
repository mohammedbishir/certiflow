import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventStatus } from '@prisma/client';
import { randomBytes } from 'crypto';
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
  constructor(private readonly prisma: PrismaService) {}

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

    return event;
  }

  async create(organizationId: string, dto: CreateEventDto) {
    if (dto.templateId) {
      await this.assertTemplate(organizationId, dto.templateId);
    }

    const event = await this.prisma.event.create({
      data: {
        organizationId,
        templateId: dto.templateId,
        name: dto.name,
        description: dto.description,
        date: new Date(dto.date),
        location: dto.location,
        status: dto.status ?? EventStatus.ACTIVE,
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
    await this.findOne(organizationId, id);

    if (dto.templateId) {
      await this.assertTemplate(organizationId, dto.templateId);
    }

    const event = await this.prisma.event.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        date: dto.date ? new Date(dto.date) : undefined,
        location: dto.location,
        status: dto.status,
        templateId: dto.templateId === undefined ? undefined : dto.templateId,
      },
      select: eventSelect,
    });

    return {
      message: 'Event updated successfully',
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
    await this.findOne(organizationId, id);

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
