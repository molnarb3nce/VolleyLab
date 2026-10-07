import { Formation, MatchStatus, Slot } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  Min,
  ValidateNested,
} from 'class-validator';

export class MatchSideDto {
  @IsInt()
  @Min(1)
  teamId!: number;

  @IsEnum(Formation)
  formation!: Formation;
}

export class CreateMatchDto {
  @ValidateNested()
  @Type(() => MatchSideDto)
  home!: MatchSideDto;

  @ValidateNested()
  @Type(() => MatchSideDto)
  away!: MatchSideDto;
}

export class UpdateMatchDto {
  @IsOptional()
  @IsEnum(MatchStatus)
  status?: MatchStatus;

  @IsOptional()
  @IsDateString()
  playedAt?: string;
}

export class LineupEntryDto {
  @IsEnum(Slot)
  slot!: Slot;

  @IsInt()
  @Min(1)
  playerId!: number;
}

/** Replaces the whole lineup (and formation) of one side of a match. */
export class SetLineupDto {
  @IsEnum(Formation)
  formation!: Formation;

  @IsArray()
  @ArrayMaxSize(8)
  @ValidateNested({ each: true })
  @Type(() => LineupEntryDto)
  lineup!: LineupEntryDto[];
}
