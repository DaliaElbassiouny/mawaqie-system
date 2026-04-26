import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { projectsApi } from '@/lib/api';

export type ProjectStatus = 'PLANNING' | 'ACTIVE' | 'ON_HOLD' | 'COMPLETED' | 'CANCELLED';
export type ProjectSourceType = 'TENDER' | 'DIRECT';

export interface ProjectClient {
  id: string;
  code: string;
  nameAr: string;
  nameEn: string | null;
}

export interface ProjectTender {
  id: string;
  code: string;
  nameAr: string;
  nameEn: string | null;
  status: string;
  client: ProjectClient;
}

export interface ProjectTeamMember {
  id: string;
  userId: string;
  roleId: string;
  createdAt: string;
  user: {
    id: string;
    email: string;
    nameAr: string;
    nameEn: string | null;
  };
  role: {
    id: string;
    code: string;
    nameAr: string;
    nameEn: string;
  };
}

export interface ProjectRecord {
  id: string;
  code: string;
  nameAr: string;
  nameEn: string | null;
  tenderId: string | null;
  sourceType: ProjectSourceType;
  tender: ProjectTender | null;
  companyCode: string | null;
  location: string | null;
  projectType: string | null;
  currency: string;
  status: ProjectStatus;
  startDate: string | null;
  endDate: string | null;
  contractValue: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  userRoles: ProjectTeamMember[];
  _count: {
    userRoles: number;
    costItems: number;
    purchaseRequests: number;
  };
}

export interface ProjectsListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: ProjectStatus | '';
}

export interface PaginatedProjects {
  items: ProjectRecord[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ProjectTeamPayload {
  members: { userId: string; roleId: string }[];
}

const QUERY_KEY = 'projects';

export function useProjects(params: ProjectsListParams = {}) {
  return useQuery<PaginatedProjects>({
    queryKey: [QUERY_KEY, params],
    queryFn: async () => {
      const cleanParams: Record<string, unknown> = {};
      if (params.page) cleanParams.page = params.page;
      if (params.limit) cleanParams.limit = params.limit;
      if (params.search) cleanParams.search = params.search;
      if (params.status) cleanParams.status = params.status;
      const { data } = await projectsApi.list(cleanParams);
      return (data as { data: PaginatedProjects }).data;
    },
  });
}

export function useProject(id: string | null) {
  return useQuery<ProjectRecord>({
    queryKey: [QUERY_KEY, id],
    queryFn: async () => {
      const { data } = await projectsApi.getById(id!);
      return (data as { data: ProjectRecord }).data;
    },
    enabled: !!id,
  });
}

export function useCreateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: unknown) => projectsApi.create(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: [QUERY_KEY] }),
  });
}

export function useUpdateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: unknown }) =>
      projectsApi.update(id, data),
    onSuccess: (_res, variables) => {
      qc.invalidateQueries({ queryKey: [QUERY_KEY] });
      qc.invalidateQueries({ queryKey: [QUERY_KEY, variables.id] });
    },
  });
}

export function useAssignProjectTeam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ProjectTeamPayload }) =>
      projectsApi.assignTeam(id, data),
    onSuccess: (_res, variables) => {
      qc.invalidateQueries({ queryKey: [QUERY_KEY] });
      qc.invalidateQueries({ queryKey: [QUERY_KEY, variables.id] });
    },
  });
}

export function useRemoveProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => projectsApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: [QUERY_KEY] }),
  });
}
