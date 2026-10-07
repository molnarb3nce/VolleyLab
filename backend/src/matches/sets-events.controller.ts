import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { ParseIdPipe } from '../common/parse-id.pipe';
import { CreateEventDto, UpdateSetDto } from './dto/set-event.dto';
import { EventsService } from './events.service';
import { SetsService } from './sets.service';

@ApiTags('matches')
@ApiBearerAuth()
@Controller('matches/:matchId')
export class SetsEventsController {
  constructor(
    private readonly sets: SetsService,
    private readonly events: EventsService,
  ) {}

  @Post('sets')
  createSet(@CurrentUser() user: AuthUser, @Param('matchId', ParseIdPipe) matchId: number) {
    return this.sets.create(user.id, matchId);
  }

  @Patch('sets/:setId')
  updateSet(
    @CurrentUser() user: AuthUser,
    @Param('matchId', ParseIdPipe) matchId: number,
    @Param('setId', ParseIdPipe) setId: number,
    @Body() dto: UpdateSetDto,
  ) {
    return this.sets.update(user.id, matchId, setId, dto);
  }

  @Post('events')
  createEvent(
    @CurrentUser() user: AuthUser,
    @Param('matchId', ParseIdPipe) matchId: number,
    @Body() dto: CreateEventDto,
  ) {
    return this.events.create(user.id, matchId, dto);
  }

  @Get('events')
  findEvents(@CurrentUser() user: AuthUser, @Param('matchId', ParseIdPipe) matchId: number) {
    return this.events.findAll(user.id, matchId);
  }

  @Delete('events/:eventId')
  @HttpCode(204)
  removeEvent(
    @CurrentUser() user: AuthUser,
    @Param('matchId', ParseIdPipe) matchId: number,
    @Param('eventId', ParseIdPipe) eventId: number,
  ) {
    return this.events.remove(user.id, matchId, eventId);
  }
}
