import { Module } from '@nestjs/common';
import { EventsService } from './events.service';
import { MatchesController } from './matches.controller';
import { MatchesService } from './matches.service';
import { SetsEventsController } from './sets-events.controller';
import { SetsService } from './sets.service';

@Module({
  controllers: [MatchesController, SetsEventsController],
  providers: [MatchesService, SetsService, EventsService],
})
export class MatchesModule {}
