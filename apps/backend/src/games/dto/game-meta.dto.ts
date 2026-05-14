import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsUrl,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class GenreDto {
  @IsOptional()
  @IsString()
  id?: number | string;

  @IsOptional()
  @IsString()
  name?: string;
}

export class TagDto {
  @IsOptional()
  @IsString()
  id?: number | string;

  @IsOptional()
  @IsString()
  name?: string;
}

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

  @ApiPropertyOptional({
    description: 'Жанры игры',
    example: [{ id: 1, name: 'Action' }, { id: 2, name: 'RPG' }],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GenreDto)
  genres?: Array<{ id?: number | string; name?: string }>;

  @ApiPropertyOptional({
    description: 'Теги игры',
    example: [{ id: 1, name: 'Open World' }, { id: 2, name: 'Sci-Fi' }],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TagDto)
  tags?: Array<{ id?: number | string; name?: string }>;
}