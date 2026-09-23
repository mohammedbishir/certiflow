import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { PdfModule } from '../pdf/pdf.module.js';
import { CertificatesController } from './certificates.controller.js';
import { CertificatesService } from './certificates.service.js';

@Module({
  imports: [AuthModule, PdfModule],
  controllers: [CertificatesController],
  providers: [CertificatesService],
  exports: [CertificatesService],
})
export class CertificatesModule {}
