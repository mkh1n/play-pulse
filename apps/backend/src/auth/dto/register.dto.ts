import { IsString, MinLength, MaxLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({
    example: 'gamemaster',
    description: 'Логин пользователя (уникальный)',
    minLength: 3,
    maxLength: 30,
  })
  @IsString({ message: 'Логин должен быть строкой' })
  @MinLength(3, { message: 'Логин должен содержать минимум 3 символа' })
  @MaxLength(30, { message: 'Логин не должен превышать 30 символов' })
  @Matches(/^[a-zA-Z0-9_]+$/, { 
    message: 'Логин может содержать только буквы, цифры и подчеркивания' 
  })
  login: string;

  @ApiProperty({
    example: 'password123',
    description: 'Пароль пользователя',
    minLength: 6,
  })
  @IsString({ message: 'Пароль должен быть строкой' })
  @MinLength(6, { message: 'Пароль должен содержать минимум 6 символов' })
  @MaxLength(50, { message: 'Пароль не должен превышать 50 символов' })
  password: string;
}