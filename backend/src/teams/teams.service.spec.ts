import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { TeamsService } from './teams.service';

describe('TeamsService', () => {
  const prisma = {
    team: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    matchTeam: { count: jest.fn() },
  };
  let service: TeamsService;

  beforeEach(() => {
    jest.resetAllMocks();
    service = new TeamsService(prisma as never);
  });

  it('creates a team owned by the current user', async () => {
    prisma.team.create.mockResolvedValue({ id: 1 });

    await service.create(5, { name: 'BME VC' });

    expect(prisma.team.create).toHaveBeenCalledWith({ data: { name: 'BME VC', ownerId: 5 } });
  });

  describe('findAll', () => {
    it('returns all teams by default (teams are shared)', async () => {
      prisma.team.findMany.mockResolvedValue([]);

      await service.findAll(5, false);

      expect(prisma.team.findMany.mock.calls[0][0].where).toEqual({});
    });

    it('returns only own teams when mine is requested', async () => {
      prisma.team.findMany.mockResolvedValue([]);

      await service.findAll(5, true);

      expect(prisma.team.findMany.mock.calls[0][0].where).toEqual({ ownerId: 5 });
    });
  });

  describe('findOne', () => {
    it('lets any user read a team', async () => {
      prisma.team.findUnique.mockResolvedValue({ id: 1, ownerId: 99, players: [] });

      await expect(service.findOne(1)).resolves.toMatchObject({ id: 1 });
    });

    it('throws NotFound for an unknown team', async () => {
      prisma.team.findUnique.mockResolvedValue(null);

      await expect(service.findOne(1)).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('getOwnedTeam', () => {
    it('returns the team for its owner', async () => {
      prisma.team.findUnique.mockResolvedValue({ id: 1, ownerId: 5 });

      await expect(service.getOwnedTeam(5, 1)).resolves.toMatchObject({ id: 1 });
    });

    it('throws Forbidden for another user', async () => {
      prisma.team.findUnique.mockResolvedValue({ id: 1, ownerId: 99 });

      await expect(service.getOwnedTeam(5, 1)).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('throws NotFound for an unknown team', async () => {
      prisma.team.findUnique.mockResolvedValue(null);

      await expect(service.getOwnedTeam(5, 1)).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('update', () => {
    it('does not let a non-owner rename the team', async () => {
      prisma.team.findUnique.mockResolvedValue({ id: 1, ownerId: 99 });

      await expect(service.update(5, 1, { name: 'Hijacked' })).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(prisma.team.update).not.toHaveBeenCalled();
    });

    it('renames the team for the owner', async () => {
      prisma.team.findUnique.mockResolvedValue({ id: 1, ownerId: 5 });
      prisma.team.update.mockResolvedValue({ id: 1, name: 'New' });

      await service.update(5, 1, { name: 'New' });

      expect(prisma.team.update).toHaveBeenCalledWith({ where: { id: 1 }, data: { name: 'New' } });
    });
  });

  describe('remove', () => {
    it('does not let a non-owner delete the team', async () => {
      prisma.team.findUnique.mockResolvedValue({ id: 1, ownerId: 99 });

      await expect(service.remove(5, 1)).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.team.delete).not.toHaveBeenCalled();
    });

    it('rejects deleting a team that is used in a match', async () => {
      prisma.team.findUnique.mockResolvedValue({ id: 1, ownerId: 5 });
      prisma.matchTeam.count.mockResolvedValue(1);

      await expect(service.remove(5, 1)).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.team.delete).not.toHaveBeenCalled();
    });

    it('deletes an unused team of the owner', async () => {
      prisma.team.findUnique.mockResolvedValue({ id: 1, ownerId: 5 });
      prisma.matchTeam.count.mockResolvedValue(0);

      await service.remove(5, 1);

      expect(prisma.team.delete).toHaveBeenCalledWith({ where: { id: 1 } });
    });
  });
});
