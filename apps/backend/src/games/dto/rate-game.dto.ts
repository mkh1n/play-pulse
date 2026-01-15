import { IsInt, Min, Max, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RateGameDto {
  @ApiProperty({
    example: 8,
    description: 'Оценка игры от 1 до 10',
    minimum: 1,
    maximum: 10
  })
  @IsInt({ message: 'Оценка должна быть целым числом' })
  @Min(1, { message: 'Минимальная оценка - 1' })
  @Max(10, { message: 'Максимальная оценка - 10' })
  rating: number;

  @ApiProperty({
    example: 'Отличный сюжет и графика!',
    description: 'Необязательный комментарий к оценке',
    required: false
  })
  @IsOptional()
  comment?: string;
}