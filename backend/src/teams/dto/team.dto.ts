import { PartialType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { trim } from '../../common/transforms';

export class CreateTeamDto {
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'name must not be empty' })
  @MaxLength(100)
  name!: string;
}

export class UpdateTeamDto extends PartialType(CreateTeamDto) {}
