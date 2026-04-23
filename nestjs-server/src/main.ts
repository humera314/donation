import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import * as express from 'express';
import { AppModule } from './app.module';
import { configService } from "./config/configService";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bodyParser: false });

  // Webhook route gets raw Buffer so Stripe can verify the signature
  app.use('/payments/webhook', express.raw({ type: 'application/json' }));

  // All other routes use standard JSON parsing
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.enableCors();
  await app.listen(configService.getPort());
}
bootstrap();
