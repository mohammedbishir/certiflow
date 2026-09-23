import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const corsOrigin =
    config.get<string>('CORS_ORIGIN') ?? 'http://localhost:3000';
  app.enableCors({
    origin: corsOrigin.includes(',')
      ? corsOrigin.split(',').map((value) => value.trim())
      : corsOrigin,
  });

  const port = config.get<number>('PORT') ?? 3001;
  await app.listen(port, '0.0.0.0');
  console.log(`CertiFlow API running on http://0.0.0.0:${port}`);
}
await bootstrap();
