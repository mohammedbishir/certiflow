import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { CertificatesModule } from '../certificates/certificates.module.js';
import { DemoController } from './demo.controller.js';
import { DemoService } from './demo.service.js';

/** Public sandbox (DEMO_ENABLED=true): sample school, watermarked certificates, rebuilt daily. */
@Module({
  imports: [AuthModule, CertificatesModule],
  controllers: [DemoController],
  providers: [DemoService],
})
export class DemoModule {}
