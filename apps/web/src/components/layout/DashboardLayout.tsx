'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { NAV_ITEMS, Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { useAuthStore } from '@/store/auth.store';
import { useThemeStore } from '@/store/theme.store';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { FeatureGuide } from '@/components/guide/FeatureGuide';

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed]   = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mounted, setMounted]       = useState(false);
  const { hasPermission, isAuthenticated } = useAuthStore();
  const { theme } = useThemeStore();
  const router   = useRouter();
  const pathname = usePathname();
  const locale   = useLocale();
  const basePath = `/${locale}`;

  const requiredPermission = NAV_ITEMS.find((item) => {
    if (!item.permission || !item.href) return false;
    const itemPath = `${basePath}${item.href}`;
    return pathname === itemPath || pathname.startsWith(`${itemPath}/`);
  })?.permission;
  const isAuthorized = !requiredPermission || hasPermission(requiredPermission);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!mounted) return;
    if (!isAuthenticated) { router.replace(`/${locale}/login`); return; }
    if (!isAuthorized)    { router.replace(`/${locale}/login`); }
  }, [mounted, isAuthenticated, isAuthorized, router, locale]);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');
  }, [theme]);

  // Close the mobile drawer whenever the route changes
  useEffect(() => { setMobileOpen(false); }, [pathname]);

  if (!mounted || !isAuthenticated || !isAuthorized) return null;

  return (
    <div className="flex h-screen bg-canvas overflow-hidden">
      <Sidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed((c) => !c)}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Topbar onMenuClick={() => setMobileOpen(true)} />

        <main className="flex-1 overflow-y-auto">
          <div className="max-w-screen-2xl mx-auto p-4 sm:p-6 animate-fade-in">
            <ErrorBoundary>{children}</ErrorBoundary>
          </div>
        </main>
      </div>

      <FeatureGuide />
    </div>
  );
}
