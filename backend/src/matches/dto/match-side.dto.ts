import { Formation } from '@prisma/client';
import { IsEnum, IsInt, Min } from 'class-validator';

export class MatchSideDto {
  @IsInt()
  @Min(1)
  teamId!: number;

  @IsEnum(Formation)
  formation!: Formation;
}
