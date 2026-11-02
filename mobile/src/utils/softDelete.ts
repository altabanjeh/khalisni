/**
 * Soft delete / restore for the admin lists (requirement SD-MOB, the mobile
 * twin of the web's AdminSoftDeleteModal + Active/Deleted/All filter).
 *
 * Backend contract (backend/core/delete_guard.py, AdminDeleteGuardMixin):
 * - Lists hide deleted rows unless `include_deleted=true`. Paginated lists that
 *   honour `is_deleted` (services, users) narrow on the server so a "deleted
 *   only" page counts correctly; the others (advertisements) are filtered here.
 * - DELETE <resource>/<id>/ with a JSON body { delete_password, delete_reason }.
 *   The password is the acting admin's current account password.
 * - POST <resource>/<id>/restore/ undoes it.
 * - Only platform super admins may delete or restore (is_platform_super_admin).
 */

export type SoftDeleteStatus = 'active' | 'deleted' | 'all';

export const DEFAULT_SOFT_DELETE_STATUS: SoftDeleteStatus = 'active';

export const SOFT_DELETE_STATUS_OPTIONS: ReadonlyArray<{ value: SoftDeleteStatus; label: string; accessibilityLabel: string }> = [
  { value: 'active', label: 'النشطة', accessibilityLabel: 'عرض السجلات النشطة' },
  { value: 'deleted', label: 'المحذوفة', accessibilityLabel: 'عرض السجلات المحذوفة' },
  { value: 'all', label: 'الكل', accessibilityLabel: 'عرض كل السجلات' },
];

export interface SoftDeleteFields {
  is_deleted?: boolean;
  deleted_at?: string | null;
  delete_reason?: string;
  // Returned by the services list to admins who may delete/restore only.
  deleted_by_name?: string;
}

/**
 * The deletion facts the API returned for a deleted row, as Arabic lines
 * (reason, time, who). Missing facts are left out, never invented.
 */
export function deletionDetails(record: SoftDeleteFields, formatTime: (value: string) => string): string[] {
  if (!record?.is_deleted) return [];
  const lines: string[] = [];
  if (record.delete_reason?.trim()) lines.push(`السبب: ${record.delete_reason.trim()}`);
  if (record.deleted_at) lines.push(`تاريخ الحذف: ${formatTime(record.deleted_at)}`);
  if (record.deleted_by_name?.trim()) lines.push(`حذفه: ${record.deleted_by_name.trim()}`);
  return lines;
}

/**
 * Query parameters for one status. `serverNarrows` is true for list endpoints
 * that filter `is_deleted` themselves (ServiceAdminViewSet, AdminUserViewSet).
 */
export function softDeleteListParams(status: SoftDeleteStatus, serverNarrows = false): Record<string, boolean> {
  if (status === 'active') return {};
  const params: Record<string, boolean> = { include_deleted: true };
  if (status === 'deleted' && serverNarrows) params.is_deleted = true;
  return params;
}

/** Same rule as the web's filterSoftDeleted (frontend/src/api/services.js). */
export function filterBySoftDeleteStatus<T extends SoftDeleteFields>(records: T[], status: SoftDeleteStatus): T[] {
  if (status === 'deleted') return records.filter((record) => Boolean(record?.is_deleted));
  if (status === 'active') return records.filter((record) => !record?.is_deleted);
  return records;
}

export interface SoftDeleteFormValues {
  delete_reason: string;
  delete_password: string;
}

export interface SoftDeleteFormErrors {
  delete_reason?: string;
  delete_password?: string;
}

export const DELETE_REASON_REQUIRED = 'سبب الحذف مطلوب.';
export const DELETE_PASSWORD_REQUIRED = 'كلمة مرور حسابك الإداري الحالية مطلوبة.';

export function validateSoftDeleteForm(values: SoftDeleteFormValues): SoftDeleteFormErrors {
  const errors: SoftDeleteFormErrors = {};
  if (!String(values.delete_reason ?? '').trim()) errors.delete_reason = DELETE_REASON_REQUIRED;
  if (!String(values.delete_password ?? '').trim()) errors.delete_password = DELETE_PASSWORD_REQUIRED;
  return errors;
}

