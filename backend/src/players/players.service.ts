import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Player, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TeamsService } from '../teams/teams.service';
import { CreatePlayerDto, UpdatePlayerDto } from './dto/player.dto';

export type DeleteResult = { result: 'deleted' | 'deactivated' };

@Injectable()
export class PlayersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly teams: TeamsService,
  ) {}

  async create(userId: number, teamId: number, dto: CreatePlayerDto): Promise<Player> {
    await this.teams.getOwnedTeam(userId, teamId);
    await this.assertJerseyNumberFree(teamId, dto.jerseyNumber);
    return this.guardUniqueJersey(() =>
      this.prisma.player.create({
        data: { teamId, name: dto.name, jerseyNumber: dto.jerseyNumber, role: dto.role },
      }),
    );
  }

  async update(userId: number, playerId: number, dto: UpdatePlayerDto): Promise<Player> {
    const player = await this.getOwnedPlayer(userId, playerId);
    if (dto.jerseyNumber !== undefined && dto.jerseyNumber !== player.jerseyNumber) {
      await this.assertJerseyNumberFree(player.teamId, dto.jerseyNumber);
    }
    return this.guardUniqueJersey(() =>
      this.prisma.player.update({
        where: { id: playerId },
        data: {
          name: dto.name,
          jerseyNumber: dto.jerseyNumber,
          role: dto.role,
          isActive: dto.isActive,
        },
      }),
    );
  }

  /**
   * A player that already has events or a place in a lineup is only deactivated
   * (statistics must stay reproducible). Any other player is really deleted.
   */
  async remove(userId: number, playerId: number): Promise<DeleteResult> {
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

  /** Jersey numbers are unique per team, including deactivated players. */
  private async assertJerseyNumberFree(teamId: number, jerseyNumber: number): Promise<void> {
    const existing = await this.prisma.player.findUnique({
      where: { teamId_jerseyNumber: { teamId, jerseyNumber } },
    });
    if (existing) {
      throw new ConflictException(`Jersey number ${jerseyNumber} is already used in this team`);
    }
  }

  /** Covers the race between the check above and the write. */
  private async guardUniqueJersey<T>(write: () => Promise<T>): Promise<T> {
    try {
      return await write();
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Jersey number is already used in this team');
      }
      throw error;
    }
  }
}
