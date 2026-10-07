import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MatchSide, MatchStatus, Prisma } from '@prisma/client';
import { REQUIRED_SLOTS } from '../formations/formations';
import { validateLineup } from '../formations/lineup';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMatchDto, SetLineupDto, UpdateMatchDto } from './dto/match.dto';

const matchInclude = {
  teams: {
    orderBy: { side: 'asc' },
    include: {
      team: { select: { id: true, name: true } },
      lineup: { include: { player: true }, orderBy: { slot: 'asc' } },
    },
  },
  sets: { orderBy: { setNumber: 'asc' } },
} satisfies Prisma.MatchInclude;

type MatchWithDetails = Prisma.MatchGetPayload<{ include: typeof matchInclude }>;

/** A match only moves forward; reopening a finished match is not supported. */
const NEXT_STATUS: Record<MatchStatus, MatchStatus | null> = {
  PLANNED: 'IN_PROGRESS',
  IN_PROGRESS: 'FINISHED',
  FINISHED: null,
};

/** Matches are private to their owner; other users get 404. */
@Injectable()
export class MatchesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: number, dto: CreateMatchDto) {
    if (dto.home.teamId === dto.away.teamId) {
      throw new BadRequestException('A team cannot play against itself');
    }
    const teamIds = [dto.home.teamId, dto.away.teamId];
    const found = await this.prisma.team.findMany({ where: { id: { in: teamIds } } });
    const missing = teamIds.find((id) => !found.some((t) => t.id === id));
    if (missing !== undefined) {
      throw new NotFoundException(`Team ${missing} not found`);
    }

    return this.prisma.match.create({
      data: {
        ownerId: userId,
        teams: {
          create: [
            { side: 'HOME', teamId: dto.home.teamId, formation: dto.home.formation },
            { side: 'AWAY', teamId: dto.away.teamId, formation: dto.away.formation },
          ],
        },
      },
      include: matchInclude,
    });
  }

  findAll(userId: number) {
    return this.prisma.match.findMany({
      where: { ownerId: userId },
      orderBy: { playedAt: 'desc' },
      include: matchInclude,
    });
  }

  findOne(userId: number, matchId: number) {
    return this.getOwnedMatch(userId, matchId);
  }

  async update(userId: number, matchId: number, dto: UpdateMatchDto) {
    const match = await this.getOwnedMatch(userId, matchId);

    if (dto.status !== undefined && dto.status !== match.status) {
      if (NEXT_STATUS[match.status] !== dto.status) {
        throw new ConflictException(`A match cannot go from ${match.status} to ${dto.status}`);
      }
      if (dto.status === 'IN_PROGRESS' && !match.teams.every(hasCompleteLineup)) {
        throw new ConflictException('Both teams need a complete lineup before the match can start');
      }
    }

    return this.prisma.match.update({
      where: { id: matchId },
      data: {
        status: dto.status,
        playedAt: dto.playedAt ? new Date(dto.playedAt) : undefined,
      },
      include: matchInclude,
    });
  }

  /** Replaces formation and lineup of one side. Changing the formation therefore clears the old lineup. */
  async setLineup(userId: number, matchId: number, side: MatchSide, dto: SetLineupDto) {
    const match = await this.getOwnedMatch(userId, matchId);
    if (match.status === 'FINISHED') {
      throw new ConflictException('The lineup of a finished match cannot be changed');
    }
    const matchTeam = match.teams.find((t) => t.side === side);
    if (!matchTeam) {
      throw new NotFoundException(`Match ${matchId} has no ${side} team`);
    }

    const teamPlayers = await this.prisma.player.findMany({
      where: { teamId: matchTeam.teamId, isActive: true },
      select: { id: true, role: true },
    });
    const problems = validateLineup(dto.formation, dto.lineup, teamPlayers);
    if (problems.length > 0) {
      throw new BadRequestException(problems);
    }

    await this.prisma.$transaction([
      this.prisma.matchLineupSlot.deleteMany({ where: { matchTeamId: matchTeam.id } }),
      this.prisma.matchTeam.update({
        where: { id: matchTeam.id },
        data: { formation: dto.formation },
      }),
      this.prisma.matchLineupSlot.createMany({
        data: dto.lineup.map((e) => ({
          matchTeamId: matchTeam.id,
          slot: e.slot,
          playerId: e.playerId,
        })),
      }),
    ]);
    return this.getOwnedMatch(userId, matchId);
  }

  /** Returns the match with details if it belongs to the user; 404 otherwise. */
  async getOwnedMatch(userId: number, matchId: number): Promise<MatchWithDetails> {
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
      include: matchInclude,
    });
    if (!match || match.ownerId !== userId) {
      throw new NotFoundException(`Match ${matchId} not found`);
    }
    return match;
  }
}

function hasCompleteLineup(matchTeam: MatchWithDetails['teams'][number]): boolean {
  return REQUIRED_SLOTS[matchTeam.formation].every((slot) =>
    matchTeam.lineup.some((entry) => entry.slot === slot),
  );
}

