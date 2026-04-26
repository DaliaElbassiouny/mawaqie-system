'use client';

import { useRef, useState } from 'react';
import { useLocale } from 'next-intl';
import {
  FileText,
  FileType2,
  FileImage,
  FileSpreadsheet,
  FileArchive,
  Upload,
  Download,
  Trash2,
  File,
} from 'lucide-react';
import { cn, formatDateWithEnglishDigits } from '@/lib/utils';
import { useDocuments, useUploadDocument, useDeleteDocument } from '@/hooks/useDocuments';
import { documentsApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';

const CATEGORY_LABELS: Record<string, { ar: string; en: string }> = {
  general: { ar: 'عام', en: 'General' },
  purchase_request: { ar: 'طلب شراء', en: 'Purchase Request' },
  quotation: { ar: 'عرض سعر', en: 'Quotation' },
  approval: { ar: 'اعتماد', en: 'Approval' },
  drawing: { ar: 'مخطط', en: 'Drawing' },
  method_statement: { ar: 'بيان طريقة', en: 'Method Statement' },
  invoice: { ar: 'فاتورة', en: 'Invoice' },
  extract: { ar: 'مستخلص', en: 'Extract' },
  contract: { ar: 'عقد', en: 'Contract' },
};

const CATEGORIES = Object.keys(CATEGORY_LABELS);

function FileIcon({ mimeType, className }: { mimeType: string; className?: string }) {
  const cls = cn('w-5 h-5', className);
  if (mimeType === 'application/pdf') return <FileType2 className={cls} />;
  if (mimeType.startsWith('image/')) return <FileImage className={cls} />;
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return <FileSpreadsheet className={cls} />;
  if (mimeType.includes('zip') || mimeType.includes('archive')) return <FileArchive className={cls} />;
  if (mimeType.includes('word')) return <FileText className={cls} />;
  return <File className={cls} />;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface Props {
  entityType: string;
  entityId: string;
  defaultCategory?: string;
  readOnly?: boolean;
}

export function DocumentSection({ entityType, entityId, defaultCategory = 'general', readOnly = false }: Props) {
  const locale = useLocale();
  const { user } = useAuthStore();
  const isAr = locale === 'ar';
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(defaultCategory);
  const [uploadTitle, setUploadTitle] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const { data: docs = [], isLoading } = useDocuments(entityType, entityId);
  const upload = useUploadDocument();
  const del = useDeleteDocument();

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('entityType', entityType);
      fd.append('entityId', entityId);
      fd.append('category', selectedCategory);
      if (uploadTitle.trim()) fd.append('title', uploadTitle.trim());
      await upload.mutateAsync(fd);
      setUploadTitle('');
      if (fileRef.current) fileRef.current.value = '';
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    await del.mutateAsync(id);
    setConfirmDeleteId(null);
  };

  const downloadUrl = (id: string) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : '';
    return documentsApi.getDownloadUrl(id) + (token ? `?token=${token}` : '');
  };

  return (
    <div className="space-y-4">
      {!readOnly && (
        <div className="rounded-xl border border-surface-border bg-surface-hover/30 p-4 space-y-3">
          <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide">
            {isAr ? 'رفع مستند' : 'Upload Document'}
          </p>
          <div className="flex flex-wrap gap-2 items-center">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="field-select h-8 text-xs w-40"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {isAr ? CATEGORY_LABELS[cat].ar : CATEGORY_LABELS[cat].en}
                </option>
              ))}
            </select>
            <input
              type="text"
              placeholder={isAr ? 'عنوان اختياري...' : 'Optional title...'}
              value={uploadTitle}
              onChange={(e) => setUploadTitle(e.target.value)}
              className="field-input h-8 text-xs flex-1 min-w-32"
            />
            <label
              className={cn(
                'flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium cursor-pointer transition-colors',
                uploading
                  ? 'bg-surface-hover text-text-muted cursor-not-allowed'
                  : 'bg-brand text-white hover:bg-brand/90',
              )}
            >
              <Upload className="w-3.5 h-3.5" />
              {uploading ? (isAr ? 'جارٍ الرفع...' : 'Uploading...') : (isAr ? 'اختيار ملف' : 'Choose File')}
              <input
                ref={fileRef}
                type="file"
                className="hidden"
                disabled={uploading}
                onChange={handleUpload}
              />
            </label>
          </div>
          <p className="text-[10px] text-text-muted">
            {isAr ? 'الأنواع المدعومة: PDF، Word، Excel، صور، ZIP — الحجم الأقصى 20 ميغابايت' : 'Supported: PDF, Word, Excel, Images, ZIP — max 20 MB'}
          </p>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-8 text-text-muted text-sm">
          <div className="h-5 w-5 border-2 border-brand border-t-transparent rounded-full animate-spin me-2" />
          {isAr ? 'جارٍ التحميل...' : 'Loading...'}
        </div>
      ) : docs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 gap-2 text-text-muted border border-dashed border-surface-border rounded-xl">
          <FileText className="w-8 h-8 opacity-25" />
          <p className="text-sm">{isAr ? 'لا توجد مستندات مرفقة' : 'No attachments yet'}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {docs.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center gap-3 rounded-xl border border-surface-border bg-surface-card px-4 py-3 hover:bg-surface-hover/30 transition-colors"
            >
              <div className="rounded-lg bg-surface-hover p-2 flex-shrink-0">
                <FileIcon mimeType={doc.mimeType} className="text-text-secondary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-text-primary truncate">
                  {doc.title || doc.originalName}
                </p>
                <div className="flex items-center gap-2 flex-wrap mt-0.5">
                  <span className="text-xs text-text-muted">{formatFileSize(doc.size)}</span>
                  <span className="text-text-muted/40 text-xs">·</span>
                  <span className="text-xs text-text-muted">
                    {isAr ? CATEGORY_LABELS[doc.category]?.ar : CATEGORY_LABELS[doc.category]?.en}
                  </span>
                  <span className="text-text-muted/40 text-xs">·</span>
                  <span className="text-xs text-text-muted">
                    {formatDateWithEnglishDigits(doc.createdAt, locale, { month: 'short', day: 'numeric' })}
                  </span>
                  {doc.uploadedBy && (
                    <>
                      <span className="text-text-muted/40 text-xs">·</span>
                      <span className="text-xs text-text-muted">{doc.uploadedBy.nameAr}</span>
                    </>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <a
                  href={documentsApi.getDownloadUrl(doc.id)}
                  target="_blank"
                  rel="noreferrer"
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-text-muted hover:bg-surface-hover hover:text-text-primary transition-colors"
                  title={isAr ? 'تحميل' : 'Download'}
                  onClick={(e) => {
                    e.preventDefault();
                    const token = localStorage.getItem('accessToken') ?? '';
                    const link = document.createElement('a');
                    link.href = documentsApi.getDownloadUrl(doc.id);
                    link.setAttribute('data-download', doc.originalName);
                    fetch(documentsApi.getDownloadUrl(doc.id), {
                      headers: { Authorization: `Bearer ${token}` },
                    }).then((r) => r.blob()).then((blob) => {
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = doc.originalName;
                      a.click();
                      URL.revokeObjectURL(url);
                    });
                  }}
                >
                  <Download className="w-3.5 h-3.5" />
                </a>
                {!readOnly && doc.uploadedBy?.id === user?.id && (
                  confirmDeleteId === doc.id ? (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleDelete(doc.id)}
                        className="h-7 px-2 rounded-lg text-xs font-medium bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors"
                      >
                        {isAr ? 'تأكيد' : 'Confirm'}
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        className="h-7 px-2 rounded-lg text-xs text-text-muted hover:bg-surface-hover transition-colors"
                      >
                        {isAr ? 'إلغاء' : 'Cancel'}
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDeleteId(doc.id)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-text-muted hover:bg-red-500/10 hover:text-red-500 transition-colors"
                      title={isAr ? 'حذف' : 'Delete'}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
