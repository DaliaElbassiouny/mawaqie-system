'use client';

import Image from 'next/image';
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

export function Sidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
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
    <aside
      className={cn(
        'relative flex flex-col flex-shrink-0 transition-all duration-300 ease-in-out',
        'bg-shell border-e border-shell-border',
        collapsed ? 'w-16' : 'w-64',
      )}
    >
      {/* ── Brand ────────────────────────────────────────────── */}
      <div
        className={cn(
          'flex items-center gap-3 border-b border-shell-border min-h-[60px] overflow-hidden',
          collapsed ? 'justify-center px-0 py-4' : 'px-4 py-3',
        )}
      >
        {collapsed ? (
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 border"
            style={{
              backgroundColor: 'hsl(var(--shell-active-bg))',
              borderColor: 'hsl(var(--shell-active-fg) / 0.3)',
            }}
          >
            <span
              className="font-black text-sm select-none"
              style={{ color: 'hsl(var(--shell-active-fg))' }}
            >C</span>
          </div>
        ) : (
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex-shrink-0 bg-white rounded-lg px-2 py-1.5 shadow-sm">
              <Image
                src="/cdc-logo.png"
                alt="CDC – Construction and Development Contracting"
                width={80}
                height={40}
                className="block"
                priority
              />
            </div>
            <p
              className="text-[10px] font-semibold uppercase tracking-widest leading-tight whitespace-nowrap"
              style={{ color: 'hsl(var(--shell-muted))' }}
            >
              ERP System
            </p>
          </div>
        )}
      </div>

      {/* ── Navigation ───────────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto py-3">
        {sections.map((section, si) => (
          <div key={section.key}>
            {si > 0 && !collapsed && (
              <div className="flex items-center gap-2 px-4 pt-5 pb-1.5">
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
              <div className="mx-3 my-2 h-px" style={{ backgroundColor: 'hsl(var(--shell-border))' }} />
            )}

            <div className="px-2 space-y-0.5">
              {section.items.map((item) => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.key}
                    href={`${basePath}${item.href}`}
                    className={cn(
                      'nav-item group',
                      active ? 'nav-item-active' : 'nav-item-inactive',
                      collapsed && 'justify-center px-0',
                    )}
                    title={collapsed ? t(item.key as keyof typeof t) : undefined}
                  >
                    <item.icon
                      className={cn(
                        'flex-shrink-0 transition-colors',
                        collapsed ? 'w-5 h-5' : 'w-4 h-4',
                      )}
                      style={{
                        color: active
                          ? 'hsl(var(--shell-active-fg))'
                          : 'hsl(var(--shell-muted))',
                      }}
                    />
                    {!collapsed && (
                      <span className="truncate">{t(item.key as keyof typeof t)}</span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* ── Collapse toggle ───────────────────────────────────── */}
      <button
        onClick={onToggle}
        className="absolute -end-3 top-[72px] w-6 h-6 rounded-full z-10 flex items-center justify-center transition-colors border shadow-sm"
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
  );
}
