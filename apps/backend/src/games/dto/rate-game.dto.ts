import {
  IsInt,
  Min,
  Max,
  IsOptional,
  IsString,
  IsUrl,
} from 'class-validator';

import { ApiProperty } from '@nestjs/swagger';

export class RateGameDto {
  @ApiProperty({
    example: 8,
    description: 'Оценка игры от 1 до 10',
    minimum: 1,
    maximum: 10,
  })
  @IsInt({
    message:
      'Оценка должна быть целым числом',
  })
  @Min(1, {
    message:
      'Минимальная оценка - 1',
  })
  @Max(10, {
    message:
      'Максимальная оценка - 10',
  })
  rating: number;

  @ApiProperty({
    example:
      'Portal 2',
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
    example:
      'Отличный сюжет и графика!',
    description:
      'Комментарий к оценке',
    required: false,
  })
  @IsOptional()
  @IsString()
  comment?: string;
}