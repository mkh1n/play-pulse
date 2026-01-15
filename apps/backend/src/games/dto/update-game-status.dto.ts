import { ApiProperty } from "@nestjs/swagger";
import { IsIn } from "class-validator";

// update-game-status.dto.ts
export class UpdateGameStatusDto {
  @ApiProperty({
    description: 'Статус прохождения игры',
    enum: ['not_played', 'playing', 'completed', 'dropped'],
    example: 'playing'
  })
  @IsIn(['not_played', 'playing', 'completed', 'dropped'])
  status: string;
}

// update-purchase.dto.ts
export class UpdatePurchaseDto {
  @ApiProperty({
    description: 'Статус покупки игры',
    enum: ['owned', 'not_owned', 'want_to_buy'],
    example: 'owned'
  })
  @IsIn(['owned', 'not_owned', 'want_to_buy'])
  purchase: string;
}