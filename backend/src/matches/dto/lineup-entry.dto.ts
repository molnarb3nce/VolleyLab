import { Slot } from '@prisma/client';
import { IsEnum, IsInt, Min } from 'class-validator';

export class LineupEntryDto {
  @IsEnum(Slot)
  slot!: Slot;

  @IsInt()
  @Min(1)
  playerId!: number;
}
