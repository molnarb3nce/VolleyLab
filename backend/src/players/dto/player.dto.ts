import { PartialType } from '@nestjs/swagger';
import { PlayerRole } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { trim } from '../../common/transforms';

export class CreatePlayerDto {
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'name must not be empty' })
  @MaxLength(100)
  name!: string;

  @IsInt()
  @Min(0)
  @Max(99)
  jerseyNumber!: number;

  @IsEnum(PlayerRole)
  role!: PlayerRole;
}

export class UpdatePlayerDto extends PartialType(CreatePlayerDto) {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
