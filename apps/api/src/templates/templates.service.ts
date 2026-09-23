import { Injectable, NotFoundException } from '@nestjs/common';
import { TemplateType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateTemplateDto } from './dto/create-template.dto.js';
import { UpdateTemplateDto } from './dto/update-template.dto.js';

const templateSelect = {
  id: true,
  organizationId: true,
  name: true,
  templateType: true,
  backgroundUrl: true,
  titleText: true,
  subtitleText: true,
  bodyText: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class TemplatesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(organizationId: string) {
    return this.prisma.certificateTemplate.findMany({
      where: { organizationId },
      select: templateSelect,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findActive(organizationId: string) {
    return this.prisma.certificateTemplate.findMany({
      where: { organizationId, isActive: true },
      select: templateSelect,
      orderBy: { name: 'asc' },
    });
  }

  async findOne(organizationId: string, id: string) {
    const template = await this.prisma.certificateTemplate.findFirst({
      where: { id, organizationId },
      select: templateSelect,
    });

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    return template;
  }

  async create(organizationId: string, dto: CreateTemplateDto) {
    const template = await this.prisma.certificateTemplate.create({
      data: {
        organizationId,
        name: dto.name,
        templateType: dto.templateType ?? TemplateType.PARTICIPATION,
        backgroundUrl: dto.backgroundUrl,
        titleText: dto.titleText ?? 'Certificate of Participation',
        subtitleText: dto.subtitleText ?? 'This is to certify that',
        bodyText: dto.bodyText ?? 'has successfully participated in',
        isActive: dto.isActive ?? true,
      },
      select: templateSelect,
    });

    return {
      message: 'Template created successfully',
      template,
    };
  }

  async update(organizationId: string, id: string, dto: UpdateTemplateDto) {
    await this.findOne(organizationId, id);

    const template = await this.prisma.certificateTemplate.update({
      where: { id },
      data: {
        name: dto.name,
        templateType: dto.templateType,
        backgroundUrl: dto.backgroundUrl,
        titleText: dto.titleText,
        subtitleText: dto.subtitleText,
        bodyText: dto.bodyText,
        isActive: dto.isActive,
      },
      select: templateSelect,
    });

    return {
      message: 'Template updated successfully',
      template,
    };
  }

  async remove(organizationId: string, id: string) {
    await this.findOne(organizationId, id);

    await this.prisma.certificateTemplate.delete({
      where: { id },
    });

    return {
      message: 'Template deleted successfully',
    };
  }

  async ensureDefaults(organizationId: string) {
    const count = await this.prisma.certificateTemplate.count({
      where: { organizationId },
    });

    if (count > 0) {
      return this.findAll(organizationId);
    }

    const defaults = [
      {
        name: 'Workshop Participation',
        templateType: TemplateType.PARTICIPATION,
        titleText: 'Certificate of Participation',
        subtitleText: 'This is to certify that',
        bodyText: 'has successfully participated in',
      },
      {
        name: 'Course Completion',
        templateType: TemplateType.COMPLETION,
        titleText: 'Certificate of Completion',
        subtitleText: 'This is to certify that',
        bodyText: 'has successfully completed',
      },
      {
        name: 'Achievement Award',
        templateType: TemplateType.ACHIEVEMENT,
        titleText: 'Certificate of Achievement',
        subtitleText: 'This is to certify that',
        bodyText: 'has demonstrated outstanding achievement in',
      },
    ];

    await this.prisma.certificateTemplate.createMany({
      data: defaults.map((item) => ({
        organizationId,
        ...item,
      })),
    });

    return this.findAll(organizationId);
  }
}
