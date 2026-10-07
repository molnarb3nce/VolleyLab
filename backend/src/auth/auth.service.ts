import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { isUniqueViolation } from '../common/prisma-errors';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto, RegisterDto } from './dto/auth.dto';

export interface AuthResult {
  accessToken: string;
  user: { id: number; email: string };
}

const BCRYPT_ROUNDS = 10;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResult> {
    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    try {
      const user = await this.prisma.user.create({ data: { email: dto.email, passwordHash } });
      return this.buildResult(user);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException('A user with this email already exists');
      }
      throw error;
    }
  }

  async login(dto: LoginDto): Promise<AuthResult> {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    // Same message for unknown email and wrong password: do not reveal which one failed.
    const passwordMatches = user ? await bcrypt.compare(dto.password, user.passwordHash) : false;
    if (!user || !passwordMatches) {
      throw new UnauthorizedException('Invalid email or password');
    }
    return this.buildResult(user);
  }

  private buildResult(user: { id: number; email: string }): AuthResult {
    const accessToken = this.jwt.sign({ sub: user.id, email: user.email });
    return { accessToken, user: { id: user.id, email: user.email } };
  }
}
