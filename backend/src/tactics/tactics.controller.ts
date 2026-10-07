import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { ParseIdPipe } from '../common/parse-id.pipe';
import {
  CreateTacticDto,
  SetStepsDto,
  UpdateTacticDto,
  ValidateTacticDto,
} from './dto/tactic.dto';
import { TacticsService } from './tactics.service';

@ApiTags('tactics')
@ApiBearerAuth()
@Controller('tactics')
export class TacticsController {
  constructor(private readonly tactics: TacticsService) {}

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateTacticDto) {
    return this.tactics.create(user.id, dto);
  }

  @Get()
  findAll(@CurrentUser() user: AuthUser) {
    return this.tactics.findAll(user.id);
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthUser, @Param('id', ParseIdPipe) id: number) {
    return this.tactics.findOne(user.id, id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIdPipe) id: number,
    @Body() dto: UpdateTacticDto,
  ) {
    return this.tactics.update(user.id, id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@CurrentUser() user: AuthUser, @Param('id', ParseIdPipe) id: number) {
    return this.tactics.remove(user.id, id);
  }

  @Put(':id/steps')
  setSteps(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIdPipe) id: number,
    @Body() dto: SetStepsDto,
  ) {
    return this.tactics.setSteps(user.id, id, dto);
  }

  @Post(':id/validate')
  @HttpCode(200)
  validate(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIdPipe) id: number,
    @Body() dto: ValidateTacticDto,
  ) {
    return this.tactics.validate(user.id, id, dto);
  }
}
