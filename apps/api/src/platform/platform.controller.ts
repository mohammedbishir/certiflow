import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { OrganizationStatus } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { PlatformAdminGuard } from '../auth/platform-admin.js';
import type { AuthUser } from '../auth/types/auth-user.type.js';
import { PlatformService } from './platform.service.js';

@Controller('platform')
@UseGuards(JwtAuthGuard, PlatformAdminGuard)
export class PlatformController {
  constructor(private readonly platformService: PlatformService) {}

  @Get('organizations')
  list(@Query('status') status?: string) {
    if (
      status &&
      !Object.values(OrganizationStatus).includes(status as OrganizationStatus)
    ) {
      throw new BadRequestException('Invalid status filter');
    }
    return this.platformService.listOrganizations(
      status as OrganizationStatus | undefined,
    );
  }

  @Patch('organizations/:id/approve')
  approve(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.platformService.setStatus(
      id,
      OrganizationStatus.APPROVED,
      user.organizationId,
    );
  }

  @Patch('organizations/:id/reject')
  reject(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.platformService.setStatus(
      id,
      OrganizationStatus.REJECTED,
      user.organizationId,
    );
  }
}
