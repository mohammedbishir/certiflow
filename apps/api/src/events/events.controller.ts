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
import { CreateGameDto } from './dto/create-game.dto.js';
import { ImportParticipantsDto } from './dto/import-participants.dto.js';
import { UpdateEventDto } from './dto/update-event.dto.js';
import { UpsertGameResultDto } from './dto/upsert-game-result.dto.js';
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

  @Post(':id/participants/import')
  @Roles(UserRole.ADMIN)
  importParticipants(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: ImportParticipantsDto,
  ) {
    return this.eventsService.importParticipantsCsv(
      user.organizationId,
      id,
      dto.csv,
    );
  }

  @Get(':id/games')
  listGames(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.eventsService.listGames(user.organizationId, id);
  }

  @Post(':id/games')
  @Roles(UserRole.ADMIN)
  createGame(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: CreateGameDto,
  ) {
    return this.eventsService.createGame(user.organizationId, id, dto);
  }

  @Patch(':id/games/:gameId')
  @Roles(UserRole.ADMIN)
  updateGame(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('gameId') gameId: string,
    @Body() dto: CreateGameDto,
  ) {
    return this.eventsService.updateGame(user.organizationId, id, gameId, dto);
  }

  @Delete(':id/games/:gameId')
  @Roles(UserRole.ADMIN)
  deleteGame(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('gameId') gameId: string,
  ) {
    return this.eventsService.deleteGame(user.organizationId, id, gameId);
  }

  @Post(':id/games/:gameId/results')
  @Roles(UserRole.ADMIN)
  upsertResult(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('gameId') gameId: string,
    @Body() dto: UpsertGameResultDto,
  ) {
    return this.eventsService.upsertGameResult(
      user.organizationId,
      id,
      gameId,
      dto,
    );
  }

  @Post(':id/games/:gameId/results/import')
  @Roles(UserRole.ADMIN)
  importResults(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('gameId') gameId: string,
    @Body() dto: ImportParticipantsDto,
  ) {
    return this.eventsService.importGameResultsCsv(
      user.organizationId,
      id,
      gameId,
      dto.csv,
    );
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
