'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Lock, Mail, AlertCircle } from 'lucide-react';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const loginSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(6),
});
type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const t      = useTranslations('auth');
  const locale = useLocale();
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [showPass, setShowPass] = useState(false);
  const [error, setError]       = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors, isSubmitting } } =
    useForm<LoginForm>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (data: LoginForm) => {
    setError(null);
    try {
      const res = await authApi.login(data.email, data.password);
      const { user, accessToken, refreshToken } = res.data.data as {
        user: Parameters<typeof setAuth>[0];
        accessToken: string;
        refreshToken: string;
      };
      setAuth(user, accessToken, refreshToken);
      router.push(`/${locale}`);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      const msg = axiosErr.response
        ? axiosErr.response.data?.message ?? t('invalidCredentials')
        : t('serverDown');
      setError(msg);
    }
  };

  return (
    /* Full-screen split layout */
    <div className="min-h-screen flex bg-canvas">

      {/* ── Left panel — CDC branding ──────────────────────────── */}
      <div
        className="hidden lg:flex lg:w-[52%] relative flex-col items-center justify-center p-12 overflow-hidden"
        style={{ backgroundColor: 'hsl(var(--shell-bg))' }}
      >
        {/* Architectural grid texture */}
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage: `
              linear-gradient(hsl(var(--shell-text)) 1px, transparent 1px),
              linear-gradient(90deg, hsl(var(--shell-text)) 1px, transparent 1px)
            `,
            backgroundSize: '48px 48px',
          }}
        />

        {/* Gold glow orbs — subtle */}
        <div className="absolute top-1/4 start-1/3 w-72 h-72 rounded-full blur-3xl pointer-events-none"
             style={{ backgroundColor: 'hsl(var(--brand) / 0.06)' }} />
        <div className="absolute bottom-1/4 end-1/4 w-52 h-52 rounded-full blur-3xl pointer-events-none"
             style={{ backgroundColor: 'hsl(var(--brand) / 0.04)' }} />

        <div className="relative z-10 flex flex-col items-center text-center max-w-xs">
          {/* Logo on white pill */}
          <div className="bg-white rounded-2xl px-7 py-5 shadow-card-lg mb-8">
            <Image
              src="/cdc-logo.png"
              alt="CDC – Construction and Development Contracting"
              width={140}
              height={70}
              className="block"
              priority
            />
          </div>

          {/* Bilingual tagline */}
          <h2 className="text-2xl font-bold leading-tight mb-1"
              style={{ color: 'hsl(var(--shell-active-fg))' }}>
            {locale === 'ar' ? 'التعمير والتنمية للمقاولات' : 'Construction & Development Contracting'}
          </h2>
          <p className="text-sm leading-relaxed mt-2"
             style={{ color: 'hsl(var(--shell-text))' }}>
            {locale === 'ar'
              ? 'منصة إدارة المشاريع والعطاءات والتكاليف'
              : 'Integrated project, tender and cost management'}
          </p>

          {/* Feature chips */}
          <div className="flex flex-wrap gap-2 justify-center mt-8">
            {[
              locale === 'ar' ? 'إدارة المناقصات' : 'Tenders',
              locale === 'ar' ? 'مراقبة التكاليف' : 'Cost Control',
              locale === 'ar' ? 'التشغيل الميداني' : 'Field Ops',
              locale === 'ar' ? 'المشتريات'        : 'Procurement',
            ].map((label) => (
              <span
                key={label}
                className="text-xs px-3 py-1 rounded-full font-medium"
                style={{
                  backgroundColor: 'hsl(var(--shell-active-bg))',
                  color: 'hsl(var(--shell-active-fg))',
                  border: '1px solid hsl(var(--shell-active-fg) / 0.2)',
                }}
              >
                {label}
              </span>
            ))}
          </div>
        </div>

        {/* Bottom rule */}
        <div
          className="absolute bottom-8 text-[11px] tracking-wider text-center"
          style={{ color: 'hsl(var(--shell-muted))' }}
        >
          © {new Date().getFullYear()} CDC — All rights reserved
        </div>
      </div>

      {/* ── Right panel — login form ───────────────────────────── */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-sm">

          {/* Mobile logo */}
          <div className="flex justify-center mb-8 lg:hidden">
            <div className="bg-white rounded-xl px-5 py-3 shadow-card">
              <Image src="/cdc-logo.png" alt="CDC" width={110} height={55} className="block" priority />
            </div>
          </div>

          {/* Form card */}
          <div className="bg-surface-card border border-surface-border rounded-2xl shadow-card-lg overflow-hidden">
            {/* Gold top stripe */}
            <div className="h-1 bg-gradient-to-r from-brand/80 via-brand to-brand/40" />

            <div className="p-7">
              <div className="mb-6">
                <h1 className="text-xl font-bold text-text-primary">{t('loginTitle')}</h1>
                <p className="text-sm text-text-muted mt-1">{t('loginSubtitle')}</p>
              </div>

              {/* Error */}
              {error && (
                <div className="flex items-start gap-2.5 bg-red-500/8 border border-red-500/20
                                rounded-lg px-4 py-3 mb-5 text-red-600 dark:text-red-400 text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" dir="auto">
                {/* Email */}
                <div>
                  <label className="field-label">{t('email')}</label>
                  <div className="relative">
                    <Mail className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
                    <Input
                      {...register('email')}
                      type="email"
                      className="ps-9"
                      placeholder="you@cdc-contracting.com"
                      autoComplete="email"
                      dir="ltr"
                    />
                  </div>
                  {errors.email && (
                    <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>
                  )}
                </div>

                {/* Password */}
                <div>
                  <label className="field-label">{t('password')}</label>
                  <div className="relative">
                    <Lock className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
                    <Input
                      {...register('password')}
                      type={showPass ? 'text' : 'password'}
                      className="ps-9 pe-9"
                      placeholder="••••••••"
                      autoComplete="current-password"
                      dir="ltr"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass((s) => !s)}
                      className="absolute end-3 top-1/2 -translate-y-1/2 text-text-muted
                                 hover:text-text-secondary transition-colors"
                      tabIndex={-1}
                    >
                      {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>
                  )}
                </div>

                <Button type="submit" className="w-full h-10 font-semibold mt-2" disabled={isSubmitting}>
                  {isSubmitting ? t('loggingIn') : t('loginButton')}
                </Button>
              </form>

              {/* Dev credentials hint */}
              <div className="mt-5 p-3 bg-surface-hover rounded-lg border border-surface-border">
                <p className="text-[11px] text-text-muted text-center leading-relaxed">
                  Demo: <span className="font-mono text-text-secondary">admin@cdc-system.local</span>
                  {' / '}
                  <span className="font-mono text-text-secondary">Admin@123456</span>
                </p>
              </div>
            </div>
          </div>

          <p className="text-center text-[11px] text-text-muted mt-5">
            © {new Date().getFullYear()} CDC — Construction and Development Contracting
          </p>
        </div>
      </div>
    </div>
  );
}
