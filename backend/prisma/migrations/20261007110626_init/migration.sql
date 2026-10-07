-- CreateEnum
CREATE TYPE "PlayerRole" AS ENUM ('SETTER', 'OUTSIDE_HITTER', 'MIDDLE_BLOCKER', 'OPPOSITE', 'LIBERO');

-- CreateEnum
CREATE TYPE "Formation" AS ENUM ('FIVE_ONE', 'SIX_TWO', 'FOUR_TWO');

-- CreateEnum
CREATE TYPE "Slot" AS ENUM ('SETTER_1', 'SETTER_2', 'OPPOSITE', 'OUTSIDE_1', 'OUTSIDE_2', 'MIDDLE_1', 'MIDDLE_2', 'LIBERO');

-- CreateEnum
CREATE TYPE "MatchStatus" AS ENUM ('PLANNED', 'IN_PROGRESS', 'FINISHED');

-- CreateEnum
CREATE TYPE "MatchSide" AS ENUM ('HOME', 'AWAY');

-- CreateEnum
CREATE TYPE "SetStatus" AS ENUM ('IN_PROGRESS', 'FINISHED');

-- CreateEnum
CREATE TYPE "EventAction" AS ENUM ('SERVE', 'RECEPTION', 'SET', 'ATTACK', 'BLOCK', 'DIG');

-- CreateEnum
CREATE TYPE "EventResult" AS ENUM ('ACE', 'IN_PLAY', 'ERROR', 'PERFECT', 'GOOD', 'POOR', 'KILL', 'BLOCKED', 'POINT', 'TOUCH');

-- CreateEnum
CREATE TYPE "ActorSide" AS ENUM ('OWN', 'OPPONENT', 'BALL');

