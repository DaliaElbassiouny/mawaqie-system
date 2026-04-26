'use client';

import { useState, useRef, useEffect } from 'react';
import { useLocale } from 'next-intl';
import { Bell, CheckCheck, Info, CheckCircle2, AlertTriangle, Zap } from 'lucide-react';
import { cn, formatDateWithEnglishDigits } from '@/lib/utils';
import { useNotifications, useMarkRead, useMarkAllRead, useUnreadCount, type Notification } from '@/hooks/useNotifications';

const TYPE_CONFIG = {
  INFO: { icon: Info, color: 'text-blue-400', bg: 'bg-blue-500/10' },
  SUCCESS: { icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  WARNING: { icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/10' },
  ACTION_RESULT: { icon: Zap, color: 'text-purple-400', bg: 'bg-purple-500/10' },
} as const;

export function NotificationBell() {
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const { data: unreadCount = 0 } = useUnreadCount();
  const { data } = useNotifications({ limit: 20 });
  const notifications = data?.items ?? [];

  const markRead = useMarkRead();
  const markAllRead = useMarkAllRead();

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleNotificationClick = (n: Notification) => {
    if (!n.isRead) markRead.mutate(n.id);
    setOpen(false);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative w-8 h-8 rounded-md flex items-center justify-center
                   text-text-muted hover:bg-surface-hover hover:text-text-primary transition-colors"
        aria-label={locale === 'ar' ? 'الإشعارات' : 'Notifications'}
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute top-1 end-1 min-w-[14px] h-[14px] rounded-full bg-red-500 flex items-center justify-center text-[9px] font-bold text-white leading-none px-0.5">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute end-0 top-full mt-1.5 w-80 bg-surface-card border border-surface-border rounded-2xl shadow-dropdown z-20 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-surface-border">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-text-secondary" />
                <span className="text-sm font-semibold text-text-primary">
                  {locale === 'ar' ? 'الإشعارات' : 'Notifications'}
                </span>
                {unreadCount > 0 && (
                  <span className="rounded-full bg-red-500/10 text-red-500 text-xs px-1.5 py-0.5 font-semibold">
                    {unreadCount}
                  </span>
                )}
              </div>
              {unreadCount > 0 && (
                <button
                  onClick={() => markAllRead.mutate()}
                  className="flex items-center gap-1 text-xs text-text-muted hover:text-text-primary transition-colors"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  {locale === 'ar' ? 'قراءة الكل' : 'Mark all read'}
                </button>
              )}
            </div>

            {/* List */}
            <div className="max-h-[380px] overflow-y-auto divide-y divide-surface-border">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 gap-2 text-text-muted">
                  <Bell className="w-8 h-8 opacity-20" />
                  <p className="text-sm">{locale === 'ar' ? 'لا توجد إشعارات' : 'No notifications'}</p>
                </div>
              ) : (
                notifications.map((n) => {
                  const cfg = TYPE_CONFIG[n.type] ?? TYPE_CONFIG.INFO;
                  const Icon = cfg.icon;
                  return (
                    <button
                      key={n.id}
                      onClick={() => handleNotificationClick(n)}
                      className={cn(
                        'w-full text-start flex items-start gap-3 px-4 py-3 hover:bg-surface-hover/50 transition-colors',
                        !n.isRead && 'bg-surface-hover/25',
                      )}
                    >
                      <div className={cn('rounded-lg p-1.5 mt-0.5 flex-shrink-0', cfg.bg)}>
                        <Icon className={cn('w-3.5 h-3.5', cfg.color)} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={cn('text-sm leading-snug', !n.isRead ? 'font-semibold text-text-primary' : 'font-medium text-text-secondary')}>
                          {n.title}
                        </p>
                        {n.body && (
                          <p className="text-xs text-text-muted mt-0.5 truncate">{n.body}</p>
                        )}
                        <p className="text-[10px] text-text-muted mt-1">
                          {formatDateWithEnglishDigits(n.createdAt, locale, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      {!n.isRead && (
                        <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-1.5" />
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
