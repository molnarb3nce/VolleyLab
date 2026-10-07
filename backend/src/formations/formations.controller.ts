import { Controller, Get } from '@nestjs/common';
import { Formation } from '@prisma/client';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { REQUIRED_SLOTS, SLOT_ROLE } from './formations';

@ApiTags('formations')
@ApiBearerAuth()
@Controller('formations')
export class FormationsController {
  /** Formation templates and the player role expected in each slot (data lives in code). */
  @Get()
  findAll() {
    return {
      formations: Object.values(Formation).map((name) => ({
        name,
        requiredSlots: REQUIRED_SLOTS[name],
        optionalSlots: ['LIBERO'],
      })),
      slotRoles: SLOT_ROLE,
    };
  }
}
