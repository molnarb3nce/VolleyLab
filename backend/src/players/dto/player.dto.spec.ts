import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateTeamDto } from '../../teams/dto/team.dto';
import { CreatePlayerDto } from './player.dto';

const errorsFor = async <T extends object>(cls: new () => T, plain: object) =>
  validate(plainToInstance(cls, plain));

describe('CreatePlayerDto', () => {
  const valid = { name: 'Bence', jerseyNumber: 7, role: 'SETTER' };

  it('accepts a valid player', async () => {
    expect(await errorsFor(CreatePlayerDto, valid)).toHaveLength(0);
  });

  it.each([0, 99])('accepts jersey number %i (range boundaries)', async (jerseyNumber) => {
    expect(await errorsFor(CreatePlayerDto, { ...valid, jerseyNumber })).toHaveLength(0);
  });

  it.each([-1, 100, 7.5, '7'])('rejects jersey number %p', async (jerseyNumber) => {
    const errors = await errorsFor(CreatePlayerDto, { ...valid, jerseyNumber });
    expect(errors.map((e) => e.property)).toContain('jerseyNumber');
  });

  it('rejects an unknown role', async () => {
    const errors = await errorsFor(CreatePlayerDto, { ...valid, role: 'GOALKEEPER' });
    expect(errors.map((e) => e.property)).toContain('role');
  });

  it('rejects a blank name', async () => {
    const errors = await errorsFor(CreatePlayerDto, { ...valid, name: '   ' });
    expect(errors.map((e) => e.property)).toContain('name');
  });
});

describe('CreateTeamDto', () => {
  it('accepts a normal name and trims it', async () => {
    const dto = plainToInstance(CreateTeamDto, { name: '  BME VC  ' });
    expect(await validate(dto)).toHaveLength(0);
    expect(dto.name).toBe('BME VC');
  });

  it.each(['', '   '])('rejects an empty name (%p)', async (name) => {
    const errors = await errorsFor(CreateTeamDto, { name });
    expect(errors.map((e) => e.property)).toContain('name');
  });

  it('rejects a missing name', async () => {
    const errors = await errorsFor(CreateTeamDto, {});
    expect(errors.map((e) => e.property)).toContain('name');
  });
});
