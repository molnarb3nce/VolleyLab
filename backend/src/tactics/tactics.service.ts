import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Formation, Prisma, Slot } from '@prisma/client';
import { LineupEntry, validateLineup } from '../formations/lineup';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateTacticDto,
  SetStepsDto,
  UpdateTacticDto,
  ValidateTacticDto,
} from './dto/tactic.dto';
import { TacticStepDto } from './dto/tactic-step.dto';
import { validateBasePositions, validatePlay, validateSteps } from './tactic-rules';

const withSteps = { steps: { orderBy: { stepNumber: 'asc' } } } satisfies Prisma.TacticInclude;

/** Tactics belong to a user (never to a team) and are private; other users get 404. */
@Injectable()
export class TacticsService {
  constructor(private readonly prisma: PrismaService) {}

  create(userId: number, dto: CreateTacticDto) {
    const opponentFormation = dto.opponentFormation ?? dto.formation;
    const steps = dto.steps ?? [];
    this.assertValidSteps(dto.formation, opponentFormation, steps);
    this.assertValidBase(dto.basePositions);

    return this.prisma.tactic.create({
      data: {
        ownerId: userId,
        name: dto.name,
        description: dto.description,
        formation: dto.formation,
        opponentFormation,
        basePositions: (dto.basePositions ?? {}) as Prisma.InputJsonValue,
        rotation: dto.rotation ?? 1,
        opponentRotation: dto.opponentRotation ?? 1,
        liberoReplaces: dto.liberoReplaces ?? null,
        steps: { create: toStepRows(steps) },
      },
      include: withSteps,
    });
  }

  findAll(userId: number) {
    return this.prisma.tactic.findMany({
      where: { ownerId: userId },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { steps: true } } },
    });
  }

  findOne(userId: number, id: number) {
    return this.getOwnedTactic(userId, id);
  }

  /** Changing a formation re-checks the existing steps against the new formations. */
  async update(userId: number, id: number, dto: UpdateTacticDto) {
    const tactic = await this.getOwnedTactic(userId, id);
    const formation = dto.formation ?? tactic.formation;
    const opponentFormation = dto.opponentFormation ?? tactic.opponentFormation;
    this.assertValidSteps(formation, opponentFormation, tactic.steps);
    this.assertValidBase(dto.basePositions);

    return this.prisma.tactic.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        formation,
        opponentFormation,
        ...(dto.basePositions !== undefined
          ? { basePositions: dto.basePositions as Prisma.InputJsonValue }
          : {}),
        ...(dto.rotation !== undefined ? { rotation: dto.rotation } : {}),
        ...(dto.opponentRotation !== undefined ? { opponentRotation: dto.opponentRotation } : {}),
        ...(dto.liberoReplaces !== undefined ? { liberoReplaces: dto.liberoReplaces } : {}),
      },
      include: withSteps,
    });
  }

  async remove(userId: number, id: number): Promise<void> {
    await this.getOwnedTactic(userId, id);
    await this.prisma.tactic.delete({ where: { id } });
  }

  async setSteps(userId: number, id: number, dto: SetStepsDto) {
    const tactic = await this.getOwnedTactic(userId, id);
    this.assertValidSteps(tactic.formation, tactic.opponentFormation, dto.steps);

    await this.prisma.$transaction([
      this.prisma.tacticStep.deleteMany({ where: { tacticId: id } }),
      this.prisma.tacticStep.createMany({
        data: toStepRows(dto.steps).map((row) => ({ ...row, tacticId: id })),
      }),
    ]);
    return this.getOwnedTactic(userId, id);
  }

  /**
   * Checks whether a team (any user's team) can play the tactic with the given
   * slot -> player assignment, and whether the sequence of steps is playable
   * (basic volleyball rules). Run this before simulating. Always answers 200;
   * `problems` explains what is wrong.
   */
  async validate(userId: number, id: number, dto: ValidateTacticDto) {
    const tactic = await this.getOwnedTactic(userId, id);
    const team = await this.prisma.team.findUnique({ where: { id: dto.teamId } });
    if (!team) {
      throw new NotFoundException(`Team ${dto.teamId} not found`);
    }

    const problems: string[] = [];
    if (tactic.steps.length === 0) {
      problems.push('The tactic has no steps');
    }
    problems.push(...validatePlay(tactic.steps));

    const knownSlots = new Set<string>(Object.values(Slot));
    const entries: LineupEntry[] = [];
    for (const [slot, playerId] of Object.entries(dto.assignments)) {
      if (!knownSlots.has(slot)) {
        problems.push(`Unknown slot ${slot}`);
      } else if (!Number.isInteger(playerId)) {
        problems.push(`Slot ${slot} needs a player id`);
      } else {
        entries.push({ slot: slot as Slot, playerId });
      }
    }

    const teamPlayers = await this.prisma.player.findMany({
      where: { teamId: team.id, isActive: true },
      select: { id: true, role: true },
    });
    problems.push(...validateLineup(tactic.formation, entries, teamPlayers));

    return { valid: problems.length === 0, problems };
  }

  private assertValidSteps(
    formation: Formation,
    opponentFormation: Formation,
    steps: Parameters<typeof validateSteps>[2],
  ): void {
    const problems = validateSteps(formation, opponentFormation, steps);
    if (problems.length > 0) {
      throw new BadRequestException(problems);
    }
  }

  private assertValidBase(positions: unknown): void {
    const problems = validateBasePositions(positions);
    if (problems.length > 0) {
      throw new BadRequestException(problems);
    }
  }

  private async getOwnedTactic(userId: number, id: number) {
    const tactic = await this.prisma.tactic.findUnique({ where: { id }, include: withSteps });
    if (!tactic || tactic.ownerId !== userId) {
      throw new NotFoundException(`Tactic ${id} not found`);
    }
    return tactic;
  }
}

/** Steps are numbered 1..n by their position in the list. */
function toStepRows(steps: TacticStepDto[]) {
  return steps.map((s, index) => ({
    stepNumber: index + 1,
    actorSide: s.actorSide,
    slot: s.slot ?? null,
    targetSlot: s.targetSlot ?? null,
    action: s.action,
    x: s.x,
    y: s.y,
    duration: s.duration,
    delay: s.delay ?? 0,
  }));
}

