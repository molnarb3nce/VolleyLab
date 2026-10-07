import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { isUniqueViolation } from '../common/prisma-errors';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateSetDto } from './dto/set-event.dto';
import { MatchesService } from './matches.service';

/** A volleyball match is played to at most five sets. */
export const MAX_SETS = 5;

/** Set scores are entered manually and are independent of the recorded events. */
@Injectable()
export class SetsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly matches: MatchesService,
  ) {}

  /** Starts the next set (numbers are assigned automatically). */
  async create(userId: number, matchId: number) {
    const match = await this.matches.getOwnedMatch(userId, matchId);
    this.assertNotFinished(match.status);
    if (match.sets.length >= MAX_SETS) {
      throw new ConflictException(`A match has at most ${MAX_SETS} sets`);
    }
    const last = match.sets.at(-1);
    if (last && last.status !== 'FINISHED') {
      throw new ConflictException(`Set ${last.setNumber} is still in progress`);
    }

    try {
      return await this.prisma.matchSet.create({
        data: { matchId, setNumber: (last?.setNumber ?? 0) + 1 },
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException('The next set was just created by another request');
      }
      throw error;
    }
  }

  async update(userId: number, matchId: number, setId: number, dto: UpdateSetDto) {
    const match = await this.matches.getOwnedMatch(userId, matchId);
    this.assertNotFinished(match.status);
    if (!match.sets.some((s) => s.id === setId)) {
      throw new NotFoundException(`Set ${setId} not found in match ${matchId}`);
    }
    return this.prisma.matchSet.update({
      where: { id: setId },
      data: { homeScore: dto.homeScore, awayScore: dto.awayScore, status: dto.status },
    });
  }

  private assertNotFinished(status: string): void {
    if (status === 'FINISHED') {
      throw new ConflictException('The match is finished');
    }
  }
}
