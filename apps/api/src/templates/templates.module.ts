import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { PdfModule } from '../pdf/pdf.module.js';
import { TemplatesController } from './templates.controller.js';
import { TemplatesService } from './templates.service.js';

@Module({
  imports: [AuthModule, PdfModule],
  controllers: [TemplatesController],
  providers: [TemplatesService],
  exports: [TemplatesService],
})
export class TemplatesModule {}
