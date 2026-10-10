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
    const match = await this.matches.getMatch(matchId);
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
    const player = await this.prisma.player.findUnique({
      where: { id: playerId },
      include: { team: { select: { id: true, name: true } } },
    });
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
      jerseyNumber: player.jerseyNumber,
      role: player.role,
      teamId: player.teamId,
      teamName: player.team.name,
      isActive: player.isActive,
      matches: new Set(events.map((e) => e.matchId)).size,
      stats: computeStats(events),
    };
  }

  /** Aggregated stats across all of the user's matches (for the home dashboard). */
  async overview(userId: number) {
    const events = await this.prisma.matchEvent.findMany({
      where: { match: { ownerId: userId } },
      select: {
        action: true,
        result: true,
        matchId: true,
        createdAt: true,
        player: {
          select: {
            id: true,
            name: true,
            jerseyNumber: true,
            teamId: true,
            team: { select: { name: true } },
          },
        },
        match: {
          select: {
            playedAt: true,
            teams: { select: { side: true, team: { select: { name: true } } } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const stats = computeStats(events.map(({ action, result }) => ({ action, result })));
    const byAction = (['SERVE', 'RECEPTION', 'SET', 'ATTACK', 'BLOCK', 'DIG'] as const).map((action) => ({
      action,
      count: events.filter((e) => e.action === action).length,
    }));

    const byPlayer = new Map<
      number,
      { playerId: number; teamId: number; name: string; jerseyNumber: number; teamName: string; kills: number; attempts: number }
    >();
    for (const e of events) {
      if (e.action !== 'ATTACK') continue;
      const row = byPlayer.get(e.player.id) ?? {
        playerId: e.player.id,
        teamId: e.player.teamId,
        name: e.player.name,
        jerseyNumber: e.player.jerseyNumber,
        teamName: e.player.team.name,
        kills: 0,
        attempts: 0,
      };
      row.attempts++;
      if (e.result === 'KILL') row.kills++;
      byPlayer.set(e.player.id, row);
    }
    const topAttackers = [...byPlayer.values()]
      .sort((a, b) => b.kills - a.kills || b.attempts - a.attempts)
      .slice(0, 6);

    const byMatch = new Map<number, { matchId: number; eventCount: number; playedAt: Date; label: string }>();
    for (const e of events) {
      const home = e.match.teams.find((t) => t.side === 'HOME')?.team.name ?? '?';
      const away = e.match.teams.find((t) => t.side === 'AWAY')?.team.name ?? '?';
      const existing = byMatch.get(e.matchId);
      if (existing) existing.eventCount++;
      else {
        byMatch.set(e.matchId, {
          matchId: e.matchId,
          eventCount: 1,
          playedAt: e.match.playedAt,
          label: `${home} vs ${away}`,
        });
      }
    }
    const recentMatches = [...byMatch.values()]
      .sort((a, b) => b.playedAt.getTime() - a.playedAt.getTime())
      .slice(0, 5);

    return {
      totalEvents: events.length,
      matchesWithEvents: byMatch.size,
      stats,
      byAction,
      topAttackers,
      recentMatches,
    };
  }
}
