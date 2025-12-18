import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { GamesController } from './games.controller';
import { GamesService } from './games.service';

@Module({
  imports: [
    HttpModule.register({
      timeout: 5000,
      maxRedirects: 5,
    }),
  ],
  controllers: [GamesController],
  providers: [GamesService],
  exports: [GamesService],
})
export class GamesModule {}