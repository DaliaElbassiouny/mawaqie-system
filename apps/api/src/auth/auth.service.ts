import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { LoginDto } from './dto/login.dto';

// bcrypt hash used for constant-time comparisons when a login email is not found.
// Prevents user enumeration via timing differences (a real compare takes ~80 ms;
// skipping it entirely would reveal which emails exist).
const TIMING_DUMMY_HASH =
  '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly audit: AuditService,
  ) {}

  async login(dto: LoginDto, ip?: string, userAgent?: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: {
        userRoles: {
          include: {
            role: {
              include: { rolePermissions: { include: { permission: true } } },
            },
          },
        },
      },
    });

    // Always run bcrypt regardless of whether the user was found so that
    // response timing is the same for valid and invalid emails.
    const hashToCheck = user?.password ?? TIMING_DUMMY_HASH;
    const passwordMatch = await bcrypt.compare(dto.password, hashToCheck);

    if (!user || !passwordMatch) {
      throw new UnauthorizedException('البريد الإلكتروني أو كلمة المرور غير صحيحة');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('حسابك معطل. تواصل مع المشرف');
    }

    const roles = user.userRoles.map((ur) => ur.role.code);
    const permissions = [
      ...new Set(
        user.userRoles.flatMap((ur) =>
          ur.role.rolePermissions.map((rp) => rp.permission.code),
        ),
      ),
    ];

    const tokens = await this.generateTokens(user.id, user.email, roles);

    await this.audit.log({
      userId: user.id,
      action: 'LOGIN',
      module: 'auth',
      ip,
      userAgent,
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        nameAr: user.nameAr,
        nameEn: user.nameEn,
        roles,
        permissions,
      },
      ...tokens,
    };
  }

  async logout(userId: string, ip?: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshToken: null },
    });

    await this.audit.log({ userId, action: 'LOGOUT', module: 'auth', ip });

    return { message: 'تم تسجيل الخروج بنجاح' };
  }

  async refresh(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.isActive) {
      throw new UnauthorizedException('جلسة منتهية');
    }

    // Invalidate the current refresh token immediately so it cannot be replayed
    // while the new tokens are being generated. generateTokens will write the
    // new hash, completing the rotation.
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshToken: null },
    });

    const roles = await this.prisma.userRole.findMany({
      where: { userId },
      include: { role: true },
    });

    const tokens = await this.generateTokens(
      user.id,
      user.email,
      roles.map((r) => r.role.code),
    );

    return tokens;
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new BadRequestException('المستخدم غير موجود');

    const match = await bcrypt.compare(currentPassword, user.password);
    if (!match) throw new BadRequestException('كلمة المرور الحالية غير صحيحة');

    const hashed = await bcrypt.hash(newPassword, 12);
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashed, refreshToken: null },
    });

    await this.audit.log({ userId, action: 'CHANGE_PASSWORD', module: 'auth' });

    return { message: 'تم تغيير كلمة المرور بنجاح' };
  }

  private async generateTokens(userId: string, email: string, roles: string[]) {
    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(
        { sub: userId, email, roles },
        {
          secret: this.config.getOrThrow('JWT_SECRET'),
          expiresIn: this.config.get('JWT_EXPIRES_IN', '15m'),
        },
      ),
      this.jwt.signAsync(
        { sub: userId },
        {
          secret: this.config.getOrThrow('JWT_REFRESH_SECRET'),
          expiresIn: this.config.get('JWT_REFRESH_EXPIRES_IN', '7d'),
        },
      ),
    ]);

    const hashedRefresh = await bcrypt.hash(refreshToken, 12);
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshToken: hashedRefresh },
    });

    return { accessToken, refreshToken };
  }
}
