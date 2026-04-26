'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { documentsApi } from '@/lib/api';

export type Document = {
  id: string;
  entityType: string;
  entityId: string;
  fileName: string;
  originalName: string;
  mimeType: string;
  size: number;
  category: string;
  title?: string | null;
  description?: string | null;
  storagePath: string;
  createdAt: string;
  uploadedBy?: { id: string; nameAr: string } | null;
};

export function useDocuments(entityType: string, entityId: string) {
  return useQuery({
    queryKey: ['documents', entityType, entityId],
    queryFn: async () => {
      const res = await documentsApi.list({ entityType, entityId });
      return (res.data.data as { items: Document[] }).items;
    },
    enabled: !!entityType && !!entityId,
  });
}

export function useUploadDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (formData: FormData) => documentsApi.upload(formData),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['documents'] });
    },
  });
}

export function useDeleteDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => documentsApi.delete(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['documents'] });
    },
  });
}