-- CreateEnum
CREATE TYPE "TacticAction" AS ENUM ('MOVE', 'RECEIVE', 'SET', 'ATTACK', 'BLOCK');

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Team" (
    "id" SERIAL NOT NULL,
    "ownerId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Player" (
    "id" SERIAL NOT NULL,
    "teamId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "jerseyNumber" INTEGER NOT NULL,
    "role" "PlayerRole" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Player_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Match" (
    "id" SERIAL NOT NULL,
    "ownerId" INTEGER NOT NULL,
    "playedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "MatchStatus" NOT NULL DEFAULT 'PLANNED',

    CONSTRAINT "Match_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MatchTeam" (
    "id" SERIAL NOT NULL,
    "matchId" INTEGER NOT NULL,
    "teamId" INTEGER NOT NULL,
    "side" "MatchSide" NOT NULL,
    "formation" "Formation" NOT NULL,

    CONSTRAINT "MatchTeam_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MatchLineupSlot" (
    "id" SERIAL NOT NULL,
    "matchTeamId" INTEGER NOT NULL,
    "slot" "Slot" NOT NULL,
    "playerId" INTEGER NOT NULL,

    CONSTRAINT "MatchLineupSlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MatchSet" (
    "id" SERIAL NOT NULL,
    "matchId" INTEGER NOT NULL,
    "setNumber" INTEGER NOT NULL,
    "homeScore" INTEGER NOT NULL DEFAULT 0,
    "awayScore" INTEGER NOT NULL DEFAULT 0,
    "status" "SetStatus" NOT NULL DEFAULT 'IN_PROGRESS',

    CONSTRAINT "MatchSet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MatchEvent" (
    "id" SERIAL NOT NULL,
    "matchId" INTEGER NOT NULL,
    "setId" INTEGER NOT NULL,
    "playerId" INTEGER NOT NULL,
    "action" "EventAction" NOT NULL,
    "result" "EventResult" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MatchEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tactic" (
    "id" SERIAL NOT NULL,
    "ownerId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "formation" "Formation" NOT NULL,
    "opponentFormation" "Formation" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Tactic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TacticStep" (
    "id" SERIAL NOT NULL,
    "tacticId" INTEGER NOT NULL,
    "stepNumber" INTEGER NOT NULL,
    "actorSide" "ActorSide" NOT NULL,
    "slot" "Slot",
    "targetSlot" "Slot",
    "action" "TacticAction" NOT NULL,
    "x" DOUBLE PRECISION NOT NULL,
    "y" DOUBLE PRECISION NOT NULL,
    "duration" INTEGER NOT NULL,

    CONSTRAINT "TacticStep_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Team_ownerId_idx" ON "Team"("ownerId");

-- CreateIndex
CREATE INDEX "Player_teamId_idx" ON "Player"("teamId");

-- CreateIndex
CREATE UNIQUE INDEX "Player_teamId_jerseyNumber_key" ON "Player"("teamId", "jerseyNumber");

-- CreateIndex
CREATE INDEX "Match_ownerId_idx" ON "Match"("ownerId");

-- CreateIndex
CREATE INDEX "MatchTeam_teamId_idx" ON "MatchTeam"("teamId");

-- CreateIndex
CREATE UNIQUE INDEX "MatchTeam_matchId_side_key" ON "MatchTeam"("matchId", "side");

-- CreateIndex
CREATE UNIQUE INDEX "MatchTeam_matchId_teamId_key" ON "MatchTeam"("matchId", "teamId");

-- CreateIndex
CREATE INDEX "MatchLineupSlot_playerId_idx" ON "MatchLineupSlot"("playerId");

-- CreateIndex
CREATE UNIQUE INDEX "MatchLineupSlot_matchTeamId_slot_key" ON "MatchLineupSlot"("matchTeamId", "slot");

-- CreateIndex
CREATE UNIQUE INDEX "MatchLineupSlot_matchTeamId_playerId_key" ON "MatchLineupSlot"("matchTeamId", "playerId");

-- CreateIndex
CREATE UNIQUE INDEX "MatchSet_matchId_setNumber_key" ON "MatchSet"("matchId", "setNumber");

-- CreateIndex
CREATE UNIQUE INDEX "MatchSet_id_matchId_key" ON "MatchSet"("id", "matchId");

-- CreateIndex
CREATE INDEX "MatchEvent_matchId_idx" ON "MatchEvent"("matchId");

-- CreateIndex
CREATE INDEX "MatchEvent_setId_idx" ON "MatchEvent"("setId");

-- CreateIndex
CREATE INDEX "MatchEvent_playerId_idx" ON "MatchEvent"("playerId");

-- CreateIndex
CREATE INDEX "Tactic_ownerId_idx" ON "Tactic"("ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "TacticStep_tacticId_stepNumber_key" ON "TacticStep"("tacticId", "stepNumber");

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Player" ADD CONSTRAINT "Player_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchTeam" ADD CONSTRAINT "MatchTeam_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchTeam" ADD CONSTRAINT "MatchTeam_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchLineupSlot" ADD CONSTRAINT "MatchLineupSlot_matchTeamId_fkey" FOREIGN KEY ("matchTeamId") REFERENCES "MatchTeam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchLineupSlot" ADD CONSTRAINT "MatchLineupSlot_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchSet" ADD CONSTRAINT "MatchSet_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchEvent" ADD CONSTRAINT "MatchEvent_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchEvent" ADD CONSTRAINT "MatchEvent_setId_matchId_fkey" FOREIGN KEY ("setId", "matchId") REFERENCES "MatchSet"("id", "matchId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchEvent" ADD CONSTRAINT "MatchEvent_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tactic" ADD CONSTRAINT "Tactic_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TacticStep" ADD CONSTRAINT "TacticStep_tacticId_fkey" FOREIGN KEY ("tacticId") REFERENCES "Tactic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- Business-rule CHECK constraints (not expressible in schema.prisma).
-- They are a safety net below the service layer; see project-context.md.
-- ---------------------------------------------------------------------------

-- Teams / players
ALTER TABLE "Team" ADD CONSTRAINT "Team_name_not_blank" CHECK (btrim("name") <> '');
ALTER TABLE "Player" ADD CONSTRAINT "Player_name_not_blank" CHECK (btrim("name") <> '');
ALTER TABLE "Player" ADD CONSTRAINT "Player_jerseyNumber_range" CHECK ("jerseyNumber" BETWEEN 0 AND 99);

-- Sets: numbering starts at 1, scores cannot be negative
ALTER TABLE "MatchSet" ADD CONSTRAINT "MatchSet_setNumber_positive" CHECK ("setNumber" >= 1);
ALTER TABLE "MatchSet" ADD CONSTRAINT "MatchSet_scores_non_negative" CHECK ("homeScore" >= 0 AND "awayScore" >= 0);

-- Events: the result must be valid for the action
ALTER TABLE "MatchEvent" ADD CONSTRAINT "MatchEvent_result_valid_for_action" CHECK (
  ("action" = 'SERVE'     AND "result" IN ('ACE', 'IN_PLAY', 'ERROR')) OR
  ("action" = 'RECEPTION' AND "result" IN ('PERFECT', 'GOOD', 'POOR', 'ERROR')) OR
  ("action" = 'SET'       AND "result" IN ('GOOD', 'POOR', 'ERROR')) OR
  ("action" = 'ATTACK'    AND "result" IN ('KILL', 'IN_PLAY', 'BLOCKED', 'ERROR')) OR
  ("action" = 'BLOCK'     AND "result" IN ('POINT', 'TOUCH', 'ERROR')) OR
  ("action" = 'DIG'       AND "result" IN ('GOOD', 'POOR', 'ERROR'))
);

-- Tactics: a name is required; steps are numbered from 1, stay inside the
-- court (x 0..9, y 0..18), and every non-ball actor needs a slot
ALTER TABLE "Tactic" ADD CONSTRAINT "Tactic_name_not_blank" CHECK (btrim("name") <> '');
ALTER TABLE "TacticStep" ADD CONSTRAINT "TacticStep_stepNumber_positive" CHECK ("stepNumber" >= 1);
ALTER TABLE "TacticStep" ADD CONSTRAINT "TacticStep_x_in_court" CHECK ("x" >= 0 AND "x" <= 9);
ALTER TABLE "TacticStep" ADD CONSTRAINT "TacticStep_y_in_court" CHECK ("y" >= 0 AND "y" <= 18);
ALTER TABLE "TacticStep" ADD CONSTRAINT "TacticStep_duration_non_negative" CHECK ("duration" >= 0);
ALTER TABLE "TacticStep" ADD CONSTRAINT "TacticStep_slot_required_for_players" CHECK ("actorSide" = 'BALL' OR "slot" IS NOT NULL);
