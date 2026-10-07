import { EventAction, EventResult, SetStatus } from '@prisma/client';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';

export class UpdateSetDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(99)
  homeScore?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(99)
  awayScore?: number;

  @IsOptional()
  @IsEnum(SetStatus)
  status?: SetStatus;
}

export class CreateEventDto {
  @IsInt()
  @Min(1)
  setId!: number;

  @IsInt()
  @Min(1)
  playerId!: number;

  @IsEnum(EventAction)
  action!: EventAction;

  @IsEnum(EventResult)
  result!: EventResult;
}
