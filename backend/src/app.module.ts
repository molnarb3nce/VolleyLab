import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { FormationsController } from './formations/formations.controller';
import { HealthController } from './health/health.controller';
import { MatchesModule } from './matches/matches.module';
import { PlayersModule } from './players/players.module';
import { PrismaModule } from './prisma/prisma.module';
import { StatisticsModule } from './statistics/statistics.module';
import { TeamsModule } from './teams/teams.module';

@Module({
  imports: [
    // Loads .env. Variables that are already set (e.g. by the e2e tests) are not overridden.
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    TeamsModule,
    PlayersModule,
    MatchesModule,
    StatisticsModule,
  ],
  controllers: [HealthController, FormationsController],
  providers: [{ provide: APP_GUARD, useClass: JwtAuthGuard }],
})
export class AppModule {}

