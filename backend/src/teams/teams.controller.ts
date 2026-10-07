import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { ParseIdPipe } from '../common/parse-id.pipe';
import { CreateTeamDto, UpdateTeamDto } from './dto/team.dto';
import { TeamsService } from './teams.service';

@ApiTags('teams')
@ApiBearerAuth()
@Controller('teams')
export class TeamsController {
  constructor(private readonly teams: TeamsService) {}

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateTeamDto) {
    return this.teams.create(user.id, dto);
  }

  @ApiQuery({ name: 'mine', required: false, description: 'true = only my own teams' })
  @Get()
  findAll(@CurrentUser() user: AuthUser, @Query('mine') mine?: string) {
    return this.teams.findAll(user.id, mine === 'true');
  }

  @ApiQuery({ name: 'includeInactive', required: false, description: 'true = also list deactivated players' })
  @Get(':id')
  findOne(@Param('id', ParseIdPipe) id: number, @Query('includeInactive') includeInactive?: string) {
    return this.teams.findOne(id, includeInactive === 'true');
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIdPipe) id: number,
    @Body() dto: UpdateTeamDto,
  ) {
    return this.teams.update(user.id, id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@CurrentUser() user: AuthUser, @Param('id', ParseIdPipe) id: number) {
    return this.teams.remove(user.id, id);
  }
}
