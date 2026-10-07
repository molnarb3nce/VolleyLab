import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configureApp, setupSwagger } from './app.setup';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  configureApp(app);
  setupSwagger(app);
  app.enableCors({ origin: ['http://localhost:5173'] });
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
