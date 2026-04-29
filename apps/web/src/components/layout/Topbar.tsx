'use client';

import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter, usePathname } from 'next/navigation';
import { LogOut, ChevronDown, Globe, User, Sun, Moon, HelpCircle } from 'lucide-react';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { useAuthStore } from '@/store/auth.store';
import { useThemeStore } from '@/store/theme.store';
import { useFeatureGuide } from '@/hooks/useFeatureGuide';
import { authApi } from '@/lib/api';
import { getInitials } from '@/lib/utils';
import { cn } from '@/lib/utils';

const ROLE_LABELS: Record<string, { ar: string; en: string }> = {
  SUPER_ADMIN:         { ar: 'مدير النظام',      en: 'Super Admin' },
  ADMIN:               { ar: 'مشرف',              en: 'Admin' },
  OPERATIONS_MANAGER:  { ar: 'مدير عمليات',       en: 'Operations Manager' },
  PROJECT_MANAGER:     { ar: 'مدير مشروع',        en: 'Project Manager' },
  SITE_ENGINEER:       { ar: 'مهندس موقع',        en: 'Site Engineer' },
  PROCUREMENT_OFFICER: { ar: 'مسؤول مشتريات',     en: 'Procurement Officer' },
  COST_CONTROLLER:     { ar: 'مراقب تكاليف',      en: 'Cost Controller' },
  EXECUTIVE_VIEWER:    { ar: 'مشاهد تنفيذي',      en: 'Executive Viewer' },
  VIEWER:              { ar: 'مشاهد',              en: 'Viewer' },
};

export function Topbar() {
  const t        = useTranslations('auth');
  const locale   = useLocale();
  const router   = useRouter();
  const pathname = usePathname();
  const { user, clearAuth }    = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const { openGuide } = useFeatureGuide();
  const isRtl = locale === 'ar';

  const handleLogout = async () => {
    try { await authApi.logout(); } catch { /* ignore */ }
    clearAuth();
    router.push(`/${locale}/login`);
  };

  const switchLocale = (newLocale: string) => {
    const segments = pathname.split('/');
    segments[1] = newLocale;
    router.push(segments.join('/'));
  };

  const otherLocale      = locale === 'ar' ? 'en' : 'ar';
  const otherLocaleLabel = locale === 'ar' ? 'EN' : 'ع';
  const roleKey    = user?.roles?.[0] ?? '';
  const roleLabel  = isRtl ? (ROLE_LABELS[roleKey]?.ar ?? roleKey) : (ROLE_LABELS[roleKey]?.en ?? roleKey);

  return (
    <header
      className="h-[60px] flex items-center justify-between px-5 flex-shrink-0 gap-4 border-b"
      style={{
        backgroundColor: 'hsl(var(--topbar-bg))',
        borderColor:     'hsl(var(--topbar-border))',
      }}
    >
      {/* ── Left: tagline ────────────────────────────────────── */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="h-4 w-px bg-surface-border hidden sm:block" />
        <p className="text-xs text-text-muted hidden sm:block font-medium tracking-wide truncate">
          CDC — Construction and Development Contracting
        </p>
      </div>

      {/* ── Right: actions ───────────────────────────────────── */}
      <div className="flex items-center gap-1 flex-shrink-0">

        {/* Language switcher */}
        <button
          onClick={() => switchLocale(otherLocale)}
          className="flex items-center gap-1.5 h-8 px-2.5 rounded-md text-xs font-semibold
                     text-text-secondary border border-surface-border bg-transparent
                     hover:bg-surface-hover hover:text-text-primary transition-colors"
          title={otherLocale === 'ar' ? 'العربية' : 'English'}
        >
          <Globe className="w-3.5 h-3.5" />
          <span>{otherLocaleLabel}</span>
        </button>

        {/* Help / Feature guide */}
        <button
          onClick={openGuide}
          className="w-8 h-8 rounded-md flex items-center justify-center
                     text-text-muted hover:bg-surface-hover hover:text-text-primary transition-colors"
          title={isRtl ? 'دليل الاستخدام' : 'Feature guide'}
          aria-label="Open feature guide"
        >
          <HelpCircle className="w-4 h-4" />
        </button>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="w-8 h-8 rounded-md flex items-center justify-center
                     text-text-muted hover:bg-surface-hover hover:text-text-primary transition-colors"
          title={theme === 'dark' ? (isRtl ? 'الوضع الفاتح' : 'Light mode') : (isRtl ? 'الوضع الداكن' : 'Dark mode')}
          aria-label="Toggle theme"
        >
          {theme === 'dark'
            ? <Sun  className="w-4 h-4" />
            : <Moon className="w-4 h-4" />
          }
        </button>

        {/* Notifications */}
        <NotificationBell />

        {/* Divider */}
        <div className="h-5 w-px bg-surface-border mx-0.5" />

        {/* User menu */}
        <div className="relative">
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="flex items-center gap-2 h-8 px-2 rounded-md hover:bg-surface-hover transition-colors"
            aria-expanded={menuOpen}
          >
            <div className="w-7 h-7 rounded-full bg-brand/15 border border-brand/30 flex items-center justify-center text-brand text-[11px] font-bold flex-shrink-0">
              {getInitials(user?.nameAr, user?.nameEn ?? undefined)}
            </div>
            <div className="hidden md:block text-start leading-none">
              <p className="text-sm font-semibold text-text-primary whitespace-nowrap">
                {user?.nameAr || user?.nameEn}
              </p>
              {roleLabel && (
                <p className="text-[10px] text-text-muted mt-0.5 whitespace-nowrap">{roleLabel}</p>
              )}
            </div>
            <ChevronDown
              className={cn(
                'w-3.5 h-3.5 text-text-muted transition-transform duration-150',
                menuOpen && 'rotate-180',
              )}
            />
          </button>

          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute end-0 top-full mt-1.5 w-56 bg-surface-card border border-surface-border rounded-xl shadow-dropdown z-20 overflow-hidden">
                {/* User info */}
                <div className="px-4 py-3 border-b border-surface-border bg-surface-hover/50">
                  <div className="flex items-center gap-2.5 mb-1.5">
                    <div className="w-8 h-8 rounded-full bg-brand/15 border border-brand/30 flex items-center justify-center text-brand text-xs font-bold flex-shrink-0">
                      {getInitials(user?.nameAr, user?.nameEn ?? undefined)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-text-primary truncate">{user?.nameAr}</p>
                      {user?.nameEn && (
                        <p className="text-xs text-text-muted truncate">{user.nameEn}</p>
                      )}
                    </div>
                  </div>
                  <p className="text-[10px] text-text-muted truncate">{user?.email}</p>
                </div>
                {/* Menu items */}
                <div className="py-1">
                  <button
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm
                               text-text-secondary hover:bg-surface-hover hover:text-text-primary transition-colors"
                    onClick={() => setMenuOpen(false)}
                  >
                    <User className="w-4 h-4 flex-shrink-0" />
                    {isRtl ? 'الملف الشخصي' : 'Profile'}
                  </button>
                  <div className="mx-3 my-1 h-px bg-surface-border" />
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm
                               text-red-500 hover:bg-red-500/8 hover:text-red-600 transition-colors"
                  >
                    <LogOut className="w-4 h-4 flex-shrink-0" />
                    {t('logout')}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
