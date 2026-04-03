import { Injectable, ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { EmailService } from '../email/email.service';
import { AnalyticsService } from '../analytics/analytics.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
    private emailService: EmailService,
    private analyticsService: AnalyticsService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email already registered');

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        name: dto.name,
        passwordHash,
        school: dto.school,
        department: dto.department,
        specialization: dto.specialization,
        examDate: dto.examDate ? new Date(dto.examDate) : null,
        whatsappNumber: dto.whatsappNumber,
        profile: { create: {} },
      },
    });

    const tokens = await this.generateTokens(user.id, user.email, user.role);
    this.emailService.sendWelcome(user.email, user.name).catch(() => {});
    this.analyticsService.track(user.id, 'user_register', { school: user.school }).catch(() => {});
    return { user: this.sanitizeUser(user), ...tokens };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user || !user.passwordHash) throw new UnauthorizedException('Invalid credentials');

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    await this.prisma.user.update({ where: { id: user.id }, data: { lastActiveAt: new Date() } });
    const tokens = await this.generateTokens(user.id, user.email, user.role);
    this.analyticsService.track(user.id, 'user_login').catch(() => {});
    return { user: this.sanitizeUser(user), ...tokens };
  }

  async validateUser(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !user.passwordHash) return null;
    const valid = await bcrypt.compare(password, user.passwordHash);
    return valid ? user : null;
  }

  async validateOrCreateGoogleUser(profile: any) {
    const email: string = profile.emails?.[0]?.value;
    const name: string = profile.displayName || profile.name?.givenName || 'Student';
    const googleId: string = profile.id;

    let user = await this.prisma.user.findFirst({
      where: { OR: [{ googleId }, { email }] },
    });

    if (!user) {
      user = await this.prisma.user.create({
        data: { email, name, googleId, passwordHash: null, profile: { create: {} } },
      });
      this.emailService.sendWelcome(user.email, user.name).catch(() => {});
      this.analyticsService.track(user.id, 'user_register', { method: 'google' }).catch(() => {});
    } else if (!user.googleId) {
      user = await this.prisma.user.update({ where: { id: user.id }, data: { googleId } });
    }

    await this.prisma.user.update({ where: { id: user.id }, data: { lastActiveAt: new Date() } });
    this.analyticsService.track(user.id, 'user_login', { method: 'google' }).catch(() => {});
    return user;
  }

  async googleLogin(user: any) {
    const tokens = await this.generateTokens(user.id, user.email, user.role);
    return { user: this.sanitizeUser(user), ...tokens };
  }

  async refreshToken(token: string) {
    const saved = await this.prisma.refreshToken.findUnique({ where: { token } });
    if (!saved || saved.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
    const user = await this.prisma.user.findUnique({ where: { id: saved.userId } });
    await this.prisma.refreshToken.delete({ where: { id: saved.id } });
    const tokens = await this.generateTokens(user.id, user.email, user.role);
    return tokens;
  }

  async logout(userId: string) {
    await this.prisma.refreshToken.deleteMany({ where: { userId } });
  }

  async forgotPassword(email: string) {
    // Always return success to prevent email enumeration
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (user) {
      // In production: generate a secure token, save it, send email
      // For now, log it so it can be used during development
      const resetToken = this.jwt.sign(
        { sub: user.id, type: 'password_reset' },
        { expiresIn: '1h' },
      );
      this.emailService.sendPasswordReset(user.email, resetToken, user.name).catch(() => {});
    }
    return { message: 'If this email is registered, a reset link has been sent.' };
  }

  async resetPassword(token: string, newPassword: string) {
    const payload = this.jwt.verify(token) as any;
    if (payload.type !== 'password_reset') {
      throw new UnauthorizedException('Invalid reset token');
    }
    const passwordHash = await bcrypt.hash(newPassword, 12);
    await this.prisma.user.update({ where: { id: payload.sub }, data: { passwordHash } });
    await this.prisma.refreshToken.deleteMany({ where: { userId: payload.sub } });
    return { message: 'Password reset successfully' };
  }

  async generateTokens(userId: string, email: string, role: string) {
    const payload = { sub: userId, email, role };
    const accessToken = this.jwt.sign(payload, { expiresIn: '7d' });
    const refreshTokenValue = this.jwt.sign(payload, {
      secret: this.config.get('JWT_REFRESH_SECRET', 'buddi-refresh-secret'),
      expiresIn: '30d',
    });

    await this.prisma.refreshToken.create({
      data: {
        token: refreshTokenValue,
        userId,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    return { accessToken, refreshToken: refreshTokenValue };
  }

  sanitizeUser(user: any) {
    const { passwordHash, ...safe } = user;
    return safe;
  }
}
