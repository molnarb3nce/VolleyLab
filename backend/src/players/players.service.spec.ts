import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PlayersService } from './players.service';

describe('PlayersService', () => {
  const prisma = {
    player: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    matchEvent: { count: jest.fn() },
    matchLineupSlot: { count: jest.fn() },
  };
  const teams = { getOwnedTeam: jest.fn() };
  let service: PlayersService;

  const dto = { name: 'Bence', jerseyNumber: 7, role: 'SETTER' as const };

  beforeEach(() => {
    jest.resetAllMocks();
    service = new PlayersService(prisma as never, teams as never);
  });

  describe('create', () => {
    it('creates a player in a team owned by the user', async () => {
      teams.getOwnedTeam.mockResolvedValue({ id: 1, ownerId: 5 });
      prisma.player.findUnique.mockResolvedValue(null);
      prisma.player.create.mockResolvedValue({ id: 10 });

      await service.create(5, 1, dto);

      expect(teams.getOwnedTeam).toHaveBeenCalledWith(5, 1);
      expect(prisma.player.create).toHaveBeenCalledWith({
        data: { teamId: 1, name: 'Bence', jerseyNumber: 7, role: 'SETTER' },
      });
    });

    it('propagates Forbidden when the team belongs to someone else', async () => {
      teams.getOwnedTeam.mockRejectedValue(new ForbiddenException());

      await expect(service.create(5, 1, dto)).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.player.create).not.toHaveBeenCalled();
    });

    it('rejects a duplicate jersey number within the team', async () => {
      teams.getOwnedTeam.mockResolvedValue({ id: 1, ownerId: 5 });
      prisma.player.findUnique.mockResolvedValue({ id: 3, jerseyNumber: 7 });

      await expect(service.create(5, 1, dto)).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.player.create).not.toHaveBeenCalled();
    });

    it('turns a unique-constraint race into a conflict', async () => {
      teams.getOwnedTeam.mockResolvedValue({ id: 1, ownerId: 5 });
      prisma.player.findUnique.mockResolvedValue(null);
      prisma.player.create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('duplicate', {
          code: 'P2002',
          clientVersion: 'test',
        }),
      );

      await expect(service.create(5, 1, dto)).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('update', () => {
    const existing = { id: 10, teamId: 1, jerseyNumber: 7, team: { ownerId: 5 } };

    it('throws NotFound for an unknown player', async () => {
      prisma.player.findUnique.mockResolvedValue(null);

      await expect(service.update(5, 10, { name: 'X' })).rejects.toBeInstanceOf(NotFoundException);
    });

    it('does not let a non-owner change a player', async () => {
      prisma.player.findUnique.mockResolvedValue({ ...existing, team: { ownerId: 99 } });

      await expect(service.update(5, 10, { name: 'X' })).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(prisma.player.update).not.toHaveBeenCalled();
    });

    it('rejects changing to a jersey number already used in the team', async () => {
      prisma.player.findUnique
        .mockResolvedValueOnce(existing) // the player itself
        .mockResolvedValueOnce({ id: 11, jerseyNumber: 9 }); // clash lookup

      await expect(service.update(5, 10, { jerseyNumber: 9 })).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it('does not run the clash check when the jersey number is unchanged', async () => {
      prisma.player.findUnique.mockResolvedValueOnce(existing);
      prisma.player.update.mockResolvedValue(existing);

      await service.update(5, 10, { jerseyNumber: 7, name: 'Renamed' });

      expect(prisma.player.findUnique).toHaveBeenCalledTimes(1);
      expect(prisma.player.update).toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    const existing = { id: 10, teamId: 1, team: { ownerId: 5 } };

    it('does not let a non-owner remove a player', async () => {
      prisma.player.findUnique.mockResolvedValue({ ...existing, team: { ownerId: 99 } });

      await expect(service.remove(5, 10)).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('hard-deletes a player without events or lineup entries', async () => {
      prisma.player.findUnique.mockResolvedValue(existing);
      prisma.matchEvent.count.mockResolvedValue(0);
      prisma.matchLineupSlot.count.mockResolvedValue(0);

      await expect(service.remove(5, 10)).resolves.toEqual({ result: 'deleted' });
      expect(prisma.player.delete).toHaveBeenCalledWith({ where: { id: 10 } });
    });

    it('only deactivates a player that has events (statistics must stay reproducible)', async () => {
      prisma.player.findUnique.mockResolvedValue(existing);
      prisma.matchEvent.count.mockResolvedValue(3);
      prisma.matchLineupSlot.count.mockResolvedValue(0);

      await expect(service.remove(5, 10)).resolves.toEqual({ result: 'deactivated' });
      expect(prisma.player.delete).not.toHaveBeenCalled();
      expect(prisma.player.update).toHaveBeenCalledWith({
        where: { id: 10 },
        data: { isActive: false },
      });
    });

    it('only deactivates a player that is part of a lineup', async () => {
      prisma.player.findUnique.mockResolvedValue(existing);
      prisma.matchEvent.count.mockResolvedValue(0);
      prisma.matchLineupSlot.count.mockResolvedValue(1);

      await expect(service.remove(5, 10)).resolves.toEqual({ result: 'deactivated' });
      expect(prisma.player.delete).not.toHaveBeenCalled();
    });
  });
});
