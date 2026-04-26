import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { costApi } from '@/lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────

export type InvoiceStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'PAID';
export type ExtractStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'PAID';

export interface CostItem {
  id: string;
  code: string;
  nameAr: string;
  nameEn: string | null;
  category: string;
  unit: string | null;
  quantity: string | null;
  unitCost: string | null;
  totalCost: string | null;
  currency: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  date: string;
  vendor: string;
  description: string | null;
  amountBeforeTax: string;
  taxAmount: string;
  grossAmount: string;
  currency: string;
  status: InvoiceStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  costItem: { id: string; code: string; nameAr: string } | null;
  creator: { id: string; nameAr: string } | null;
}

export interface Extract {
  id: string;
  extractNumber: string;
  date: string;
  description: string | null;
  amountBeforeTax: string;
  taxAmount: string;
  totalAmount: string;
  currency: string;
  status: ExtractStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  creator: { id: string; nameAr: string } | null;
}

export interface CostOverview {
  project: {
    id: string;
    code: string;
    nameAr: string;
    contractValue: string | null;
    currency: string;
  };
  stats: {
    contractValue: number;
    budgetTotal: number;
    budgetUtilization: number;
    invoiceTotal: number;
    invoicePaid: number;
    invoicePending: number;
    extractTotal: number;
    extractPaid: number;
    extractPending: number;
    invoiceCount: number;
    extractCount: number;
    costItemCount: number;
  };
  categoryBreakdown: Record<string, number>;
  invoicesByStatus: Record<InvoiceStatus, number>;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ─── Query Keys ───────────────────────────────────────────────────────────────

export const costKeys = {
  all: (projectId: string) => ['cost', projectId] as const,
  overview: (projectId: string) => ['cost', projectId, 'overview'] as const,
  items: (projectId: string, params?: Record<string, unknown>) =>
    ['cost', projectId, 'items', params] as const,
  invoices: (projectId: string, params?: Record<string, unknown>) =>
    ['cost', projectId, 'invoices', params] as const,
  extracts: (projectId: string, params?: Record<string, unknown>) =>
    ['cost', projectId, 'extracts', params] as const,
};

// ─── Overview ─────────────────────────────────────────────────────────────────

export function useCostOverview(projectId: string) {
  return useQuery<CostOverview>({
    queryKey: costKeys.overview(projectId),
    queryFn: async () => {
      const res = await costApi.getOverview(projectId);
      return (res.data as { data: CostOverview }).data;
    },
    enabled: Boolean(projectId),
  });
}

// ─── Cost Items ───────────────────────────────────────────────────────────────

export function useCostItems(projectId: string, params?: Record<string, unknown>) {
  return useQuery<PaginatedResult<CostItem>>({
    queryKey: costKeys.items(projectId, params),
    queryFn: async () => {
      const res = await costApi.listItems(projectId, params);
      return (res.data as { data: PaginatedResult<CostItem> }).data;
    },
    enabled: Boolean(projectId),
  });
}

export function useCreateCostItem(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: unknown) => costApi.createItem(projectId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: costKeys.all(projectId) });
    },
  });
}

export function useUpdateCostItem(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, data }: { itemId: string; data: unknown }) =>
      costApi.updateItem(projectId, itemId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: costKeys.all(projectId) });
    },
  });
}

export function useDeleteCostItem(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (itemId: string) => costApi.deleteItem(projectId, itemId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: costKeys.all(projectId) });
    },
  });
}

// ─── Invoices ─────────────────────────────────────────────────────────────────

export function useInvoices(projectId: string, params?: Record<string, unknown>) {
  return useQuery<PaginatedResult<Invoice>>({
    queryKey: costKeys.invoices(projectId, params),
    queryFn: async () => {
      const res = await costApi.listInvoices(projectId, params);
      return (res.data as { data: PaginatedResult<Invoice> }).data;
    },
    enabled: Boolean(projectId),
  });
}

export function useCreateInvoice(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: unknown) => costApi.createInvoice(projectId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: costKeys.all(projectId) });
    },
  });
}

export function useUpdateInvoice(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ invoiceId, data }: { invoiceId: string; data: unknown }) =>
      costApi.updateInvoice(projectId, invoiceId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: costKeys.all(projectId) });
    },
  });
}

export function useDeleteInvoice(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (invoiceId: string) => costApi.deleteInvoice(projectId, invoiceId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: costKeys.all(projectId) });
    },
  });
}

// ─── Extracts ─────────────────────────────────────────────────────────────────

export function useExtracts(projectId: string, params?: Record<string, unknown>) {
  return useQuery<PaginatedResult<Extract>>({
    queryKey: costKeys.extracts(projectId, params),
    queryFn: async () => {
      const res = await costApi.listExtracts(projectId, params);
      return (res.data as { data: PaginatedResult<Extract> }).data;
    },
    enabled: Boolean(projectId),
  });
}

export function useCreateExtract(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: unknown) => costApi.createExtract(projectId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: costKeys.all(projectId) });
    },
  });
}

export function useUpdateExtract(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ extractId, data }: { extractId: string; data: unknown }) =>
      costApi.updateExtract(projectId, extractId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: costKeys.all(projectId) });
    },
  });
}

export function useDeleteExtract(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (extractId: string) => costApi.deleteExtract(projectId, extractId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: costKeys.all(projectId) });
    },
  });
}
