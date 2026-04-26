'use client';

import { useEffect, useState } from 'react';
import { ClipboardList, Search } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuthStore } from '@/store/auth.store';
import { formatDateWithEnglishDigits, formatNumber, formatText } from '@/lib/utils';
import {
  useActivities,
  useDailyLogs,
  useUpsertDailyLog,
} from '@/hooks/useOperations';

function toYMD(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDate(value: string, locale: string) {
  return formatDateWithEnglishDigits(value, locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

const textareaClass = 'field-textarea min-h-[92px]';

const shortTextareaClass = 'field-textarea min-h-[78px]';

interface DailyLogViewProps {
  projectId: string;
}

export function DailyLogView({ projectId }: DailyLogViewProps) {
  const t = useTranslations('operations');
  const tc = useTranslations('common');
  const locale = useLocale();
  const { hasPermission } = useAuthStore();
  const canEdit = hasPermission('operations:create') || hasPermission('operations:update');

  const [page, setPage] = useState(1);
  const [date, setDate] = useState(() => toYMD(new Date()));
  const [summary, setSummary] = useState('');
  const [completedWork, setCompletedWork] = useState('');
  const [workedActivitiesSummary, setWorkedActivitiesSummary] = useState('');
  const [blockers, setBlockers] = useState('');
  const [notes, setNotes] = useState('');
  const [tomorrowPlan, setTomorrowPlan] = useState('');
  const [selectedActivityIds, setSelectedActivityIds] = useState<string[]>([]);
  const [activitySearch, setActivitySearch] = useState('');

  const { data, isLoading, isError } = useDailyLogs(projectId, { page, limit: 10 });
  const logs = data?.items ?? [];
  const { data: activitiesData = { items: [] } } = useActivities(projectId, { limit: 200 });
  const activities = activitiesData.items;
  const upsertMutation = useUpsertDailyLog(projectId);

  const currentLog = logs.find((log) => log.date.slice(0, 10) === date) ?? null;

  useEffect(() => {
    if (!currentLog) {
      setSummary('');
      setCompletedWork('');
      setWorkedActivitiesSummary('');
      setBlockers('');
      setNotes('');
      setTomorrowPlan('');
      setSelectedActivityIds([]);
      return;
    }

    setSummary(currentLog.summary ?? '');
    setCompletedWork(currentLog.completedWork ?? '');
    setWorkedActivitiesSummary(currentLog.workedActivitiesSummary ?? '');
    setBlockers(currentLog.blockers ?? '');
    setNotes(currentLog.notes ?? '');
    setTomorrowPlan(currentLog.tomorrowPlan ?? '');
    setSelectedActivityIds(currentLog.relatedActivities.map((activity) => activity.id));
  }, [currentLog]);

  const filteredActivities = activities.filter((activity) => {
    if (!activitySearch.trim()) return true;
    const query = activitySearch.trim().toLowerCase();
    return (
      activity.code.toLowerCase().includes(query) ||
      activity.nameAr.includes(activitySearch.trim()) ||
      (activity.nameEn ?? '').toLowerCase().includes(query)
    );
  });

  const suggestedActivities = filteredActivities.slice(0, activitySearch ? 12 : 8);

  const toggleActivity = (activityId: string) => {
    setSelectedActivityIds((current) =>
      current.includes(activityId)
        ? current.filter((id) => id !== activityId)
        : [...current, activityId],
    );
  };

  const handleSave = async () => {
    await upsertMutation.mutateAsync({
      date,
      summary,
      completedWork,
      workedActivitiesSummary,
      blockers,
      notes,
      tomorrowPlan,
      relatedActivityIds: selectedActivityIds,
    });
  };

  return (
    <div className="space-y-6">
      {canEdit && (
        <div className="card p-5 space-y-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-text-muted">
                <ClipboardList className="w-4 h-4" />
                <span className="section-title">{t('dailyReportTitle')}</span>
              </div>
              <h3 className="page-header-title mt-2">{t('dailyReportSubtitle')}</h3>
              <p className="page-header-subtitle">{t('dailyReportHint')}</p>
            </div>
            {currentLog && <Badge variant="default">{t('existingReport')}</Badge>}
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="field-label">{t('dailyReportDate')}</label>
              <Input
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                dir="ltr"
                className="w-full md:w-56"
              />
            </div>

            <div className="rounded-xl border border-surface-border bg-navy-900/50 px-4 py-3">
              <p className="text-xs text-text-muted">{t('createdBy')}</p>
              <p className="mt-1 text-sm font-semibold text-text-primary">
                {currentLog?.creator?.nameAr ? formatText(currentLog.creator.nameAr) : t('autoCurrentUser')}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <div>
              <label className="field-label">{t('summary')}</label>
              <textarea
                value={summary}
                onChange={(event) => setSummary(event.target.value)}
                rows={3}
                className={shortTextareaClass}
                placeholder={t('placeholders.summary')}
              />
            </div>

            <div>
              <label className="field-label">{t('completedWork')}</label>
              <textarea
                value={completedWork}
                onChange={(event) => setCompletedWork(event.target.value)}
                rows={3}
                className={textareaClass}
                placeholder={t('placeholders.completedWork')}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <div>
              <label className="field-label">{t('workedActivities')}</label>
              <textarea
                value={workedActivitiesSummary}
                onChange={(event) => setWorkedActivitiesSummary(event.target.value)}
                rows={3}
                className={shortTextareaClass}
                placeholder={t('placeholders.workedActivities')}
              />
            </div>

            <div>
              <label className="field-label">{t('tomorrowPlan')}</label>
              <textarea
                value={tomorrowPlan}
                onChange={(event) => setTomorrowPlan(event.target.value)}
                rows={3}
                className={shortTextareaClass}
                placeholder={t('placeholders.tomorrowPlan')}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <div>
              <label className="field-label">{t('blockers')}</label>
              <textarea
                value={blockers}
                onChange={(event) => setBlockers(event.target.value)}
                rows={3}
                className={shortTextareaClass}
                placeholder={t('placeholders.blockers')}
              />
            </div>

            <div>
              <label className="field-label">{t('notes')}</label>
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                rows={3}
                className={shortTextareaClass}
                placeholder={t('placeholders.notes')}
              />
            </div>
          </div>

          <div className="rounded-xl border border-surface-border bg-navy-900/40 p-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-text-primary">
                  {t('relatedActivities')}
                </p>
                <p className="text-xs text-text-muted mt-1">
                  {t('relatedActivitiesHint')}
                </p>
              </div>
              <div className="relative w-full max-w-xs">
                <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                <Input
                  value={activitySearch}
                  onChange={(event) => setActivitySearch(event.target.value)}
                  placeholder={tc('search')}
                  className="ps-9"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {selectedActivityIds.length === 0 ? (
                <span className="text-xs text-text-muted">{t('noLinkedActivities')}</span>
              ) : (
                selectedActivityIds.map((activityId) => {
                  const activity = activities.find((item) => item.id === activityId);
                  if (!activity) return null;
                  return (
                    <button
                      key={activity.id}
                      type="button"
                      onClick={() => toggleActivity(activity.id)}
                      className="rounded-full border border-brand/25 bg-brand/10 px-3 py-1 text-xs text-brand-200 transition-colors hover:bg-brand/15"
                    >
                      {activity.code} - {formatText(activity.nameAr)}
                    </button>
                  );
                })
              )}
            </div>

            <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
              {suggestedActivities.map((activity) => {
                const selected = selectedActivityIds.includes(activity.id);
                return (
                  <button
                    key={activity.id}
                    type="button"
                    onClick={() => toggleActivity(activity.id)}
                    className={`rounded-xl border px-3 py-3 text-start transition-colors ${
                      selected
                        ? 'border-brand/40 bg-brand/10'
                        : 'border-surface-border bg-surface-card hover:bg-surface-hover'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-mono text-text-muted">
                        {activity.code}
                      </span>
                      {selected && <Badge variant="default">{t('selected')}</Badge>}
                    </div>
                    <p className="mt-2 text-sm font-medium text-text-primary">{formatText(activity.nameAr)}</p>
                    <p className="mt-1 text-[11px] text-text-muted">
                      {activity.responsibleUser?.nameAr ? formatText(activity.responsibleUser.nameAr) : t('unassigned')}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              type="button"
              onClick={handleSave}
              disabled={upsertMutation.isPending || !date}
            >
              {upsertMutation.isPending
                ? tc('loading')
                : currentLog
                  ? t('updateDailyReport')
                  : t('saveDailyReport')}
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="page-header-title">{t('recentReports')}</h3>
            <p className="page-header-subtitle">{t('recentReportsHint')}</p>
          </div>
        </div>

        {isLoading ? (
          <div className="empty-state card">
            <div className="empty-state-icon">
              <div className="w-5 h-5 rounded-full border-2 border-brand border-t-transparent animate-spin" />
            </div>
            <p>{tc('loading')}</p>
          </div>
        ) : isError ? (
          <div className="empty-state card">
            <div className="empty-state-icon">
              <ClipboardList className="w-5 h-5 text-red-300" />
            </div>
            <p>{t('errors.dailyReports')}</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="empty-state card">
            <div className="empty-state-icon">
              <ClipboardList className="w-5 h-5 text-text-muted" />
            </div>
            <p>{t('noDailyReports')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {logs.map((log) => (
              <button
                key={log.id}
                type="button"
                onClick={() => setDate(log.date.slice(0, 10))}
                className="card-hover w-full p-4 text-start"
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="default">{formatDate(log.date, locale)}</Badge>
                      {log.creator && (
                        <span className="text-xs text-text-muted">
                          {t('createdBy')}: {formatText(log.creator.nameAr)}
                        </span>
                      )}
                    </div>

                    {log.summary && (
                      <div>
                        <p className="text-xs font-semibold text-text-muted">{t('summary')}</p>
                        <p className="mt-1 text-sm text-text-primary whitespace-pre-wrap">
                          {formatText(log.summary)}
                        </p>
                      </div>
                    )}

                    {log.completedWork && (
                      <div>
                        <p className="text-xs font-semibold text-text-muted">
                          {t('completedWork')}
                        </p>
                        <p className="mt-1 text-sm text-text-primary whitespace-pre-wrap">
                          {formatText(log.completedWork)}
                        </p>
                      </div>
                    )}

                    {log.blockers && (
                      <div>
                        <p className="text-xs font-semibold text-text-muted">{t('blockers')}</p>
                        <p className="mt-1 text-sm text-red-300 whitespace-pre-wrap">
                          {formatText(log.blockers)}
                        </p>
                      </div>
                    )}

                    {log.tomorrowPlan && (
                      <div>
                        <p className="text-xs font-semibold text-text-muted">
                          {t('tomorrowPlan')}
                        </p>
                        <p className="mt-1 text-sm text-text-secondary whitespace-pre-wrap">
                          {formatText(log.tomorrowPlan)}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="lg:max-w-xs">
                    <p className="text-xs font-semibold text-text-muted">
                      {t('relatedActivities')}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {log.relatedActivities.length === 0 ? (
                        <span className="text-xs text-text-muted">
                          {t('noLinkedActivities')}
                        </span>
                      ) : (
                        log.relatedActivities.map((activity) => (
                          <Badge key={activity.id} variant="muted">
                            {activity.code}
                          </Badge>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </button>
            ))}

            <div className="flex items-center justify-between gap-3 rounded-xl border border-surface-border bg-surface-card px-4 py-3">
              <p className="text-xs text-text-muted">
              {tc('page')} {formatNumber(data?.page ?? 1)} {tc('of')} {formatNumber(data?.totalPages ?? 1)}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!data || data.page <= 1}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                >
                  {tc('back')}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!data || data.page >= data.totalPages}
                  onClick={() => setPage((current) => current + 1)}
                >
                  {tc('next')}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
