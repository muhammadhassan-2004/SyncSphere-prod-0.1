/**
 * Presence utility for calculating actual live/runtime presence status
 * based on user session heartbeat, lastActiveAt, and isOnline flags.
 */

export type PresenceStatus = 'online' | 'away' | 'offline';

export interface PresenceUser {
  uid?: string;
  isOnline?: boolean;
  lastActiveAt?: any;
  lastSeen?: any;
  updatedAt?: any;
  lastLoginAt?: any;
}

/**
 * Calculates genuine runtime user presence.
 * - Online: isOnline === true or active within the last 5 minutes
 * - Away: active between 5 and 30 minutes ago
 * - Offline: inactive for >30 minutes or no activity record (returns statusDot: undefined)
 */
export function getUserPresence(user?: PresenceUser | null): {
  status: PresenceStatus;
  statusDot: 'online' | 'away' | undefined;
  isOnline: boolean;
  label: string;
} {
  if (!user) {
    return { status: 'offline', statusDot: undefined, isOnline: false, label: 'Offline' };
  }

  // Parse raw activity date from explicit heartbeat / presence fields ONLY (NEVER use updatedAt)
  const rawDate = user.lastActiveAt || user.lastSeen || user.lastLoginAt;
  let date: Date | null = null;
  if (rawDate) {
    if (typeof rawDate.toDate === 'function') {
      date = rawDate.toDate();
    } else if (rawDate.seconds) {
      date = new Date(rawDate.seconds * 1000);
    } else if (typeof rawDate === 'string' || typeof rawDate === 'number') {
      date = new Date(rawDate);
    }
  }

  // Explicit logout or offline state - must never show green status dot
  if (user.isOnline === false) {
    if (!date || isNaN(date.getTime())) {
      return { status: 'offline', statusDot: undefined, isOnline: false, label: 'Offline' };
    }
    const diffMs = Math.max(0, Date.now() - date.getTime());
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 60) {
      return { status: 'offline', statusDot: undefined, isOnline: false, label: `Last seen ${diffMins}m ago` };
    }
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) {
      return { status: 'offline', statusDot: undefined, isOnline: false, label: `Last seen ${diffHours}h ago` };
    }
    const diffDays = Math.floor(diffHours / 24);
    return { status: 'offline', statusDot: undefined, isOnline: false, label: `Last seen ${diffDays}d ago` };
  }

  // Explicit online boolean check: must also be fresh within 15 minutes if date is present
  if (user.isOnline === true) {
    if (date && !isNaN(date.getTime())) {
      const diffMs = Date.now() - date.getTime();
      if (diffMs > 15 * 60 * 1000) {
        // Stale session (browser was closed without logout)
        return { status: 'offline', statusDot: undefined, isOnline: false, label: 'Offline' };
      }
      if (diffMs > 5 * 60 * 1000) {
        const mins = Math.max(1, Math.floor(diffMs / 60000));
        return { status: 'away', statusDot: 'away', isOnline: false, label: `Active ${mins}m ago` };
      }
    }
    return { status: 'online', statusDot: 'online', isOnline: true, label: 'Active now' };
  }

  // If isOnline is undefined (not logged in or dummy profile):
  if (!date || isNaN(date.getTime())) {
    return { status: 'offline', statusDot: undefined, isOnline: false, label: 'Offline' };
  }

  const diffMs = Date.now() - date.getTime();
  // Active within 3 minutes strictly
  if (diffMs >= 0 && diffMs < 3 * 60 * 1000) {
    return { status: 'online', statusDot: 'online', isOnline: true, label: 'Active now' };
  }

  if (diffMs < 30 * 60 * 1000) {
    const mins = Math.max(1, Math.floor(diffMs / 60000));
    return { status: 'away', statusDot: 'away', isOnline: false, label: `Active ${mins}m ago` };
  }

  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 60) {
    return { status: 'offline', statusDot: undefined, isOnline: false, label: `Last seen ${diffMins}m ago` };
  }
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) {
    return { status: 'offline', statusDot: undefined, isOnline: false, label: `Last seen ${diffHours}h ago` };
  }
  const diffDays = Math.floor(diffHours / 24);
  return { status: 'offline', statusDot: undefined, isOnline: false, label: `Last seen ${diffDays}d ago` };
}

/**
 * Returns Avatar statusDot:
 * - 'online' if active now (< 5m)
 * - 'away' if active recently (< 30m)
 * - undefined if offline/inactive (avoids false-positive green live dots)
 */
export function getUserStatusDot(user?: PresenceUser | null): 'online' | 'away' | undefined {
  return getUserPresence(user).statusDot;
}