export function normalizeSoftDeletePayload(values: SoftDeleteFormValues): SoftDeleteFormValues {
  return {
    delete_reason: String(values.delete_reason ?? '').trim(),
    delete_password: String(values.delete_password ?? '').trim(),
  };
}

interface MembershipLike {
  role?: string | null;
  is_active?: boolean;
}

interface ActingUserLike {
  role?: string | null;
  is_superuser?: boolean;
  is_super_admin?: boolean;
  memberships?: MembershipLike[] | null;
}

/**
 * Who sees delete / restore. Mirrors backend is_platform_super_admin: a
 * Django superuser, the `admin` account role, or an active platform super
 * admin membership. Everyone else gets 403 from the server, so the actions
 * are not offered (UI-TR-07).
 */
export function canSoftDeleteRecords(user: ActingUserLike | null | undefined): boolean {
  if (!user) return false;
  if (user.is_superuser || user.is_super_admin) return true;
  if (String(user.role ?? '').trim().toLowerCase() === 'admin') return true;
  return Array.isArray(user.memberships)
    && user.memberships.some((membership) => membership?.is_active !== false && membership?.role === 'platform_super_admin');
}

interface ManagedUserLike {
  role?: string | null;
  is_super_admin?: boolean;
}

/**
 * Same per-row rule as the web's AdminUsersRolesPage.canManageUserRecord: an
 * admin whose role options do not include `admin` cannot touch admin or
 * superuser accounts.
 */
export function canManageUserRecord(record: ManagedUserLike, canManageAdminUsers: boolean): boolean {
  if (canManageAdminUsers) return true;
  return !record?.is_super_admin && record?.role !== 'admin';
}

export type SoftDeleteEntity = 'service' | 'advertisement' | 'user';

export const SOFT_DELETE_COPY: Record<SoftDeleteEntity, {
  title: string;
  impact: string;
  confirmLabel: string;
  deletedToast: string;
  restoreTitle: string;
  restoreMessage: (name: string) => string;
  restoredToast: string;
}> = {
  service: {
    title: 'تأكيد حذف الخدمة',
    impact: 'الحذف هنا حذف مرن: تختفي الخدمة من الكتالوج ولا يمكن تقديم طلبات جديدة عليها، وتبقى الطلبات السابقة وسجل التدقيق محفوظة ويمكن استعادتها لاحقاً.',
    confirmLabel: 'تأكيد الحذف',
    deletedToast: 'تم حذف الخدمة.',
    restoreTitle: 'استعادة الخدمة',
    restoreMessage: (name) => `ستتم استعادة الخدمة «${name}» لتعود إلى الشاشات الإدارية والكتالوج.`,
    restoredToast: 'تمت استعادة الخدمة.',
  },
  advertisement: {
    title: 'تأكيد حذف الإعلان',
    impact: 'الحذف هنا حذف مرن: يختفي الإعلان من الموقع العام والتطبيق فوراً، ويبقى محفوظاً للتدقيق ويمكن استعادته لاحقاً.',
    confirmLabel: 'تأكيد الحذف',
    deletedToast: 'تم حذف الإعلان.',
    restoreTitle: 'استعادة الإعلان',
    restoreMessage: (name) => `ستتم استعادة الإعلان «${name}» وإعادته إلى قائمة الإعلانات.`,
    restoredToast: 'تمت استعادة الإعلان.',
  },
  user: {
    title: 'تأكيد تعطيل المستخدم',
    impact: 'سيتم تعطيل الحساب وإخفاؤه من القوائم النشطة ولن يتمكن صاحبه من تسجيل الدخول، مع الإبقاء على طلباته وسجل التدقيق. يمكن استعادة الحساب لاحقاً.',
    confirmLabel: 'نعم، عطّل الحساب',
    deletedToast: 'تم تعطيل الحساب.',
    restoreTitle: 'استعادة المستخدم',
    restoreMessage: (name) => `سيتم استعادة حساب «${name}» وإعادته إلى القوائم النشطة.`,
    restoredToast: 'تمت استعادة الحساب.',
  },
};
