import {
  ActorSide,
  EventAction,
  EventResult,
  Formation,
  MatchSide,
  MatchStatus,
  PlayerRole,
  PrismaClient,
  SetStatus,
  Slot,
  TacticAction,
} from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import 'dotenv/config';

const prisma = new PrismaClient();
const DEMO_PASSWORD = 'password123';

type Roster = {
  setter: number;
  opposite: number;
  outside1: number;
  outside2: number;
  middle1: number;
  middle2: number;
  libero: number;
};

const FIVE_ONE_SLOTS: { slot: Slot; key: keyof Roster }[] = [
  { slot: 'SETTER_1', key: 'setter' },
  { slot: 'OPPOSITE', key: 'opposite' },
  { slot: 'OUTSIDE_1', key: 'outside1' },
  { slot: 'OUTSIDE_2', key: 'outside2' },
  { slot: 'MIDDLE_1', key: 'middle1' },
  { slot: 'MIDDLE_2', key: 'middle2' },
  { slot: 'LIBERO', key: 'libero' },
];

async function hashPassword(plain: string) {
  return bcrypt.hash(plain, 10);
}

async function createTeam(
  ownerId: number,
  name: string,
  players: { name: string; jerseyNumber: number; role: PlayerRole }[],
): Promise<{ teamId: number; roster: Roster }> {
  const team = await prisma.team.create({ data: { ownerId, name } });
  const created = await Promise.all(
    players.map((p) =>
      prisma.player.create({
        data: { teamId: team.id, name: p.name, jerseyNumber: p.jerseyNumber, role: p.role },
      }),
    ),
  );
  const byRole = (role: PlayerRole, n = 0) => {
    const matches = created.filter((p) => p.role === role);
    const player = matches[n];
    if (!player) throw new Error(`Missing ${role} #${n} on team ${name}`);
    return player.id;
  };
  const roster: Roster = {
    setter: byRole('SETTER'),
    opposite: byRole('OPPOSITE'),
    outside1: byRole('OUTSIDE_HITTER', 0),
    outside2: byRole('OUTSIDE_HITTER', 1),
    middle1: byRole('MIDDLE_BLOCKER', 0),
    middle2: byRole('MIDDLE_BLOCKER', 1),
    libero: byRole('LIBERO'),
  };
  return { teamId: team.id, roster };
}

async function setLineup(matchTeamId: number, roster: Roster) {
  await prisma.matchLineupSlot.createMany({
    data: FIVE_ONE_SLOTS.map(({ slot, key }) => ({
      matchTeamId,
      slot,
      playerId: roster[key],
    })),
  });
}

type SeedStep = {
  actorSide: ActorSide;
  slot?: Slot | null;
  targetSlot?: Slot | null;
  action: TacticAction;
  x: number;
  y: number;
  duration: number;
  delay?: number;
  parallelWithPrevious?: boolean;
};

/** Builds 1-based `stepNumber` rows for `TacticStep.createMany`-style nested creates. */
function steps(rows: SeedStep[]) {
  return rows.map((row, index) => ({
    stepNumber: index + 1,
    delay: row.delay ?? 0,
    parallelWithPrevious: row.parallelWithPrevious ?? false,
    ...row,
  }));
}

async function createMatchSide(
  matchId: number,
  teamId: number,
  side: MatchSide,
  formation: Formation,
  roster: Roster,
) {
  const matchTeam = await prisma.matchTeam.create({
    data: { matchId, teamId, side, formation },
  });
  await setLineup(matchTeam.id, roster);
  return matchTeam;
}

