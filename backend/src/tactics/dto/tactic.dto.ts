import { PartialType, OmitType } from '@nestjs/swagger';
import { Formation, Slot } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Trim } from '../../common/transforms';
import { MAX_STEPS } from '../tactic-rules';
import { TacticStepDto } from './tactic-step.dto';

export class CreateTacticDto {
  @Trim()
  @IsString()
  @IsNotEmpty({ message: 'name must not be empty' })
  @MaxLength(100)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsEnum(Formation)
  formation!: Formation;

  /** Defaults to the own formation. */
  @IsOptional()
  @IsEnum(Formation)
  opponentFormation?: Formation;

  /** Starting positions keyed `OWN:LIBERO`, `BALL`, … Missing slots use the defaults. */
  @IsOptional()
  @IsObject()
  basePositions?: Record<string, { x: number; y: number }>;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(6)
  rotation?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(6)
  opponentRotation?: number;

  /** Back-row slot replaced by the libero; omit or null for no libero on court. */
  @IsOptional()
  @IsEnum(Slot)
  liberoReplaces?: Slot | null;

  /** Optional initial steps; they are numbered by their position. */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_STEPS)
  @ValidateNested({ each: true })
  @Type(() => TacticStepDto)
  steps?: TacticStepDto[];
}

export class UpdateTacticDto extends PartialType(OmitType(CreateTacticDto, ['steps'] as const)) {}

/** Replaces all steps of a tactic. An empty list removes them. */
export class SetStepsDto {
  @IsArray()
  @ArrayMaxSize(MAX_STEPS)
  @ValidateNested({ each: true })
  @Type(() => TacticStepDto)
  steps!: TacticStepDto[];
}

export class ValidateTacticDto {
  @IsInt()
  @Min(1)
  teamId!: number;

  /** Slot -> player id, for example { "SETTER_1": 12, "MIDDLE_1": 15 }. Not stored. */
  @IsObject()
  assignments!: Record<string, number>;
}

