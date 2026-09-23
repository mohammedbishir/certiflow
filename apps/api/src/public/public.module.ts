import { Module } from '@nestjs/common';
import { CertificatesModule } from '../certificates/certificates.module.js';
import { PublicController } from './public.controller.js';
import { PublicService } from './public.service.js';

@Module({
  imports: [CertificatesModule],
  controllers: [PublicController],
  providers: [PublicService],
})
export class PublicModule {}
