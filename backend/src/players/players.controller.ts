import { Body, Controller, Delete, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { CreatePlayerDto, UpdatePlayerDto } from './dto/player.dto';
import { PlayersService } from './players.service';

@ApiTags('players')
@ApiBearerAuth()
@Controller()
export class PlayersController {
  constructor(private readonly players: PlayersService) {}

  @Post('teams/:teamId/players')
  create(
    @CurrentUser() user: AuthUser,
    @Param('teamId', ParseIntPipe) teamId: number,
    @Body() dto: CreatePlayerDto,
  ) {
    return this.players.create(user.id, teamId, dto);
  }

  @Patch('players/:id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePlayerDto,
  ) {
    return this.players.update(user.id, id, dto);
  }

  @Delete('players/:id')
  remove(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.players.remove(user.id, id);
  }
}
