import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Player } from '@prisma/client';
import { isUniqueViolation } from '../common/prisma-errors';
import { PrismaService } from '../prisma/prisma.service';
import { TeamsService } from '../teams/teams.service';
import { CreatePlayerDto, UpdatePlayerDto } from './dto/player.dto';

@Injectable()
export class PlayersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly teams: TeamsService,
  ) {}

  async create(userId: number, teamId: number, dto: CreatePlayerDto): Promise<Player> {
    await this.teams.getOwnedTeam(userId, teamId);
    return this.withJerseyConflict(() => this.prisma.player.create({ data: { ...dto, teamId } }));
  }

  async update(userId: number, playerId: number, dto: UpdatePlayerDto): Promise<Player> {
    await this.getOwnedPlayer(userId, playerId);
    return this.withJerseyConflict(() =>
      this.prisma.player.update({ where: { id: playerId }, data: dto }),
    );
  }

  /**
   * A player that already has events or a place in a lineup is only deactivated
   * (statistics must stay reproducible). Any other player is really deleted.
   */
  async remove(userId: number, playerId: number): Promise<{ result: 'deleted' | 'deactivated' }> {
    await this.getOwnedPlayer(userId, playerId);
    const [eventCount, lineupCount] = await Promise.all([
      this.prisma.matchEvent.count({ where: { playerId } }),
      this.prisma.matchLineupSlot.count({ where: { playerId } }),
    ]);
    if (eventCount > 0 || lineupCount > 0) {
      await this.prisma.player.update({ where: { id: playerId }, data: { isActive: false } });
      return { result: 'deactivated' };
    }
    await this.prisma.player.delete({ where: { id: playerId } });
    return { result: 'deleted' };
  }

  private async getOwnedPlayer(userId: number, playerId: number): Promise<Player> {
    const player = await this.prisma.player.findUnique({
      where: { id: playerId },
      include: { team: true },
    });
    if (!player) {
      throw new NotFoundException(`Player ${playerId} not found`);
    }
    if (player.team.ownerId !== userId) {
      throw new ForbiddenException('Only the owner of a team can change its players');
    }
    return player;
  }

  /** Jersey numbers are unique per team (deactivated players included); the DB constraint decides. */
  private async withJerseyConflict<T>(write: () => Promise<T>): Promise<T> {
    try {
      return await write();
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException('Jersey number is already used in this team');
      }
      throw error;
    }
  }
}
