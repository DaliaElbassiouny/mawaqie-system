'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import {
  LayoutDashboard,
  Users,
  Building2,
  FileText,
  FolderOpen,
  Calculator,
  ShoppingCart,
  Settings,
  BarChart3,
  ClipboardList,
  Upload,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth.store';

export interface NavItem {
  key: string;
  href: string;
  icon: React.ElementType;
  permission?: string;
  section?: 'main' | 'ops' | 'admin';
}

export const NAV_ITEMS: NavItem[] = [
  { key: 'dashboard',   href: '',              icon: LayoutDashboard, section: 'main' },
  { key: 'clients',     href: '/clients',      icon: Building2,    permission: 'clients:view',     section: 'main' },
  { key: 'tenders',     href: '/tenders',      icon: FileText,     permission: 'tenders:view',     section: 'main' },
  { key: 'projects',    href: '/projects',     icon: FolderOpen,   permission: 'projects:view',    section: 'main' },
  { key: 'costControl', href: '/cost-control', icon: Calculator,   permission: 'cost:view',        section: 'ops'  },
  { key: 'procurement', href: '/procurement',  icon: ShoppingCart, permission: 'procurement:view', section: 'ops'  },
  { key: 'reports',     href: '/reports',      icon: BarChart3,    permission: 'reports:view',     section: 'ops'  },
  { key: 'imports',     href: '/imports',      icon: Upload,       permission: 'imports:view',     section: 'admin'},
  { key: 'audit',       href: '/audit',        icon: ClipboardList,permission: 'audit:view',       section: 'admin'},
  { key: 'users',       href: '/users',        icon: Users,        permission: 'users:view',       section: 'admin'},
  { key: 'settings',    href: '/settings',     icon: Settings,     permission: 'settings:view',    section: 'admin'},
];

const SECTION_LABELS: Record<string, { ar: string; en: string }> = {
  ops:   { ar: 'التشغيل', en: 'Operations' },
  admin: { ar: 'الإدارة', en: 'Admin' },
};

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export function Sidebar({ collapsed, onToggle, mobileOpen, onMobileClose }: SidebarProps) {
  const t        = useTranslations('nav');
  const locale   = useLocale();
  const pathname = usePathname();
  const { hasPermission } = useAuthStore();
  const isRtl = locale === 'ar';
  const basePath = `/${locale}`;

  const isActive = (href: string) => {
    const full = `${basePath}${href}`;
    if (href === '') return pathname === basePath || pathname === `${basePath}/`;
    return pathname.startsWith(full);
  };

  const visibleItems = NAV_ITEMS.filter(
    (item) => !item.permission || hasPermission(item.permission),
  );
  const sections = [
    { key: 'main',  items: visibleItems.filter((i) => i.section === 'main') },
    { key: 'ops',   items: visibleItems.filter((i) => i.section === 'ops')  },
    { key: 'admin', items: visibleItems.filter((i) => i.section === 'admin')},
  ].filter((s) => s.items.length > 0);

  return (
    <>
      {/* ── Mobile backdrop ─────────────────────────────────────── */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[1px] lg:hidden"
          onClick={onMobileClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          'flex flex-col bg-shell border-e border-shell-border',
          'transition-[transform,width] duration-300 ease-in-out',
          // ── Desktop: in-flow, collapsible (always visible) ──
          'lg:relative lg:z-auto lg:translate-x-0 lg:flex-shrink-0',
          collapsed ? 'lg:w-16' : 'lg:w-64',
          // ── Mobile (< lg): off-canvas drawer ──
          'max-lg:fixed max-lg:inset-y-0 max-lg:start-0 max-lg:z-50 max-lg:w-72',
          mobileOpen
            ? 'max-lg:translate-x-0'
            : 'max-lg:ltr:-translate-x-full max-lg:rtl:translate-x-full',
        )}
      >
        {/* ── Brand ────────────────────────────────────────────── */}
        <div
          className={cn(
            'flex items-center gap-3 border-b border-shell-border min-h-[60px] overflow-hidden',
            collapsed ? 'lg:justify-center lg:px-0 px-4 py-3' : 'px-4 py-3',
          )}
        >
          {/* Logo on a white pill */}
          <div className="flex-shrink-0 bg-white rounded-lg px-2.5 py-1.5 shadow-sm flex items-center justify-center">
            {/* Full real logo — shown when expanded + on mobile */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/mawaqie-logo.jpg"
              alt="شركة مواقع النجوم للمقاولات"
              className={cn('block h-11 w-auto', collapsed && 'lg:hidden')}
            />
            {/* Simplified mark — shown when collapsed on desktop */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/mawaqie-mark.svg"
              alt=""
              aria-hidden="true"
              className={cn('hidden w-7', collapsed && 'lg:block')}
            />
          </div>

          <div className={cn('flex-1', collapsed && 'lg:hidden')} />

          {/* Mobile close button */}
          <button
            onClick={onMobileClose}
            className="lg:hidden flex-shrink-0 w-8 h-8 rounded-md flex items-center justify-center"
            style={{ color: 'hsl(var(--shell-muted))' }}
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── Navigation ───────────────────────────────────────── */}
        <nav className="flex-1 overflow-y-auto py-3">
          {sections.map((section, si) => (
            <div key={section.key}>
              {si > 0 && (
                <div className={cn('flex items-center gap-2 px-4 pt-5 pb-1.5', collapsed && 'lg:hidden')}>
                  <span
                    className="text-[10px] font-semibold uppercase tracking-[0.12em] whitespace-nowrap"
                    style={{ color: 'hsl(var(--shell-muted))' }}
                  >
                    {locale === 'ar' ? SECTION_LABELS[section.key]?.ar : SECTION_LABELS[section.key]?.en}
                  </span>
                  <div className="flex-1 h-px" style={{ backgroundColor: 'hsl(var(--shell-border))' }} />
                </div>
              )}
              {si > 0 && collapsed && (
                <div className="hidden lg:block mx-3 my-2 h-px" style={{ backgroundColor: 'hsl(var(--shell-border))' }} />
              )}

              <div className="px-2 space-y-0.5">
                {section.items.map((item) => {
                  const active = isActive(item.href);
                  return (
                    <Link
                      key={item.key}
                      href={`${basePath}${item.href}`}
                      onClick={onMobileClose}
                      className={cn(
                        'nav-item group',
                        active ? 'nav-item-active' : 'nav-item-inactive',
                        collapsed && 'lg:justify-center lg:px-0',
                      )}
                      title={collapsed ? t(item.key as keyof typeof t) : undefined}
                    >
                      <item.icon
                        className={cn(
                          'flex-shrink-0 transition-colors w-4 h-4',
                          collapsed && 'lg:w-5 lg:h-5',
                        )}
                        style={{
                          color: active
                            ? 'hsl(var(--shell-active-fg))'
                            : 'hsl(var(--shell-muted))',
                        }}
                      />
                      <span className={cn('truncate', collapsed && 'lg:hidden')}>
                        {t(item.key as keyof typeof t)}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* ── Collapse toggle (desktop only) ────────────────────── */}
        <button
          onClick={onToggle}
          className="hidden lg:flex absolute -end-3 top-[72px] w-6 h-6 rounded-full z-10 items-center justify-center transition-colors border shadow-sm"
          style={{
            backgroundColor: 'hsl(var(--shell-bg))',
            borderColor:      'hsl(var(--shell-border))',
            color:            'hsl(var(--shell-muted))',
          }}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isRtl
            ? (collapsed ? <ChevronLeft className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />)
            : (collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />)
          }
        </button>
      </aside>
    </>
  );
}
