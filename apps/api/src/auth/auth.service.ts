import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UserRole, type User } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';
import type { AuthUser, AuthTokenPayload } from './types/auth-user.type.js';

type AuthTokens = {
  accessToken: string;
  refreshToken: string;
};

type AuthResponse = AuthTokens & {
  message: string;
  user: AuthUser;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponse> {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existingUser) {
      throw new ConflictException('Email is already registered');
    }

    const existingOrg = await this.prisma.organization.findUnique({
      where: { email: dto.organizationEmail },
    });
    if (existingOrg) {
      throw new ConflictException('Organization email is already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.$transaction(async (tx) => {
      const organization = await tx.organization.create({
        data: {
          name: dto.organizationName,
          email: dto.organizationEmail,
          phone: dto.organizationPhone,
        },
      });

      return tx.user.create({
        data: {
          organizationId: organization.id,
          name: dto.name,
          email: dto.email,
          password: passwordHash,
          role: dto.role ?? UserRole.ADMIN,
        },
      });
    });

    return this.buildAuthResponse(user, 'Account created successfully');
  }

  async login(dto: LoginDto): Promise<AuthResponse> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const passwordValid = await bcrypt.compare(dto.password, user.password);
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return this.buildAuthResponse(user, 'Login successful');
  }

  async refresh(refreshToken: string): Promise<AuthTokens> {
    let payload: AuthTokenPayload;

    try {
      payload = await this.jwt.verifyAsync<AuthTokenPayload>(refreshToken, {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (payload.type !== 'refresh') {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return this.issueTokens(user);
  }

  logout(): { message: string } {
    return { message: 'Logged out successfully' };
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        organizationId: true,
        createdAt: true,
        organization: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            logo: true,
            website: true,
            signatoryName: true,
            signatoryDesignation: true,
            signatureUrl: true,
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return user;
  }

  private buildAuthResponse(user: User, message: string): AuthResponse {
    return {
      message,
      ...this.issueTokens(user),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        organizationId: user.organizationId,
      },
    };
  }

  private issueTokens(user: User): AuthTokens {
    const accessPayload: AuthTokenPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId,
      type: 'access',
    };

    const refreshPayload: AuthTokenPayload = {
      ...accessPayload,
      type: 'refresh',
    };

    const accessExpiresIn = this.config.get<string>('JWT_ACCESS_EXPIRES_IN') ?? '15m';
    const refreshExpiresIn =
      this.config.get<string>('JWT_REFRESH_EXPIRES_IN') ?? '7d';

    const accessToken = this.jwt.sign(
      { ...accessPayload },
      {
        secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
        expiresIn: accessExpiresIn as `${number}m` | `${number}d` | `${number}s`,
      },
    );

    const refreshToken = this.jwt.sign(
      { ...refreshPayload },
      {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
        expiresIn: refreshExpiresIn as `${number}m` | `${number}d` | `${number}s`,
      },
    );

    return { accessToken, refreshToken };
  }
}
