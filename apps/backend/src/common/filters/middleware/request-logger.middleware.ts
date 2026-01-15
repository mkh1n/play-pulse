import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger('Request');

  use(request: Request, response: Response, next: NextFunction): void {
    const { method, originalUrl, ip } = request;
    const userAgent = request.get('user-agent') || '';
    const startTime = Date.now();

    // Логируем входящий запрос
    this.logger.log(`➡️  ${method} ${originalUrl} - ${userAgent} ${ip}`);
    
    if (Object.keys(request.query).length > 0) {
      this.logger.debug(`   Query: ${JSON.stringify(request.query)}`);
    }
    
    if (Object.keys(request.params).length > 0) {
      this.logger.debug(`   Params: ${JSON.stringify(request.params)}`);
    }
    
    if (request.body && Object.keys(request.body).length > 0) {
      // Не логируем пароли
      const safeBody = { ...request.body };
      if (safeBody.password) safeBody.password = '***';
      if (safeBody.token) safeBody.token = '***';
      this.logger.debug(`   Body: ${JSON.stringify(safeBody)}`);
    }

    response.on('finish', () => {
      const { statusCode } = response;
      const contentLength = response.get('content-length');
      const responseTime = Date.now() - startTime;
      
      const logMessage = `⬅️  ${method} ${originalUrl} ${statusCode} ${responseTime}ms`;
      
      if (statusCode >= 500) {
        this.logger.error(`❌ ${logMessage}`);
      } else if (statusCode >= 400) {
        this.logger.warn(`⚠️  ${logMessage}`);
      } else {
        this.logger.log(`✅ ${logMessage}`);
      }
    });

    next();
  }
}