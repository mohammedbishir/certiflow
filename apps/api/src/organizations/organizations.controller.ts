import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
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
}
