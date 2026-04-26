import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { clientsApi } from '@/lib/api';

export interface ClientRecord {
  id: string;
  nameAr: string;
  nameEn: string | null;
  code: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ClientsListParams {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
}

export interface PaginatedClients {
  items: ClientRecord[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const QUERY_KEY = 'clients';

export function useClients(params: ClientsListParams = {}) {
  return useQuery<PaginatedClients>({
    queryKey: [QUERY_KEY, params],
    queryFn: async () => {
      const cleanParams: Record<string, unknown> = {};
      if (params.page) cleanParams.page = params.page;
      if (params.limit) cleanParams.limit = params.limit;
      if (params.search) cleanParams.search = params.search;
      if (params.isActive !== undefined) cleanParams.isActive = params.isActive;
      const { data } = await clientsApi.list(cleanParams);
      return (data as { data: PaginatedClients }).data;
    },
  });
}

export function useClient(id: string | null) {
  return useQuery<ClientRecord>({
    queryKey: [QUERY_KEY, id],
    queryFn: async () => {
      const { data } = await clientsApi.getById(id!);
      return (data as { data: ClientRecord }).data;
    },
    enabled: !!id,
  });
}

export function useCreateClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: unknown) => clientsApi.create(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: [QUERY_KEY] }),
  });
}

export function useUpdateClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: unknown }) =>
      clientsApi.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [QUERY_KEY] }),
  });
}

export function useRemoveClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => clientsApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: [QUERY_KEY] }),
  });
}