async function main() {
  const passwordHash = await hashPassword(DEMO_PASSWORD);

  const coach = await prisma.user.create({
    data: { email: 'coach@volleylab.local', passwordHash },
  });
  const rival = await prisma.user.create({
    data: { email: 'rival@volleylab.local', passwordHash },
  });

  const eagleRoster = [
    { name: 'Eszter Horváth', jerseyNumber: 3, role: 'SETTER' as const },
    { name: 'Bálint Tóth', jerseyNumber: 7, role: 'OPPOSITE' as const },
    { name: 'Luca Nagy', jerseyNumber: 11, role: 'OUTSIDE_HITTER' as const },
    { name: 'Márk Szabó', jerseyNumber: 9, role: 'OUTSIDE_HITTER' as const },
    { name: 'Petra Varga', jerseyNumber: 15, role: 'MIDDLE_BLOCKER' as const },
    { name: 'Gábor Kiss', jerseyNumber: 18, role: 'MIDDLE_BLOCKER' as const },
    { name: 'Júlia Molnár', jerseyNumber: 1, role: 'LIBERO' as const },
  ];
  const spikerRoster = [
    { name: 'Kata Balogh', jerseyNumber: 5, role: 'SETTER' as const },
    { name: 'Dániel Farkas', jerseyNumber: 12, role: 'OPPOSITE' as const },
    { name: 'Réka Papp', jerseyNumber: 8, role: 'OUTSIDE_HITTER' as const },
    { name: 'Tamás Illés', jerseyNumber: 14, role: 'OUTSIDE_HITTER' as const },
    { name: 'Nóra Lukács', jerseyNumber: 16, role: 'MIDDLE_BLOCKER' as const },
    { name: 'Ádám Takács', jerseyNumber: 19, role: 'MIDDLE_BLOCKER' as const },
    { name: 'Zsófia Simon', jerseyNumber: 2, role: 'LIBERO' as const },
  ];
  const viennaRoster = [
    { name: 'Lea Brunner', jerseyNumber: 4, role: 'SETTER' as const },
    { name: 'Max Gruber', jerseyNumber: 10, role: 'OPPOSITE' as const },
    { name: 'Sara Huber', jerseyNumber: 6, role: 'OUTSIDE_HITTER' as const },
    { name: 'Felix Mayer', jerseyNumber: 13, role: 'OUTSIDE_HITTER' as const },
    { name: 'Anna Berger', jerseyNumber: 17, role: 'MIDDLE_BLOCKER' as const },
    { name: 'Tim Wagner', jerseyNumber: 20, role: 'MIDDLE_BLOCKER' as const },
    { name: 'Lena Fischer', jerseyNumber: 1, role: 'LIBERO' as const },
  ];

  const eagles = await createTeam(coach.id, 'Budapest Eagles', eagleRoster);
  const spikers = await createTeam(coach.id, 'Danube Spikers', spikerRoster);
  const vienna = await createTeam(rival.id, 'Vienna Blockers', viennaRoster);

  // Planned friendly (lineups optional until match starts).
  await prisma.match.create({
    data: {
      ownerId: coach.id,
      status: 'PLANNED',
      playedAt: new Date('2026-10-15T18:00:00Z'),
      teams: {
        create: [
          { teamId: eagles.teamId, side: 'HOME', formation: 'FIVE_ONE' },
          { teamId: spikers.teamId, side: 'AWAY', formation: 'FIVE_ONE' },
        ],
      },
    },
  });

  // Live match with set 1 in progress and a short rally logged.
  const liveMatch = await prisma.match.create({
    data: {
      ownerId: coach.id,
      status: 'IN_PROGRESS',
      playedAt: new Date(),
      teams: {
        create: [
          { teamId: eagles.teamId, side: 'HOME', formation: 'FIVE_ONE' },
          { teamId: vienna.teamId, side: 'AWAY', formation: 'FIVE_ONE' },
        ],
      },
    },
    include: { teams: true },
  });
  const liveHome = liveMatch.teams.find((t) => t.side === 'HOME')!;
  const liveAway = liveMatch.teams.find((t) => t.side === 'AWAY')!;
  await setLineup(liveHome.id, eagles.roster);
  await setLineup(liveAway.id, vienna.roster);
  const liveSet = await prisma.matchSet.create({
    data: { matchId: liveMatch.id, setNumber: 1, homeScore: 18, awayScore: 16, status: 'IN_PROGRESS' },
  });
  const rally: { playerId: number; action: EventAction; result: EventResult }[] = [
    { playerId: eagles.roster.setter, action: 'SERVE', result: 'IN_PLAY' },
    { playerId: vienna.roster.outside1, action: 'RECEPTION', result: 'GOOD' },
    { playerId: vienna.roster.setter, action: 'SET', result: 'GOOD' },
    { playerId: vienna.roster.middle1, action: 'ATTACK', result: 'IN_PLAY' },
    { playerId: eagles.roster.middle2, action: 'BLOCK', result: 'TOUCH' },
    { playerId: eagles.roster.libero, action: 'DIG', result: 'GOOD' },
    { playerId: eagles.roster.setter, action: 'SET', result: 'GOOD' },
    { playerId: eagles.roster.outside2, action: 'ATTACK', result: 'KILL' },
  ];
  for (const e of rally) {
    await prisma.matchEvent.create({
      data: { matchId: liveMatch.id, setId: liveSet.id, ...e },
    });
  }

  // Finished match with three sets and sample stats.
  const finishedMatch = await prisma.match.create({
    data: {
      ownerId: coach.id,
      status: 'FINISHED',
      playedAt: new Date('2026-09-28T16:30:00Z'),
      teams: {
        create: [
          { teamId: spikers.teamId, side: 'HOME', formation: 'FIVE_ONE' },
          { teamId: vienna.teamId, side: 'AWAY', formation: 'FIVE_ONE' },
        ],
      },
    },
    include: { teams: true },
  });
  const finHome = finishedMatch.teams.find((t) => t.side === 'HOME')!;
  const finAway = finishedMatch.teams.find((t) => t.side === 'AWAY')!;
  await setLineup(finHome.id, spikers.roster);
  await setLineup(finAway.id, vienna.roster);
  const setScores = [
    { setNumber: 1, homeScore: 25, awayScore: 21 },
    { setNumber: 2, homeScore: 22, awayScore: 25 },
    { setNumber: 3, homeScore: 25, awayScore: 23 },
  ];
  for (const s of setScores) {
    const set = await prisma.matchSet.create({
      data: { matchId: finishedMatch.id, ...s, status: 'FINISHED' },
    });
    await prisma.matchEvent.createMany({
      data: [
        {
          matchId: finishedMatch.id,
          setId: set.id,
          playerId: spikers.roster.setter,
          action: 'SERVE',
          result: 'ACE',
        },
        {
          matchId: finishedMatch.id,
          setId: set.id,
          playerId: vienna.roster.outside2,
          action: 'ATTACK',
          result: 'ERROR',
        },
        {
          matchId: finishedMatch.id,
          setId: set.id,
          playerId: spikers.roster.middle1,
          action: 'ATTACK',
          result: 'KILL',
        },
      ],
    });
  }

  await prisma.tactic.create({
    data: {
      ownerId: coach.id,
      name: 'Quick middle after pipe receive',
      description: 'Libero passes left; setter pushes a quick to MB1; opponent middle blocks.',
      formation: 'FIVE_ONE',
      opponentFormation: 'FIVE_ONE',
      rotation: 1,
      opponentRotation: 1,
      liberoReplaces: 'MIDDLE_1',
      basePositions: { 'OWN:LIBERO': { x: 3, y: 16.5 }, BALL: { x: 4.5, y: 7 } },
      steps: {
        create: steps([
          { actorSide: 'OWN', slot: 'LIBERO', action: 'RECEIVE', x: 2, y: 14, duration: 700 },
          { actorSide: 'OWN', slot: 'SETTER_1', targetSlot: 'MIDDLE_1', action: 'SET', x: 4.5, y: 10, duration: 600, delay: 100 },
          { actorSide: 'OWN', slot: 'MIDDLE_1', action: 'ATTACK', x: 5, y: 9, duration: 500 },
          { actorSide: 'OPPONENT', slot: 'MIDDLE_2', action: 'BLOCK', x: 5, y: 8, duration: 450 },
        ]),
      },
    },
  });

  await prisma.tactic.create({
    data: {
      ownerId: coach.id,
      name: 'K1 high ball outside',
      description: 'Classic in-system pass; setter releases a high ball to OH1; block on the pin.',
      formation: 'FIVE_ONE',
      opponentFormation: 'FIVE_ONE',
      rotation: 1,
      liberoReplaces: 'MIDDLE_2',
      steps: {
        create: steps([
          { actorSide: 'OWN', slot: 'LIBERO', action: 'RECEIVE', x: 3, y: 15.5, duration: 720 },
          { actorSide: 'OWN', slot: 'SETTER_1', targetSlot: 'OUTSIDE_1', action: 'SET', x: 4.4, y: 10.2, duration: 620, delay: 80 },
          { actorSide: 'OWN', slot: 'OUTSIDE_1', action: 'ATTACK', x: 1.2, y: 8.5, duration: 520 },
          { actorSide: 'OPPONENT', slot: 'OUTSIDE_2', action: 'BLOCK', x: 1.5, y: 9.5, duration: 480 },
        ]),
      },
    },
  });

  await prisma.tactic.create({
    data: {
      ownerId: coach.id,
      name: 'Back-row attack option',
      description: 'High ball to opposite after in-system receive.',
      formation: 'FIVE_ONE',
      opponentFormation: 'FIVE_ONE',
      rotation: 2,
      liberoReplaces: 'OUTSIDE_2',
      steps: {
        create: steps([
          { actorSide: 'OWN', slot: 'OUTSIDE_1', action: 'RECEIVE', x: 1.5, y: 15, duration: 750 },
          { actorSide: 'OWN', slot: 'SETTER_1', targetSlot: 'OPPOSITE', action: 'SET', x: 4.2, y: 10.5, duration: 650, delay: 50 },
          { actorSide: 'OWN', slot: 'OPPOSITE', action: 'ATTACK', x: 4.8, y: 9.2, duration: 550 },
        ]),
      },
    },
  });

  await prisma.tactic.create({
    data: {
      ownerId: coach.id,
      name: 'Setter hides, then releases',
      description: 'Setter moves into position after pass, then sets opposite for a pipe attack.',
      formation: 'FIVE_ONE',
      opponentFormation: 'FIVE_ONE',
      rotation: 3,
      liberoReplaces: 'MIDDLE_1',
      steps: {
        create: steps([
          { actorSide: 'OWN', slot: 'LIBERO', action: 'RECEIVE', x: 6.5, y: 14.8, duration: 700 },
          { actorSide: 'OWN', slot: 'SETTER_1', action: 'MOVE', x: 4.6, y: 10.8, duration: 500, delay: 120 },
          { actorSide: 'OWN', slot: 'SETTER_1', targetSlot: 'OPPOSITE', action: 'SET', x: 4.5, y: 10.5, duration: 550 },
          { actorSide: 'OWN', slot: 'OPPOSITE', action: 'ATTACK', x: 5.2, y: 14.2, duration: 580 },
          { actorSide: 'OPPONENT', slot: 'MIDDLE_1', action: 'BLOCK', x: 5, y: 10.5, duration: 450 },
        ]),
      },
    },
  });

  await prisma.tactic.create({
    data: {
      ownerId: coach.id,
      name: '6-2 push to pin',
      description: '6-2 formation: back-row setter delivers a high ball to OH2.',
      formation: 'SIX_TWO',
      opponentFormation: 'FIVE_ONE',
      rotation: 4,
      opponentRotation: 2,
      liberoReplaces: 'MIDDLE_2',
      steps: {
        create: steps([
          { actorSide: 'OWN', slot: 'LIBERO', action: 'RECEIVE', x: 7, y: 15, duration: 710 },
          { actorSide: 'OWN', slot: 'SETTER_2', targetSlot: 'OUTSIDE_2', action: 'SET', x: 5.5, y: 10, duration: 600, delay: 90 },
          { actorSide: 'OWN', slot: 'OUTSIDE_2', action: 'ATTACK', x: 7.8, y: 8.8, duration: 530 },
          { actorSide: 'OPPONENT', slot: 'OUTSIDE_1', action: 'BLOCK', x: 7.2, y: 9.2, duration: 460 },
        ]),
      },
    },
  });

  await prisma.tactic.create({
    data: {
      ownerId: coach.id,
      name: '4-2 quick middle',
      description: '4-2 system: front-row setter runs a one-ball to MB1.',
      formation: 'FOUR_TWO',
      opponentFormation: 'FOUR_TWO',
      rotation: 1,
      opponentRotation: 1,
      liberoReplaces: 'OUTSIDE_2',
      steps: {
        create: steps([
          { actorSide: 'OWN', slot: 'OUTSIDE_1', action: 'RECEIVE', x: 2, y: 15.2, duration: 740 },
          { actorSide: 'OWN', slot: 'SETTER_1', targetSlot: 'MIDDLE_1', action: 'SET', x: 4.3, y: 9.8, duration: 580, delay: 70 },
          { actorSide: 'OWN', slot: 'MIDDLE_1', action: 'ATTACK', x: 4.6, y: 8.6, duration: 500 },
          { actorSide: 'OPPONENT', slot: 'MIDDLE_2', action: 'BLOCK', x: 4.5, y: 9.8, duration: 440 },
        ]),
      },
    },
  });

  await prisma.tactic.create({
    data: {
      ownerId: coach.id,
      name: 'Slide + block read',
      description: 'Outside pipe receive; setter moves; MB1 attacks short as middles commit.',
      formation: 'FIVE_ONE',
      opponentFormation: 'FIVE_ONE',
      rotation: 5,
      opponentRotation: 4,
      liberoReplaces: 'MIDDLE_2',
      basePositions: {
        BALL: { x: 4.5, y: 17 },
        'OPPONENT:MIDDLE_1': { x: 3.5, y: 9.5 },
        'OPPONENT:MIDDLE_2': { x: 5.5, y: 9.5 },
      },
      steps: {
        create: steps([
          { actorSide: 'OWN', slot: 'LIBERO', action: 'RECEIVE', x: 5.5, y: 15, duration: 680 },
          { actorSide: 'OWN', slot: 'SETTER_1', action: 'MOVE', x: 3.8, y: 10.2, duration: 480, delay: 100 },
          { actorSide: 'OWN', slot: 'SETTER_1', targetSlot: 'MIDDLE_1', action: 'SET', x: 3.9, y: 10, duration: 520 },
          { actorSide: 'OWN', slot: 'MIDDLE_1', action: 'ATTACK', x: 3.5, y: 8.8, duration: 510 },
          { actorSide: 'OPPONENT', slot: 'MIDDLE_1', action: 'BLOCK', x: 3.6, y: 9.2, duration: 420 },
        ]),
      },
    },
  });

  await prisma.tactic.create({
    data: {
      ownerId: rival.id,
      name: 'Vienna counter: high ball OH',
      description: 'Simple receive–set–attack template for the Vienna roster.',
      formation: 'FIVE_ONE',
      opponentFormation: 'FIVE_ONE',
      rotation: 1,
      liberoReplaces: 'MIDDLE_1',
      steps: {
        create: steps([
          { actorSide: 'OWN', slot: 'LIBERO', action: 'RECEIVE', x: 4, y: 15, duration: 700 },
          { actorSide: 'OWN', slot: 'SETTER_1', targetSlot: 'OUTSIDE_1', action: 'SET', x: 4.5, y: 10, duration: 600 },
          { actorSide: 'OWN', slot: 'OUTSIDE_1', action: 'ATTACK', x: 2, y: 9, duration: 520 },
        ]),
      },
    },
  });

  console.log('\nDatabase seeded successfully.\n');
  console.log('Demo logins (password for both: %s)', DEMO_PASSWORD);
  console.log('  coach@volleylab.local  — 3 teams, 3 matches, 7 tactics (5-1 / 6-2 / 4-2 examples)');
  console.log('  rival@volleylab.local  — 1 team, 1 tactic\n');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
