import { Body, Controller, Get, Param, ParseEnumPipe, Patch, Post, Put } from '@nestjs/common';
import { MatchSide } from '@prisma/client';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { ParseIdPipe } from '../common/parse-id.pipe';
import { CreateMatchDto, SetLineupDto, UpdateMatchDto } from './dto/match.dto';
import { MatchesService } from './matches.service';

@ApiTags('matches')
@ApiBearerAuth()
@Controller('matches')
export class MatchesController {
  constructor(private readonly matches: MatchesService) {}

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateMatchDto) {
    return this.matches.create(user.id, dto);
  }

  @Get()
  findAll(@CurrentUser() user: AuthUser) {
    return this.matches.findAll(user.id);
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthUser, @Param('id', ParseIdPipe) id: number) {
    return this.matches.findOne(user.id, id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIdPipe) id: number,
    @Body() dto: UpdateMatchDto,
  ) {
    return this.matches.update(user.id, id, dto);
  }

  @Put(':id/teams/:side/lineup')
  setLineup(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIdPipe) id: number,
    @Param('side', new ParseEnumPipe(MatchSide)) side: MatchSide,
    @Body() dto: SetLineupDto,
  ) {
    return this.matches.setLineup(user.id, id, side, dto);
  }
}
