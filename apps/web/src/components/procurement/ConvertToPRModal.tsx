'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCreatePurchaseRequest } from '@/hooks/useProcurement';
import { useUpdateProcurementRequirement } from '@/hooks/useOperations';
import type { ActivityRecord, ProcurementRequirementType } from '@/hooks/useOperations';

const PRIORITY_OPTIONS = [
  { value: 'LOW', ar: 'منخفضة' },
  { value: 'MEDIUM', ar: 'متوسطة' },
  { value: 'HIGH', ar: 'عالية' },
] as const;

const TYPE_MAP: Record<ProcurementRequirementType, string> = {
  MATERIALS: 'مواد',
  EQUIPMENT: 'معدات',
};

interface ConvertToPRModalProps {
  projectId: string;
  activity: ActivityRecord;
  requirementType: ProcurementRequirementType;
  requirementValue: string;
  onClose: () => void;
  onSuccess: (prNumber: string) => void;
}

export function ConvertToPRModal({
  projectId,
  activity,
  requirementType,
  requirementValue,
  onClose,
  onSuccess,
}: ConvertToPRModalProps) {
  const createPR = useCreatePurchaseRequest();
  const updateRequirement = useUpdateProcurementRequirement(projectId);

  const [nameAr, setNameAr] = useState(
    `${TYPE_MAP[requirementType]}: ${activity.nameAr}`,
  );
  const [description, setDescription] = useState(requirementValue);
  const [priority, setPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH'>('MEDIUM');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [createdPrNumber, setCreatedPrNumber] = useState<string | null>(null);
  const [partialSuccess, setPartialSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const isPending = createPR.isPending || updateRequirement.isPending;
  const isLockedAfterCreation = partialSuccess || successMessage !== null;
  const isFormDisabled = isPending || isLockedAfterCreation;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isLockedAfterCreation) return;

    setError(null);
    setSuccessMessage(null);

    if (!nameAr.trim()) {
      setError('اسم طلب الشراء مطلوب.');
      return;
    }

    let prNumber = createdPrNumber;

    if (!prNumber) {
      try {
        const res = await createPR.mutateAsync({
          projectId,
          activityId: activity.id,
          nameAr: nameAr.trim(),
          description: description.trim() || undefined,
          requirementType,
          priority,
          notes: notes.trim() || undefined,
          saveAsDraft: false,
        });
        prNumber = (res.data as { data?: { prNumber?: string } }).data?.prNumber ?? null;
        setCreatedPrNumber(prNumber);
      } catch (err: unknown) {
        const httpStatus = (err as { response?: { status?: number } }).response?.status;
        if (httpStatus === 403) {
          setError('ليس لديك صلاحية لإنشاء طلب شراء.');
        } else {
          setError('تعذر إنشاء طلب الشراء. حاول مرة أخرى.');
        }
        return;
      }
    }

    try {
      await updateRequirement.mutateAsync({
        activityId: activity.id,
        requirementType,
        status: 'REQUESTED',
        notes: prNumber ? `تم إنشاء طلب شراء: ${prNumber}` : undefined,
      });
      setSuccessMessage('تم إنشاء طلب الشراء بنجاح.');
      onSuccess(prNumber ?? '');
    } catch {
      setPartialSuccess(true);
      setError('تم إنشاء طلب الشراء بنجاح، لكن تعذر تحديث حالة الاحتياج. سيتم ظهور الطلب المرتبط بعد تحديث الصفحة.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-surface-border bg-navy-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-surface-border px-5 py-4">
          <h2 className="text-base font-semibold text-text-primary">تحويل إلى طلب شراء</h2>
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="rounded-lg p-1.5 text-text-muted hover:bg-surface-card hover:text-text-primary"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4 p-5">
          <div className="rounded-lg border border-surface-border bg-surface-card px-3 py-2 text-xs text-text-muted">
            <span className="font-mono">{activity.code}</span>
            {' — '}
            <span>{activity.nameAr}</span>
            {' — '}
            <span className="text-brand">{TYPE_MAP[requirementType]}</span>
          </div>

          <div className="space-y-1">
            <label className="label-text">اسم طلب الشراء *</label>
            <Input
              value={nameAr}
              onChange={(e) => setNameAr(e.target.value)}
              placeholder="اسم طلب الشراء بالعربية"
              required
              disabled={isFormDisabled}
            />
          </div>

          <div className="space-y-1">
            <label className="label-text">وصف الاحتياج</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="تفاصيل المواد أو المعدات المطلوبة"
              rows={3}
              className="field-input w-full resize-none"
              disabled={isFormDisabled}
            />
          </div>

          <div className="space-y-1">
            <label className="label-text">الأولوية</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as typeof priority)}
              className="field-select w-full"
              disabled={isFormDisabled}
            >
              {PRIORITY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.ar}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="label-text">ملاحظات</label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="ملاحظات إضافية (اختياري)"
              disabled={isFormDisabled}
            />
          </div>

          {createdPrNumber && (
            <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">
              <span>رقم طلب الشراء: </span>
              <span className="font-mono" dir="ltr">{createdPrNumber}</span>
            </div>
          )}

          {successMessage && (
            <p className="rounded-lg bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">{successMessage}</p>
          )}

          {error && (
            <p className="rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-400">{error}</p>
          )}

          <div className="flex justify-end gap-3 pt-1">
            {partialSuccess ? (
              <Button type="button" onClick={onClose}>
                إغلاق
              </Button>
            ) : (
              <>
                <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
                  إلغاء
                </Button>
                <Button type="submit" disabled={isPending || isLockedAfterCreation}>
                  {isPending ? 'جارٍ الإنشاء...' : 'إنشاء طلب الشراء'}
                </Button>
              </>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
