import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Team } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTeamDto, UpdateTeamDto } from './dto/team.dto';

/**
 * Teams are readable (and usable in matches/tactics) by every user,
 * but only the owner may edit or delete them and their players.
 */
@Injectable()
export class TeamsService {
  constructor(private readonly prisma: PrismaService) {}

  create(userId: number, dto: CreateTeamDto) {
    return this.prisma.team.create({ data: { name: dto.name, ownerId: userId } });
  }

  findAll(userId: number, mineOnly: boolean) {
    return this.prisma.team.findMany({
      where: mineOnly ? { ownerId: userId } : {},
      include: { _count: { select: { players: { where: { isActive: true } } } } },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: number, includeInactive = false) {
    const team = await this.prisma.team.findUnique({
      where: { id },
      include: {
        players: {
          where: includeInactive ? {} : { isActive: true },
          orderBy: { jerseyNumber: 'asc' },
        },
      },
    });
    if (!team) {
      throw new NotFoundException(`Team ${id} not found`);
    }
    return team;
  }

  async update(userId: number, id: number, dto: UpdateTeamDto) {
    await this.getOwnedTeam(userId, id);
    return this.prisma.team.update({ where: { id }, data: { name: dto.name } });
  }

  async remove(userId: number, id: number): Promise<void> {
    await this.getOwnedTeam(userId, id);
    const matchCount = await this.prisma.matchTeam.count({ where: { teamId: id } });
    if (matchCount > 0) {
      throw new ConflictException('This team is used in a match and cannot be deleted');
    }
    await this.prisma.team.delete({ where: { id } });
  }

  /** Returns the team if it exists and belongs to the user; 404 / 403 otherwise. */
  async getOwnedTeam(userId: number, teamId: number): Promise<Team> {
    const team = await this.prisma.team.findUnique({ where: { id: teamId } });
    if (!team) {
      throw new NotFoundException(`Team ${teamId} not found`);
    }
    if (team.ownerId !== userId) {
      throw new ForbiddenException('Only the owner of a team can change it');
    }
    return team;
  }
}
