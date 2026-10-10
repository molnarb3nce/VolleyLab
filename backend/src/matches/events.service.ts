import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEventDto } from './dto/set-event.dto';
import { ACTION_RESULTS, isValidResult } from './event-rules';
import { MatchesService } from './matches.service';

/** Match events are the source of truth for statistics. */
@Injectable()
export class EventsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly matches: MatchesService,
  ) {}

  async create(userId: number, matchId: number, dto: CreateEventDto) {
    const match = await this.matches.getOwnedMatch(userId, matchId);
    if (match.status !== 'IN_PROGRESS') {
      throw new ConflictException('Events can only be recorded while the match is in progress');
    }
    const set = match.sets.find((s) => s.id === dto.setId);
    if (!set) {
      throw new NotFoundException(`Set ${dto.setId} not found in match ${matchId}`);
    }
    if (set.status === 'FINISHED') {
      throw new ConflictException(`Set ${set.setNumber} is finished`);
    }
    if (!isValidResult(dto.action, dto.result)) {
      throw new BadRequestException(
        `Result ${dto.result} is not valid for ${dto.action}; allowed: ${ACTION_RESULTS[dto.action].join(', ')}`,
      );
    }
    const player = await this.prisma.player.findFirst({
      where: {
        id: dto.playerId,
        isActive: true,
        teamId: { in: match.teams.map((t) => t.teamId) },
      },
    });
    if (!player) {
      throw new BadRequestException(`Player ${dto.playerId} is not an active player of either team`);
    }

    return this.prisma.matchEvent.create({
      data: {
        matchId,
        setId: dto.setId,
        playerId: dto.playerId,
        action: dto.action,
        result: dto.result,
      },
    });
  }

  async findAll(_userId: number, matchId: number) {
    await this.matches.getMatch(matchId);
    return this.prisma.matchEvent.findMany({
      where: { matchId },
      orderBy: { id: 'asc' },
      include: { player: { select: { id: true, name: true, jerseyNumber: true, teamId: true } } },
    });
  }

  /** Undo: removes a mistakenly entered event. */
  async remove(userId: number, matchId: number, eventId: number): Promise<void> {
    const match = await this.matches.getOwnedMatch(userId, matchId);
    if (match.status === 'FINISHED') {
      throw new ConflictException('The match is finished');
    }
    const event = await this.prisma.matchEvent.findFirst({ where: { id: eventId, matchId } });
    if (!event) {
      throw new NotFoundException(`Event ${eventId} not found in match ${matchId}`);
    }
    await this.prisma.matchEvent.delete({ where: { id: eventId } });
  }
}
