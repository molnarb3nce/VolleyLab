import { PartialType, OmitType } from '@nestjs/swagger';
import { ActorSide, Formation, Slot, TacticAction } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Trim } from '../../common/transforms';
import { COURT, MAX_STEP_DURATION_MS, MAX_STEPS } from '../tactic-rules';

export class TacticStepDto {
  @IsEnum(ActorSide)
  actorSide!: ActorSide;

  /** Acting slot; omitted for the ball. */
  @IsOptional()
  @IsEnum(Slot)
  slot?: Slot;

  /** Target of a SET step (for example "setter sets MIDDLE_1"). */
  @IsOptional()
  @IsEnum(Slot)
  targetSlot?: Slot;

  @IsEnum(TacticAction)
  action!: TacticAction;

  @IsNumber()
  @Min(0)
  @Max(COURT.width)
  x!: number;

  @IsNumber()
  @Min(0)
  @Max(COURT.height)
  y!: number;

  /** Animation duration in milliseconds. */
  @IsInt()
  @Min(0)
  @Max(MAX_STEP_DURATION_MS)
  duration!: number;
}

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
