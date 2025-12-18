// backend/src/games/games.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { catchError, firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';

@Injectable()
export class GamesService {
  private readonly logger = new Logger(GamesService.name);
  private readonly apiKey: string;
  private readonly baseUrl = 'https://api.rawg.io/api';

 constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.apiKey = this.configService.getOrThrow<string>('RAWG_API_KEY');
  }

  // Существующие методы для игр...
  async getGames(params: any) { /* ... */ }
  async getGameById(id: number) { /* ... */ }

  // Новый метод для получения жанров
  async getGenresFromRAWG() {
    const params = {
      key: this.apiKey,
    };

    try {
      this.logger.log('Запрашиваю жанры из RAWG API');
      
      const response = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/genres`, { params }).pipe(
          catchError((error: AxiosError) => {
            this.logger.error(`Ошибка при запросе жанров: ${error.message}`);
            throw new Error(`Failed to fetch genres: ${error.response?.status || 'Unknown error'}`);
          }),
        ),
      );

      // RAWG возвращает объект с полями count, next, previous, results
      // Нам нужен только массив жанров
      return response.data.results || [];
    } catch (error) {
      this.logger.error(`Ошибка в getGenresFromRAWG: ${error.message}`);
      throw error;
    }
  }

  // Новый метод для получения платформ
  async getPlatformsFromRAWG() {
    const params = {
      key: this.apiKey,
    };

    try {
      this.logger.log('Запрашиваю платформы из RAWG API');
      
      const response = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/platforms`, { params }).pipe(
          catchError((error: AxiosError) => {
            this.logger.error(`Ошибка при запросе платформ: ${error.message}`);
            throw new Error(`Failed to fetch platforms: ${error.response?.status || 'Unknown error'}`);
          }),
        ),
      );

      return response.data.results || [];
    } catch (error) {
      this.logger.error(`Ошибка в getPlatformsFromRAWG: ${error.message}`);
      throw error;
    }
  }
}