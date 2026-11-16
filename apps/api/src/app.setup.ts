import {
  StandardSchemaValidationPipe,
  type INestApplication,
} from '@nestjs/common';

/** Shared by main.ts and the e2e tests, so tests run the same prefix, CORS and validation. */
export function configureApp(app: INestApplication): INestApplication {
  app.setGlobalPrefix('api');
  app.enableCors({
    origin: process.env.WEB_ORIGIN ?? 'http://localhost:3000',
    methods: ['GET', 'PATCH'],
  });
  app.useGlobalPipes(new StandardSchemaValidationPipe());
  app.enableShutdownHooks();
  return app;
}
