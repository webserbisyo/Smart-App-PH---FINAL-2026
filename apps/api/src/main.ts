import 'reflect-metadata';
import helmet from 'helmet';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module.js';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT') ?? 4000;
  const corsOriginsRaw =
    configService.get<string>('CORS_ORIGINS') ?? 'http://localhost:3000,http://localhost:5173';
  const corsOrigins = corsOriginsRaw.split(',').map((origin) => origin.trim());

  app.use(helmet());
  app.enableCors({
    origin: corsOrigins,
    credentials: true,
  });

  await app.listen(port);
}

void bootstrap();
