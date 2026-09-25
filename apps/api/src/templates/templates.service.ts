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

const ALLOWED_DESIGN_ASSET_MIME = new Set([
  ...ALLOWED_IMAGE_MIME,
  'image/svg+xml',
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

  getDesignAssetsUploadDir() {
    return path.join(process.cwd(), 'uploads', 'design-assets');
  }

  async listDesignAssets(organizationId: string, category?: string) {
    return this.prisma.designAsset.findMany({
      where: {
        organizationId,
        ...(category && category !== 'all' ? { category } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async uploadDesignAsset(
    organizationId: string,
    file?: Express.Multer.File,
    options?: {
      name?: string;
      category?: string;
      removeBg?: boolean;
    },
  ) {
    if (!file) {
      throw new BadRequestException('Image file is required');
    }

    if (!ALLOWED_DESIGN_ASSET_MIME.has(file.mimetype)) {
      throw new BadRequestException(
        'Only PNG, JPG, WEBP, or SVG images are allowed',
      );
    }

    const category = this.normalizeAssetCategory(options?.category);
    const removeBg = Boolean(options?.removeBg) && file.mimetype !== 'image/svg+xml';
    const originalName =
      options?.name?.trim() ||
      path.parse(file.originalname || 'asset').name ||
      'Uploaded asset';

    const dir = this.getDesignAssetsUploadDir();
    await mkdir(dir, { recursive: true });

    let buffer: Buffer = file.buffer;
    let extension = this.extensionForImageMime(file.mimetype);

    if (removeBg) {
      buffer = await this.removeImageBackground(file.buffer);
      extension = '.png';
    } else if (file.mimetype !== 'image/svg+xml') {
      // Normalize raster uploads to PNG for consistent designer use
      try {
        const sharp = (await import('sharp')).default;
        buffer = await sharp(file.buffer).png().toBuffer();
        extension = '.png';
      } catch {
        // keep original buffer
      }
    }

    const fileName = `${organizationId.slice(0, 8)}-${Date.now()}${extension}`;
    await writeFile(path.join(dir, fileName), buffer);
    const url = `/uploads/design-assets/${fileName}`;

    const asset = await this.prisma.designAsset.create({
      data: {
        organizationId,
        name: originalName.slice(0, 80),
        category,
        url,
        removeBg,
      },
    });

    return {
      message: removeBg
        ? 'Shape uploaded with background removed'
        : 'Image saved to your library',
      asset,
      url: asset.url,
    };
  }

  async deleteDesignAsset(organizationId: string, assetId: string) {
    const asset = await this.prisma.designAsset.findFirst({
      where: { id: assetId, organizationId },
    });
    if (!asset) {
      throw new NotFoundException('Design asset not found');
    }

    await this.deleteUploadFile(asset.url);
    await this.prisma.designAsset.delete({ where: { id: asset.id } });

    return { message: 'Asset removed from library' };
  }

  private normalizeAssetCategory(value?: string) {
    const allowed = new Set(['seals', 'shapes', 'signatures', 'other']);
    const next = (value || 'seals').toLowerCase().trim();
    return allowed.has(next) ? next : 'seals';
  }

  /**
   * Approximate background removal: sample corner colors and clear similar
   * pixels to transparent so seals/shapes sit cleanly on certificates.
   */
  private async removeImageBackground(input: Buffer): Promise<Buffer> {
    const sharp = (await import('sharp')).default;
    const { data, info } = await sharp(input)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const { width, height, channels } = info;
    if (channels < 4) {
      return sharp(input).png().toBuffer();
    }

    const idx = (x: number, y: number) => (y * width + x) * channels;
    const sample = (x: number, y: number) => {
      const i = idx(
        Math.min(width - 1, Math.max(0, x)),
        Math.min(height - 1, Math.max(0, y)),
      );
      return [data[i], data[i + 1], data[i + 2]] as const;
    };

    const corners = [
      sample(2, 2),
      sample(width - 3, 2),
      sample(2, height - 3),
      sample(width - 3, height - 3),
      sample(Math.floor(width / 2), 2),
      sample(2, Math.floor(height / 2)),
    ];

    const bgR = Math.round(corners.reduce((s, c) => s + c[0], 0) / corners.length);
    const bgG = Math.round(corners.reduce((s, c) => s + c[1], 0) / corners.length);
    const bgB = Math.round(corners.reduce((s, c) => s + c[2], 0) / corners.length);

    // Near-white / sampled background tolerance
    const hard = 38;
    const soft = 72;

    for (let i = 0; i < data.length; i += channels) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const dist = Math.sqrt(
        (r - bgR) ** 2 + (g - bgG) ** 2 + (b - bgB) ** 2,
      );
      const nearWhite = r > 235 && g > 235 && b > 235;

      if (dist <= hard || nearWhite) {
        data[i + 3] = 0;
      } else if (dist < soft) {
        const t = (dist - hard) / (soft - hard);
        data[i + 3] = Math.round(data[i + 3] * t);
      }
    }

    return sharp(data, {
      raw: { width, height, channels: 4 },
    })
      .png()
      .toBuffer();
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
    const eventDate = dto.eventDate ? new Date(dto.eventDate) : new Date();
    const pdfPath = await this.pdfService.generateCertificatePdf({
      certificateNumber: `PREVIEW-${id.slice(-6).toUpperCase()}`,
      verificationToken: `preview-${id}`,
      participantName: sampleName,
      eventName: dto.eventName?.trim() || template.titleText || 'Event',
      eventDate: Number.isNaN(eventDate.getTime()) ? new Date() : eventDate,
      eventLocation: dto.eventLocation?.trim() || undefined,
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
    // Full visual designs are seeded from the web client (designJson).
    return this.findAll(organizationId);
  }

  private extensionForImageMime(mime: string) {
    if (mime === 'image/png') return '.png';
    if (mime === 'image/webp') return '.webp';
    if (mime === 'image/svg+xml') return '.svg';
    return '.jpg';
  }

  private async deleteUploadFile(fileUrl?: string | null) {
    if (
      !fileUrl?.startsWith('/uploads/templates/') &&
      !fileUrl?.startsWith('/uploads/design-assets/')
    ) {
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
