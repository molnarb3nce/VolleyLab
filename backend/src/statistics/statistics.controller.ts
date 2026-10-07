import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { ParseIdPipe, parseId } from '../common/parse-id.pipe';
import { StatisticsService } from './statistics.service';

@ApiTags('statistics')
@ApiBearerAuth()
@Controller()
export class StatisticsController {
  constructor(private readonly statistics: StatisticsService) {}

  @ApiQuery({ name: 'setId', required: false, description: 'Only count events of this set' })
  @Get('matches/:id/statistics')
  forMatch(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIdPipe) id: number,
    @Query('setId') setId?: string, // kept a string: the global ValidationPipe would turn "missing" into NaN
  ) {
    return this.statistics.forMatch(user.id, id, setId === undefined ? undefined : parseId(setId));
  }

  @Get('players/:id/statistics')
  forPlayer(@CurrentUser() user: AuthUser, @Param('id', ParseIdPipe) id: number) {
    return this.statistics.forPlayer(user.id, id);
  }
}
