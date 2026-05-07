import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  
  // Включаем CORS для доступа с фронтенда
  const frontendUrl = configService.get<string>('FRONTEND_URL', 'http://localhost:3000');
  app.enableCors({
    origin: frontendUrl,
    methods: 'GET,POST,PUT,DELETE,PATCH,OPTIONS',
    credentials: true,
    allowedHeaders: 'Content-Type,Authorization',
  });
  
  // Глобальная валидация
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: true,
  }));
  
  // Глобальный фильтр исключений
  app.useGlobalFilters(new HttpExceptionFilter());
  
  // Валидация и парсинг PORT
  const portRaw = configService.get<string>('PORT', '3001');
  const port = parseInt(portRaw, 10);
  
  if (isNaN(port) || port < 1 || port > 65535) {
    console.error(`❌ Invalid PORT value: ${portRaw}. Must be a number between 1 and 65535.`);
    process.exit(1);
  }
  
  await app.listen(port);
  console.log(`🚀 Бэкенд запущен на http://localhost:${port}`);
  console.log(`📚 Swagger документация доступна по адресу http://localhost:${port}/api`);
}
bootstrap();