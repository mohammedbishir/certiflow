import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  app.enableCors({
    origin: config.get<string>('CORS_ORIGIN') ?? 'http://localhost:3000',
  });

  const port = config.get<number>('PORT') ?? 3001;
  await app.listen(port);
  console.log(`CertiFlow API running on http://localhost:${port}`);
}
await bootstrap();
