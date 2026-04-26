import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tendersApi } from '@/lib/api';

export type TenderStatus =
  | 'PRICING_IN_PROGRESS'
  | 'PRICED_SUBMITTED'
  | 'CONTRACTED'
  | 'LOST';

export interface TenderClient {
  id: string;
  code: string;
  nameAr: string;
  nameEn: string | null;
}

export interface TenderRecord {
  id: string;
  code: string;
  nameAr: string;
  nameEn: string | null;
  clientId: string;
  client: TenderClient;
  status: TenderStatus;
  location: string | null;
  projectType: string | null;
  leadSource: string | null;
  currency: string;
  estimatedValue: string | null;
  submittedValue: string | null;
  bidReceiptDate: string | null;
  dueDate: string | null;
  submittedAt: string | null;
  awardedAt: string | null;
  bidResult: string | null;
  assignedEngineer: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TenderStats {
  total: number;
  byStatus: Record<TenderStatus, number>;
  totalEstimatedValue: string;
  totalSubmittedValue: string;
}

export interface PaginatedTenders {
  items: TenderRecord[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface TendersListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: TenderStatus | '';
  location?: string;
  projectType?: string;
}

const QUERY_KEY = 'tenders';

export function useTenders(params: TendersListParams = {}) {
  return useQuery<PaginatedTenders>({
    queryKey: [QUERY_KEY, params],
    queryFn: async () => {
      const p: Record<string, unknown> = {};
      if (params.page) p.page = params.page;
      if (params.limit) p.limit = params.limit;
      if (params.search) p.search = params.search;
      if (params.status) p.status = params.status;
      if (params.location) p.location = params.location;
      if (params.projectType) p.projectType = params.projectType;
      const { data } = await tendersApi.list(p);
      return (data as { data: PaginatedTenders }).data;
    },
  });
}

export function useTenderStats() {
  return useQuery<TenderStats>({
    queryKey: [QUERY_KEY, 'stats'],
    queryFn: async () => {
      const { data } = await tendersApi.stats();
      return (data as { data: TenderStats }).data;
    },
  });
}

export function useTender(id: string | null) {
  return useQuery<TenderRecord>({
    queryKey: [QUERY_KEY, id],
    queryFn: async () => {
      const { data } = await tendersApi.getById(id!);
      return (data as { data: TenderRecord }).data;
    },
    enabled: !!id,
  });
}

export function useCreateTender() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: unknown) => tendersApi.create(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: [QUERY_KEY] }),
  });
}

export function useUpdateTender() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: unknown }) =>
      tendersApi.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [QUERY_KEY] }),
  });
}

export function useRemoveTender() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => tendersApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: [QUERY_KEY] }),
  });
}
