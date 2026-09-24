import {
  Body,
  Controller,
  Delete,
  Get,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UserRole } from '@prisma/client';
import { memoryStorage } from 'multer';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import type { AuthUser } from '../auth/types/auth-user.type.js';
import { UpdateOrganizationDto } from './dto/update-organization.dto.js';
import { OrganizationsService } from './organizations.service.js';

@Controller('organizations')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Get('me')
  getMine(@CurrentUser() user: AuthUser) {
    return this.organizationsService.getMine(user.organizationId);
  }

  @Get('me/dashboard')
  getDashboard(@CurrentUser() user: AuthUser) {
    return this.organizationsService.getDashboardStats(user.organizationId);
  }

  @Patch('me')
  @Roles(UserRole.ADMIN)
  updateMine(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateOrganizationDto,
  ) {
    return this.organizationsService.updateMine(user.organizationId, dto);
  }

  @Post('me/logo')
  @Roles(UserRole.ADMIN)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  uploadLogo(
    @CurrentUser() user: AuthUser,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.organizationsService.uploadLogo(user.organizationId, file);
  }

  @Delete('me/logo')
  @Roles(UserRole.ADMIN)
  clearLogo(@CurrentUser() user: AuthUser) {
    return this.organizationsService.clearLogo(user.organizationId);
  }

  @Post('me/signature')
  @Roles(UserRole.ADMIN)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  uploadSignature(
    @CurrentUser() user: AuthUser,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.organizationsService.uploadSignature(
      user.organizationId,
      file,
    );
  }

  @Delete('me/signature')
  @Roles(UserRole.ADMIN)
  clearSignature(@CurrentUser() user: AuthUser) {
    return this.organizationsService.clearSignature(user.organizationId);
  }
}
