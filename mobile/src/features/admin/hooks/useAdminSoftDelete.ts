import { useState } from 'react';
import { Alert } from 'react-native';
import { useMutation, useQueryClient, type QueryKey } from '@tanstack/react-query';

import { getDisplayError } from '../../../api/client';
import { useAuthStore } from '../../../state/authStore';
import { canSoftDeleteRecords, SOFT_DELETE_COPY, type SoftDeleteEntity, type SoftDeleteFormValues } from '../../../utils/softDelete';

interface UseAdminSoftDeleteOptions<T> {
  entity: SoftDeleteEntity;
  deleteRecord: (record: T, payload: SoftDeleteFormValues) => Promise<unknown>;
  restoreRecord: (record: T) => Promise<unknown>;
  // Every list that shows this resource; each key is invalidated as a prefix.
  invalidateKeys: QueryKey[];
}

/**
 * Delete / restore state for one admin list: the pending record, the guarded
 * DELETE and the restore POST, server errors (localized by the API) and list
 * invalidation. `canSoftDelete` hides the actions from roles the backend
 * would refuse (only platform super admins).
 */
export function useAdminSoftDelete<T>({ entity, deleteRecord, restoreRecord, invalidateKeys }: UseAdminSoftDeleteOptions<T>) {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const canSoftDelete = canSoftDeleteRecords(user as Parameters<typeof canSoftDeleteRecords>[0]);
  const copy = SOFT_DELETE_COPY[entity];

  const [pendingDelete, setPendingDelete] = useState<T | null>(null);
  const [pendingRestore, setPendingRestore] = useState<T | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function invalidate() {
    await Promise.all(invalidateKeys.map((queryKey) => queryClient.invalidateQueries({ queryKey })));
  }

  const deleteMutation = useMutation({
    mutationFn: async ({ record, payload }: { record: T; payload: SoftDeleteFormValues }) => deleteRecord(record, payload),
    onMutate: () => setDeleteError(null),
    onSuccess: async () => {
      setPendingDelete(null);
      await invalidate();
      Alert.alert('تم', copy.deletedToast);
    },
    // Wrong password, missing reason, 403 or a dependency error: keep the
    // modal open and show the server's (Arabic) message inside it.
    onError: (error) => setDeleteError(getDisplayError(error)),
  });

  const restoreMutation = useMutation({
    mutationFn: async (record: T) => restoreRecord(record),
    onSuccess: async () => {
      setPendingRestore(null);
      await invalidate();
      Alert.alert('تم', copy.restoredToast);
    },
    onError: (error) => {
      setPendingRestore(null);
      Alert.alert('تعذرت الاستعادة', getDisplayError(error));
    },
  });

  return {
    canSoftDelete,
    copy,
    pendingDelete,
    pendingRestore,
    deleteError,
    deleting: deleteMutation.isPending,
    restoring: restoreMutation.isPending,
    requestDelete: (record: T) => {
      setDeleteError(null);
      setPendingDelete(record);
    },
    cancelDelete: () => {
      setDeleteError(null);
      setPendingDelete(null);
    },
    confirmDelete: (payload: SoftDeleteFormValues) => {
      if (pendingDelete) deleteMutation.mutate({ record: pendingDelete, payload });
    },
    requestRestore: (record: T) => setPendingRestore(record),
    cancelRestore: () => setPendingRestore(null),
    confirmRestore: () => {
      if (pendingRestore && !restoreMutation.isPending) restoreMutation.mutate(pendingRestore);
    },
  };
}
