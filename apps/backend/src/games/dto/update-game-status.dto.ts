import { ApiProperty } from '@nestjs/swagger';

import {
  IsIn,
  IsOptional,
  IsString,
  IsUrl,
} from 'class-validator';

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
}