import { Module } from '@nestjs/common';
import { TeamsModule } from '../teams/teams.module';
import { PlayersController } from './players.controller';
import { PlayersService } from './players.service';

@Module({
  imports: [TeamsModule],
  controllers: [PlayersController],
  providers: [PlayersService],
})
export class PlayersModule {}
