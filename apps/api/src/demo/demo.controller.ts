import { Controller, Post } from '@nestjs/common';
import { RateLimit } from '../common/rate-limit.js';
import { DemoService } from './demo.service.js';

@Controller('auth')
export class DemoController {
  constructor(private readonly demoService: DemoService) {}

  @Post('demo')
  @RateLimit({ name: 'demo', limit: 30, windowMs: 60 * 60_000 })
  login() {
    return this.demoService.login();
  }
}
