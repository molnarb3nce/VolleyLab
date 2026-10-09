import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configureApp, setupSwagger } from './app.setup';
import { corsOrigins } from './cors';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  configureApp(app);
  setupSwagger(app);
  app.enableCors({ origin: corsOrigins() });
  await app.listen(process.env.PORT ?? 3000, '0.0.0.0');
}
bootstrap();
