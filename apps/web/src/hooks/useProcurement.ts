'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { procurementApi } from '@/lib/api';

export function useProcurementDashboard() {
  return useQuery({
    queryKey: ['procurement', 'dashboard'],
    queryFn: async () => {
      const res = await procurementApi.getDashboard();
      return res.data.data as ProcurementDashboard;
    },
  });
}

export function usePurchaseRequests(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: ['procurement', 'requests', params],
    queryFn: async () => {
      const res = await procurementApi.listRequests(params);
      return res.data.data as PurchaseRequestsPage;
    },
  });
}

export function usePurchaseRequest(id: string) {
  return useQuery({
    queryKey: ['procurement', 'request', id],
    queryFn: async () => {
      const res = await procurementApi.getById(id);
      return res.data.data as PurchaseRequest;
    },
    enabled: !!id,
  });
}

export function useCreatePurchaseRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: unknown) => procurementApi.create(data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['procurement'] });
    },
  });
}

export function useUpdatePurchaseRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: unknown }) =>
      procurementApi.update(id, data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['procurement'] });
    },
  });
}

export function useDeletePurchaseRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => procurementApi.delete(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['procurement'] });
    },
  });
}

export function useSubmitPurchaseRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, note }: { id: string; note?: string }) =>
      procurementApi.submit(id, { note }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['procurement'] });
    },
  });
}

export function useApprovePRStage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, note }: { id: string; note?: string }) =>
      procurementApi.approveStage(id, { note }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['procurement'] });
    },
  });
}

export function useRejectPRStage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, note }: { id: string; note?: string }) =>
      procurementApi.rejectStage(id, { note }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['procurement'] });
    },
  });
}

export function useMarkPRDelivery() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'FULFILLED' | 'RECEIVED' | 'COMPLETED' }) =>
      procurementApi.markDelivery(id, status),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['procurement'] });
    },
  });
}

// ─── Types ──────────────────────────────────────────────────────────────────

export type PRStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'PENDING_APPROVAL'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'CANCELLED'
  | 'PARTIALLY_FULFILLED'
  | 'FULFILLED'
  | 'RECEIVED'
  | 'ORDERED'
  | 'COMPLETED';

export type PRApprovalStage =
  | 'DRAFT'
  | 'PROCUREMENT_REVIEW'
  | 'COST_REVIEW'
  | 'PM_REVIEW'
  | 'FINAL_REVIEW'
  | 'COMPLETED'
  | 'REJECTED';

export type PRPriority = 'LOW' | 'MEDIUM' | 'HIGH';
export type PRRequirementType = 'MATERIALS' | 'EQUIPMENT' | 'SERVICES' | 'OTHER';

export type PRApprovalStep = {
  id: string;
  stage: PRApprovalStage;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  note?: string | null;
  decidedAt?: string | null;
  createdAt: string;
  actor?: { id: string; nameAr: string; nameEn?: string | null } | null;
};

export type PurchaseRequestItem = {
  id: string;
  lineNumber: number;
  titleAr: string;
  titleEn?: string | null;
  description?: string | null;
  quantity?: string | null;
  unit?: string | null;
  unitPrice?: string | null;
  estimatedTotal?: string | null;
  approvedQuantity?: string | null;
  approvedUnitPrice?: string | null;
  approvedTotal?: string | null;
  notes?: string | null;
};

export type PurchaseRequest = {
  id: string;
  prNumber: string;
  nameAr: string;
  nameEn?: string | null;
  description?: string | null;
  requirementType: PRRequirementType;
  priority: PRPriority;
  status: PRStatus;
  currentStage: PRApprovalStage;
  currency: string;
  quantity?: string | null;
  unit?: string | null;
  totalAmount?: string | null;
  vendor?: string | null;
  expectedDeliveryDate?: string | null;
  actualDeliveryDate?: string | null;
  notes?: string | null;
  approvalNote?: string | null;
  approvedAt?: string | null;
  requestedAt: string;
  updatedAt: string;
  project: { id: string; code: string; nameAr: string; nameEn?: string | null };
  activity?: { id: string; code: string; nameAr: string; status: string } | null;
  requester?: { id: string; nameAr: string; nameEn?: string | null } | null;
  approvedBy?: { id: string; nameAr: string } | null;
  // Present only in detail response (GET /requests/:id); absent in list response
  items?: PurchaseRequestItem[];
  approvalSteps?: PRApprovalStep[];
};

export type PurchaseRequestsPage = {
  items: PurchaseRequest[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export type ProcurementDashboard = {
  summary: {
    total: number;
    draft: number;
    submitted: number;
    underReview: number;
    approved: number;
    rejected: number;
    fulfilled: number;
    pendingApproval: number;
  };
  byStatus: Array<{ status: string; count: number }>;
  byPriority: Array<{ priority: string; count: number }>;
  byType: Array<{ type: string; count: number }>;
  recentRequests: PurchaseRequest[];
};
