import { Injectable, NotFoundException } from '@nestjs/common';
import { MatchesService } from '../matches/matches.service';
import { PrismaService } from '../prisma/prisma.service';
import { computeStats } from './statistics';

@Injectable()
export class StatisticsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly matches: MatchesService,
  ) {}

  /** Statistics of one match per team and per player, optionally for a single set. */
  async forMatch(userId: number, matchId: number, setId?: number) {
    const match = await this.matches.getOwnedMatch(userId, matchId);
    if (setId !== undefined && !match.sets.some((s) => s.id === setId)) {
      throw new NotFoundException(`Set ${setId} not found in match ${matchId}`);
    }

    const events = await this.prisma.matchEvent.findMany({
      where: { matchId, setId },
      select: { action: true, result: true, playerId: true },
    });
    const players = await this.prisma.player.findMany({
      where: { teamId: { in: match.teams.map((t) => t.teamId) } },
      orderBy: [{ teamId: 'asc' }, { jerseyNumber: 'asc' }],
    });

    const eventsOf = (playerIds: Set<number>) => events.filter((e) => playerIds.has(e.playerId));
    return {
      teams: match.teams.map((mt) => {
        const ids = new Set(players.filter((p) => p.teamId === mt.teamId).map((p) => p.id));
        return {
          side: mt.side,
          teamId: mt.teamId,
          name: mt.team.name,
          stats: computeStats(eventsOf(ids)),
        };
      }),
      // Deactivated players only show up when they actually have events.
      players: players
        .map((p) => ({ p, own: events.filter((e) => e.playerId === p.id) }))
        .filter(({ p, own }) => p.isActive || own.length > 0)
        .map(({ p, own }) => ({
          playerId: p.id,
          teamId: p.teamId,
          name: p.name,
          jerseyNumber: p.jerseyNumber,
          stats: computeStats(own),
        })),
    };
  }

  /**
   * All-time statistics of a player. Only events of the caller's own matches are
   * included, because matches are private to their owner.
   */
  async forPlayer(userId: number, playerId: number) {
    const player = await this.prisma.player.findUnique({ where: { id: playerId } });
    if (!player) {
      throw new NotFoundException(`Player ${playerId} not found`);
    }
    const events = await this.prisma.matchEvent.findMany({
      where: { playerId, match: { ownerId: userId } },
      select: { action: true, result: true, matchId: true },
    });
    return {
      playerId,
      name: player.name,
      matches: new Set(events.map((e) => e.matchId)).size,
      stats: computeStats(events),
    };
  }
}
