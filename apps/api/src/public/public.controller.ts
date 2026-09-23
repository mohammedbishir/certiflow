import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { RegisterParticipantDto } from './dto/register-participant.dto.js';
import { PublicService } from './public.service.js';

@Controller('public')
export class PublicController {
  constructor(private readonly publicService: PublicService) {}

  @Get('events/:token')
  getEvent(@Param('token') token: string) {
    return this.publicService.getEventByToken(token);
  }

  @Post('events/:token/register')
  register(
    @Param('token') token: string,
    @Body() dto: RegisterParticipantDto,
  ) {
    return this.publicService.register(token, dto);
  }
}
