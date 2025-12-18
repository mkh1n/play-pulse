import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Включаем CORS для доступа с фронтенда
  app.enableCors({
    origin: 'http://localhost:3000', // Адрес вашего фронтенда
    methods: 'GET,POST,PUT,DELETE',
    credentials: true,
  });
  
  // Глобальная валидация
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
  }));
  
  // Глобальный фильтр исключений
  app.useGlobalFilters(new HttpExceptionFilter());
  
  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`🚀 Бэкенд запущен на http://localhost:${port}`);
}
bootstrap();