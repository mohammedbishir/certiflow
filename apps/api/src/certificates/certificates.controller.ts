import {
  Controller,
  Get,
  Param,
  Patch,
  Res,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import type { Response } from 'express';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import type { AuthUser } from '../auth/types/auth-user.type.js';
import { CertificatesService } from './certificates.service.js';

@Controller()
export class CertificatesController {
  constructor(private readonly certificatesService: CertificatesService) {}

  @Get('public/verify/:code')
  verify(@Param('code') code: string) {
    return this.certificatesService.verify(code);
  }

  @Get('public/certificates/:certificateNumber/download')
  downloadPublic(
    @Param('certificateNumber') certificateNumber: string,
    @Res() res: Response,
  ) {
    return this.certificatesService.downloadByNumber(certificateNumber, res);
  }

  @Get('public/certificates/:certificateNumber')
  getPublic(@Param('certificateNumber') certificateNumber: string) {
    return this.certificatesService.getByNumber(certificateNumber);
  }

  @Get('events/:eventId/certificates')
  @UseGuards(JwtAuthGuard, RolesGuard)
  listByEvent(
    @CurrentUser() user: AuthUser,
    @Param('eventId') eventId: string,
  ) {
    return this.certificatesService.listByEvent(user.organizationId, eventId);
  }

  @Patch('certificates/:id/revoke')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  revoke(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.certificatesService.revoke(user.organizationId, id);
  }

  @Patch('certificates/:id/restore')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  restore(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.certificatesService.restore(user.organizationId, id);
  }
}
