/** Admin "Mark Inactive" stores status as `suspended` (also accept disabled/inactive). */
export const INACTIVE_ACCOUNT_MESSAGE =
  'Your account has been marked inactive by an administrator. You cannot access the platform. Please contact support if you believe this is a mistake.';

export const INACTIVE_ACCOUNT_FLAG_KEY = 'syncsphere_inactive_account';

export function isUserAccountInactive(status?: string | null): boolean {
  if (!status) return false;
  const normalized = String(status).toLowerCase().trim();
  return normalized === 'suspended' || normalized === 'disabled' || normalized === 'inactive';
}

export function markInactiveAccountFlag(): void {
  try {
    sessionStorage.setItem(INACTIVE_ACCOUNT_FLAG_KEY, '1');
  } catch {
    // ignore storage errors
  }
}

export function consumeInactiveAccountFlag(): boolean {
  try {
    const flag = sessionStorage.getItem(INACTIVE_ACCOUNT_FLAG_KEY);
    if (flag) {
      sessionStorage.removeItem(INACTIVE_ACCOUNT_FLAG_KEY);
      return true;
    }
  } catch {
    // ignore
  }
  return false;
}
