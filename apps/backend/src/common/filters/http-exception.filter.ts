import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // Определяем статус
    const status = exception instanceof HttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    // Получаем сообщение об ошибке
    let errorMessage = 'Internal server error';
    let errorDetails: any = null;
    let errorStack: string | undefined;

    if (exception instanceof HttpException) {
      const responseData = exception.getResponse();
      if (typeof responseData === 'string') {
        errorMessage = responseData;
      } else if (typeof responseData === 'object') {
        errorMessage = (responseData as any).message || 'Unknown error';
        errorDetails = responseData;
      }
    } else if (exception instanceof Error) {
      errorMessage = exception.message;
      errorStack = exception.stack;
      
      // Определяем тип ошибки
      if (exception.name === 'TypeError') {
        errorMessage = `TypeError: ${exception.message}`;
      } else if (exception.name === 'ReferenceError') {
        errorMessage = `ReferenceError: ${exception.message}`;
      } else if (exception.name === 'SyntaxError') {
        errorMessage = `SyntaxError: ${exception.message}`;
      }
    }

    // Логируем ВСЕ детали
    this.logger.error(`❌ ОШИБКА ${status} ${request.method} ${request.url}`);
    this.logger.error(`📝 Сообщение: ${errorMessage}`);
    
    if (errorStack) {
      // Выводим только первые 3 строки стека для читаемости
      const stackLines = errorStack.split('\n').slice(0, 4);
      this.logger.error(`🔍 Стек ошибки:`);
      stackLines.forEach(line => this.logger.error(`   ${line}`));
    }
    
    // Логируем данные запроса
    this.logger.error(`📤 Метод: ${request.method}`);
    this.logger.error(`🔗 URL: ${request.url}`);
    this.logger.error(`👤 Пользователь: ${JSON.stringify((request as any).user || 'Не авторизован')}`);
    
    if (Object.keys(request.query).length > 0) {
      this.logger.error(`❓ Query параметры: ${JSON.stringify(request.query)}`);
    }
    
    if (Object.keys(request.params).length > 0) {
      this.logger.error(`🎯 Path параметры: ${JSON.stringify(request.params)}`);
    }
    
    if (request.body && Object.keys(request.body).length > 0) {
      this.logger.error(`📦 Body запроса: ${JSON.stringify(request.body)}`);
    }
    
    // Логируем заголовки авторизации
    const authHeader = request.headers.authorization;
    this.logger.error(`🔐 Authorization header: ${authHeader ? 'Присутствует' : 'Отсутствует'}`);
    if (authHeader) {
      this.logger.error(`   Тип токена: ${authHeader.split(' ')[0]}`);
      this.logger.error(`   Токен: ${authHeader.split(' ')[1]?.substring(0, 20)}...`);
    }

    // Логируем cookies
    const cookies = request.cookies;
    if (cookies && Object.keys(cookies).length > 0) {
      this.logger.error(`🍪 Cookies: ${JSON.stringify(Object.keys(cookies))}`);
    }

    // Логируем полный объект ошибки для отладки
    if (exception && typeof exception === 'object') {
      this.logger.error(`🔧 Детали исключения:`);
      
      // Логируем все свойства ошибки
      Object.keys(exception).forEach(key => {
        if (key !== 'stack') { // Стек уже вывели
          try {
            const value = (exception as any)[key];
            if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
              this.logger.error(`   ${key}: ${value}`);
            } else if (value && typeof value === 'object') {
              // Для объектов выводим только ключи
              this.logger.error(`   ${key}: [Object] Keys: ${Object.keys(value).join(', ')}`);
            }
          } catch (e) {
            this.logger.error(`   ${key}: [Не удалось сериализовать]`);
          }
        }
      });
    }

    // Отправляем ответ с подробной информацией об ошибке
    const errorResponse: any = {
      success: false,
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message: errorMessage,
    };

    // В режиме разработки добавляем больше деталей
    if (process.env.NODE_ENV !== 'production') {
      errorResponse.debug = {
        errorName: exception instanceof Error ? exception.name : 'Unknown',
        errorDetails: errorDetails,
        stackTrace: process.env.NODE_ENV === 'development' ? errorStack : undefined,
        requestBody: request.body,
        requestQuery: request.query,
        requestParams: request.params,
        userId: (request as any).user?.id,
      };
    }

    // Если это ошибка Supabase, добавляем специфичную информацию
    if (exception && typeof exception === 'object' && 'code' in exception) {
      const supabaseError = exception as any;
      errorResponse.databaseError = {
        code: supabaseError.code,
        message: supabaseError.message,
        details: supabaseError.details,
        hint: supabaseError.hint,
      };
      
      this.logger.error(`🗄️ Ошибка базы данных:`);
      this.logger.error(`   Код: ${supabaseError.code}`);
      this.logger.error(`   Сообщение: ${supabaseError.message}`);
      if (supabaseError.details) this.logger.error(`   Детали: ${supabaseError.details}`);
      if (supabaseError.hint) this.logger.error(`   Подсказка: ${supabaseError.hint}`);
    }

    // Определяем тип ошибки и даем рекомендации
    if (status === 401) {
      errorResponse.suggestion = 'Проверьте авторизацию. Возможно, токен истек или недействителен.';
    } else if (status === 403) {
      errorResponse.suggestion = 'У вас недостаточно прав для выполнения этого действия.';
    } else if (status === 404) {
      errorResponse.suggestion = 'Ресурс не найден. Проверьте правильность URL.';
    } else if (status === 400) {
      errorResponse.suggestion = 'Некорректный запрос. Проверьте отправляемые данные.';
    } else if (status === 500) {
      errorResponse.suggestion = 'Внутренняя ошибка сервера. Пожалуйста, сообщите об этом администратору.';
      
      // Для 500 ошибок логируем полный стек
      if (errorStack) {
        this.logger.error(`🚨 ПОЛНЫЙ СТЕК ОШИБКИ 500:`);
        this.logger.error(errorStack);
      }
    }

    response.status(status).json(errorResponse);
  }
}