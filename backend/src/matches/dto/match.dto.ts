import { Formation, MatchStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { LineupEntryDto } from './lineup-entry.dto';
import { MatchSideDto } from './match-side.dto';

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
