import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configureApp, setupSwagger } from './app.setup';
import { corsOrigins } from './cors';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  configureApp(app);
  setupSwagger(app);
  const origins = corsOrigins();
  console.log(`CORS allowed origins: ${origins.join(', ')}`);
  app.enableCors({
    origin: origins,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });
  const port = Number(process.env.PORT) || 3000;
  await app.listen(port, '0.0.0.0');
  console.log(`VolleyLab API listening on port ${port}`);
}
bootstrap().catch((err) => {
  console.error('Failed to start API:', err);
  process.exit(1);
});
