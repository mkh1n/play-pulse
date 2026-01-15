import { IsString, IsOptional, IsUrl, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateProfileDto {
  @ApiProperty({
    example: 'GameMasterPro',
    description: 'Новое имя пользователя',
    required: false,
  })
  @IsOptional()
  @IsString()
  @Length(3, 30)
  username?: string;

  @ApiProperty({
    example: 'https://example.com/avatar.jpg',
    description: 'URL аватара',
    required: false,
  })
  @IsOptional()
  @IsUrl()
  avatarUrl?: string;

  @ApiProperty({
    example: 'Люблю RPG и стратегии. Играю с детства.',
    description: 'Биография пользователя',
    required: false,
  })
  @IsOptional()
  @IsString()
  @Length(0, 500)
  bio?: string;

  @ApiProperty({
    example: 'ru',
    description: 'Предпочитаемый язык',
    required: false,
  })
  @IsOptional()
  @IsString()
  @Length(2, 10)
  preferredLanguage?: string;
}