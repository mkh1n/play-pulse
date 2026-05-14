import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsUrl,
} from 'class-validator';

export class GameMetaDto {
  @ApiPropertyOptional({
    description: 'Название игры',
    example: 'Cyberpunk 2077',
  })
  @IsOptional()
  @IsString()
  gameName?: string;

  @ApiPropertyOptional({
    description: 'Изображение игры',
    example:
      'https://cdn.example.com/game.jpg',
  })
  @IsOptional()
  @IsUrl()
  gameImage?: string;
}