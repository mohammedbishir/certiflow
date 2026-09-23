import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { EventStatus, UserRole } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import type { AuthUser } from '../auth/types/auth-user.type.js';
import { CreateEventDto } from './dto/create-event.dto.js';
import { UpdateEventDto } from './dto/update-event.dto.js';
import { EventsService } from './events.service.js';

@Controller('events')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Get()
  findAll(@CurrentUser() user: AuthUser) {
    return this.eventsService.findAll(user.organizationId);
  }

  @Get(':id/participants')
  listParticipants(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.eventsService.listParticipants(user.organizationId, id);
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.eventsService.findOne(user.organizationId, id);
  }

  @Post()
  @Roles(UserRole.ADMIN)
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateEventDto) {
    return this.eventsService.create(user.organizationId, dto);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateEventDto,
  ) {
    return this.eventsService.update(user.organizationId, id, dto);
  }

  @Patch(':id/activate')
  @Roles(UserRole.ADMIN)
  activate(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.eventsService.setStatus(
      user.organizationId,
      id,
      EventStatus.ACTIVE,
    );
  }

  @Patch(':id/deactivate')
  @Roles(UserRole.ADMIN)
  deactivate(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.eventsService.setStatus(
      user.organizationId,
      id,
      EventStatus.INACTIVE,
    );
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.eventsService.remove(user.organizationId, id);
  }
}
