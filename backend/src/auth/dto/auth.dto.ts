import { IsEmail, IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';
import { NormalizeEmail } from '../../common/transforms';

export class RegisterDto {
  @NormalizeEmail()
  @IsEmail()
  email!: string;

  /** bcrypt only uses the first 72 bytes, so longer passwords are rejected. */
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password!: string;
}

export class LoginDto {
  @NormalizeEmail()
  @IsEmail()
  email!: string;

  @IsString()
  @IsNotEmpty()
  password!: string;
}

