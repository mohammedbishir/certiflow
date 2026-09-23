import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, TemplateType } from '@prisma/client';
import { mkdir, unlink, writeFile } from 'fs/promises';
import path from 'path';
import { PrismaService } from '../prisma/prisma.service.js';
import { PdfService } from '../pdf/pdf.service.js';
import { CreateTemplateDto } from './dto/create-template.dto.js';
import { PreviewTemplateDto } from './dto/preview-template.dto.js';
import { UpdateTemplateDto } from './dto/update-template.dto.js';

const templateSelect = {
  id: true,
  organizationId: true,
  name: true,
  templateType: true,
  backgroundUrl: true,
  templatePdfUrl: true,
  nameXPercent: true,
  nameYPercent: true,
  nameFontSize: true,
  nameColor: true,
  designJson: true,
  titleText: true,
  subtitleText: true,
  bodyText: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const;

const ALLOWED_IMAGE_MIME = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
]);

@Injectable()
export class TemplatesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pdfService: PdfService,
  ) {}

  getTemplatesUploadDir() {
    return path.join(process.cwd(), 'uploads', 'templates');
  }

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
        nameXPercent: dto.nameXPercent,
        nameYPercent: dto.nameYPercent,
        nameFontSize: dto.nameFontSize,
        nameColor: dto.nameColor,
        designJson: dto.designJson as Prisma.InputJsonValue | undefined,
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
        nameXPercent: dto.nameXPercent,
        nameYPercent: dto.nameYPercent,
        nameFontSize: dto.nameFontSize,
        nameColor: dto.nameColor,
        designJson: dto.designJson as Prisma.InputJsonValue | undefined,
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
    const template = await this.findOne(organizationId, id);
    await this.deleteUploadFile(template.backgroundUrl);
    await this.deleteUploadFile(template.templatePdfUrl);

    await this.prisma.certificateTemplate.delete({
      where: { id },
    });

    return {
      message: 'Template deleted successfully',
    };
  }

  async uploadBackground(
    organizationId: string,
    id: string,
    file?: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Background image file is required');
    }

    if (!ALLOWED_IMAGE_MIME.has(file.mimetype)) {
      throw new BadRequestException(
        'Only PNG, JPG, or WEBP images are allowed',
      );
    }

    const template = await this.findOne(organizationId, id);
    const dir = this.getTemplatesUploadDir();
    await mkdir(dir, { recursive: true });

    const extension = this.extensionForImageMime(file.mimetype);
    const fileName = `${organizationId.slice(0, 8)}-${id}-${Date.now()}${extension}`;
    await writeFile(path.join(dir, fileName), file.buffer);
    await this.deleteUploadFile(template.backgroundUrl);

    const backgroundUrl = `/uploads/templates/${fileName}`;
    const updated = await this.prisma.certificateTemplate.update({
      where: { id },
      data: { backgroundUrl },
      select: templateSelect,
    });

    return {
      message: 'Background image uploaded successfully',
      template: updated,
    };
  }

  async clearBackground(organizationId: string, id: string) {
    const template = await this.findOne(organizationId, id);
    await this.deleteUploadFile(template.backgroundUrl);

    const updated = await this.prisma.certificateTemplate.update({
      where: { id },
      data: { backgroundUrl: null },
      select: templateSelect,
    });

    return {
      message: 'Background image removed',
      template: updated,
    };
  }

  async uploadTemplatePdf(
    organizationId: string,
    id: string,
    file?: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Template PDF file is required');
    }

    if (file.mimetype !== 'application/pdf') {
      throw new BadRequestException('Only PDF files are allowed');
    }

    const template = await this.findOne(organizationId, id);
    const dir = this.getTemplatesUploadDir();
    await mkdir(dir, { recursive: true });

    const fileName = `${organizationId.slice(0, 8)}-${id}-${Date.now()}.pdf`;
    await writeFile(path.join(dir, fileName), file.buffer);
    await this.deleteUploadFile(template.templatePdfUrl);

    const templatePdfUrl = `/uploads/templates/${fileName}`;
    const updated = await this.prisma.certificateTemplate.update({
      where: { id },
      data: { templatePdfUrl },
      select: templateSelect,
    });

    return {
      message: 'Designer PDF template uploaded successfully',
      template: updated,
    };
  }

  async clearTemplatePdf(organizationId: string, id: string) {
    const template = await this.findOne(organizationId, id);
    await this.deleteUploadFile(template.templatePdfUrl);

    const updated = await this.prisma.certificateTemplate.update({
      where: { id },
      data: { templatePdfUrl: null },
      select: templateSelect,
    });

    return {
      message: 'Designer PDF template removed',
      template: updated,
    };
  }

  async previewCertificate(
    organizationId: string,
    id: string,
    dto: PreviewTemplateDto,
  ) {
    const template = await this.findOne(organizationId, id);
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        name: true,
        signatoryName: true,
        signatoryDesignation: true,
      },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    const sampleName = dto.sampleName?.trim() || 'Recipient Name';
    const pdfPath = await this.pdfService.generateCertificatePdf({
      certificateNumber: `PREVIEW-${id.slice(-6).toUpperCase()}`,
      verificationToken: `preview-${id}`,
      participantName: sampleName,
      eventName: 'Sample Event Preview',
      eventDate: new Date(),
      eventLocation: 'Preview',
      organizationName: organization.name,
      signatoryName: organization.signatoryName,
      signatoryDesignation: organization.signatoryDesignation,
      titleText: template.titleText,
      subtitleText: template.subtitleText ?? 'This is to certify that',
      bodyText: template.bodyText ?? 'has successfully participated in',
      backgroundUrl: template.backgroundUrl,
      templatePdfUrl: template.templatePdfUrl,
      designJson: template.designJson,
      nameXPercent: dto.nameXPercent ?? template.nameXPercent,
      nameYPercent: dto.nameYPercent ?? template.nameYPercent,
      nameFontSize: dto.nameFontSize ?? template.nameFontSize,
      nameColor: dto.nameColor ?? template.nameColor,
    });

    return pdfPath;
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

  private extensionForImageMime(mime: string) {
    if (mime === 'image/png') return '.png';
    if (mime === 'image/webp') return '.webp';
    return '.jpg';
  }

  private async deleteUploadFile(fileUrl?: string | null) {
    if (!fileUrl?.startsWith('/uploads/templates/')) {
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
}
