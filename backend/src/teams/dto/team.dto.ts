import { PartialType } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { Trim } from '../../common/transforms';

export class CreateTeamDto {
  @Trim()
  @IsString()
  @IsNotEmpty({ message: 'name must not be empty' })
  @MaxLength(100)
  name!: string;
}

export class UpdateTeamDto extends PartialType(CreateTeamDto) {}

