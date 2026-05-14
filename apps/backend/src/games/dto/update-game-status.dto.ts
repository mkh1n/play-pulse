import { ApiProperty } from '@nestjs/swagger';

import {
  IsIn,
  IsOptional,
  IsString,
  IsUrl,
  IsArray,
  ValidateNested,
} from 'class-validator';

import { Type } from 'class-transformer';

class GenreTagDto {
  @ApiProperty({ example: 1, description: 'ID жанра/тега', required: false })
  @IsOptional()
  id?: number | string;

  @ApiProperty({ example: 'Action', description: 'Название жанра/тега', required: false })
  @IsOptional()
  @IsString()
  name?: string;
}

export class UpdateGameStatusDto {
  @ApiProperty({
    description:
      'Статус прохождения игры',
    enum: [
      'not_played',
      'playing',
      'completed',
      'dropped',
    ],
    example: 'playing',
  })
  @IsIn([
    'not_played',
    'playing',
    'completed',
    'dropped',
  ])
  status: string;

  @ApiProperty({
    example: 'Portal 2',
    description:
      'Название игры',
  })
  @IsString()
  gameName: string;

  @ApiProperty({
    example:
      'https://media.rawg.io/media/games/328/3283617cb7d75b87b07c9d064f2f19d3.jpg',
    description:
      'Изображение игры',
    required: false,
  })
  @IsOptional()
  @IsUrl()
  gameImage?: string;

  @ApiProperty({
    example: [{ id: 1, name: 'Action' }, { id: 2, name: 'Adventure' }],
    description: 'Жанры игры',
    required: false,
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GenreTagDto)
  genres?: Array<{ id?: number | string; name?: string }>;

  @ApiProperty({
    example: [{ id: 1, name: 'Singleplayer' }, { id: 2, name: 'Multiplayer' }],
    description: 'Теги игры',
    required: false,
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GenreTagDto)
  tags?: Array<{ id?: number | string; name?: string }>;
}

export class UpdatePurchaseDto {
  @ApiProperty({
    description:
      'Статус покупки игры',
    enum: [
      'owned',
      'not_owned',
      'want_to_buy',
    ],
    example: 'owned',
  })
  @IsIn([
    'owned',
    'not_owned',
    'want_to_buy',
  ])
  purchase: string;

  @ApiProperty({
    example: 'Portal 2',
    description:
      'Название игры',
  })
  @IsString()
  gameName: string;

  @ApiProperty({
    example:
      'https://media.rawg.io/media/games/328/3283617cb7d75b87b07c9d064f2f19d3.jpg',
    description:
      'Изображение игры',
    required: false,
  })
  @IsOptional()
  @IsUrl()
  gameImage?: string;

  @ApiProperty({
    example: [{ id: 1, name: 'Action' }, { id: 2, name: 'Adventure' }],
    description: 'Жанры игры',
    required: false,
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GenreTagDto)
  genres?: Array<{ id?: number | string; name?: string }>;

  @ApiProperty({
    example: [{ id: 1, name: 'Singleplayer' }, { id: 2, name: 'Multiplayer' }],
    description: 'Теги игры',
    required: false,
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GenreTagDto)
  tags?: Array<{ id?: number | string; name?: string }>;
}
