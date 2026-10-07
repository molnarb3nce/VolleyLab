import { ActorSide, Slot, TacticAction } from '@prisma/client';
import { IsEnum, IsInt, IsNumber, IsOptional, Max, Min } from 'class-validator';
import { COURT, MAX_STEP_DURATION_MS } from '../tactic-rules';

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
