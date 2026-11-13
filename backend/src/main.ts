import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

function loadEnvironment(): void {
  if (typeof process.loadEnvFile === 'function') {
    try {
      process.loadEnvFile();
    } catch {
      try {
        process.loadEnvFile('../../.env');
      } catch {
        // Môi trường container hoặc production đã có sẵn process.env
      }
    }
  }
}

async function bootstrap(): Promise<void> {
  loadEnvironment();
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  app.enableShutdownHooks();

  const port = Number(process.env.API_PORT ?? 3001);
  await app.listen(port);
}

void bootstrap();
