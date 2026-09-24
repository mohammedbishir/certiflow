import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UserRole } from '@prisma/client';
import type { Response } from 'express';
import { createReadStream } from 'fs';
import { memoryStorage } from 'multer';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import type { AuthUser } from '../auth/types/auth-user.type.js';
import { CreateTemplateDto } from './dto/create-template.dto.js';
import { PreviewTemplateDto } from './dto/preview-template.dto.js';
import { UpdateTemplateDto } from './dto/update-template.dto.js';
import { TemplatesService } from './templates.service.js';

@Controller('templates')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TemplatesController {
  constructor(private readonly templatesService: TemplatesService) {}

  @Get()
  findAll(@CurrentUser() user: AuthUser) {
    return this.templatesService.findAll(user.organizationId);
  }

  @Get('active')
  findActive(@CurrentUser() user: AuthUser) {
    return this.templatesService.findActive(user.organizationId);
  }

  @Post('seed-defaults')
  @Roles(UserRole.ADMIN)
  seedDefaults(@CurrentUser() user: AuthUser) {
    return this.templatesService.ensureDefaults(user.organizationId);
  }

  @Post('design-assets')
  @Roles(UserRole.ADMIN)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  uploadDesignAsset(
    @CurrentUser() user: AuthUser,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.templatesService.uploadDesignAsset(
      user.organizationId,
      file,
    );
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.templatesService.findOne(user.organizationId, id);
  }

  @Post()
  @Roles(UserRole.ADMIN)
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateTemplateDto) {
    return this.templatesService.create(user.organizationId, dto);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateTemplateDto,
  ) {
    return this.templatesService.update(user.organizationId, id, dto);
  }

  @Post(':id/background')
  @Roles(UserRole.ADMIN)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  uploadBackground(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.templatesService.uploadBackground(
      user.organizationId,
      id,
      file,
    );
  }

  @Delete(':id/background')
  @Roles(UserRole.ADMIN)
  clearBackground(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.templatesService.clearBackground(user.organizationId, id);
  }

  @Post(':id/pdf')
  @Roles(UserRole.ADMIN)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 15 * 1024 * 1024 },
    }),
  )
  uploadPdf(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.templatesService.uploadTemplatePdf(
      user.organizationId,
      id,
      file,
    );
  }

  @Delete(':id/pdf')
  @Roles(UserRole.ADMIN)
  clearPdf(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.templatesService.clearTemplatePdf(user.organizationId, id);
  }

  @Post(':id/preview')
  @Roles(UserRole.ADMIN)
  async preview(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: PreviewTemplateDto,
    @Res() res: Response,
  ) {
    const pdfPath = await this.templatesService.previewCertificate(
      user.organizationId,
      id,
      dto,
    );

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="preview-${id}.pdf"`,
    );
    createReadStream(pdfPath).pipe(res);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.templatesService.remove(user.organizationId, id);
  }
}
