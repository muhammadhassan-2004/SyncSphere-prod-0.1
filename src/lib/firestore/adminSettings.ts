import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/src/lib/firebase';
import { logAuditEvent } from './adminAuditLogs';

export interface PlatformOperationsSettings {
  commissionRatePercent: number;
  aiMatchingMinScore: number;
  maxFileUploadSizeMb: number;
  maintenanceMode: boolean;
  freelancerProMonthlyFee: number;
  clientEnterpriseMonthlyFee: number;
  enableSubscriptions: boolean;
  // Optional legacy fields for backward compatibility
  platformName?: string;
  supportEmail?: string;
  platformUrl?: string;
}

export interface EmailCommunicationSettings {
  smtpHost: string;
  smtpPort: number;
  senderEmail: string;
  notifyNewUsers: boolean;
  notifyDisputes: boolean;
  notifyInvoices: boolean;
}

export interface SecurityPolicySettings {
  passwordMinLength: number;
  requireEmailVerification: boolean;
  sessionExpiryDays: number;
}

// Generic get/set — one doc per settings section under platform_settings/{section}
async function getSection<T>(section: string, fallback: T): Promise<T> {
  try {
    const snap = await getDoc(doc(db, 'platform_settings', section));
    return snap.exists() ? ({ ...fallback, ...snap.data() } as T) : fallback;
  } catch (err) {
    console.warn(`Failed to fetch section ${section}:`, err);
    return fallback;
  }
}

async function setSection<T extends object>(section: string, data: T, adminUid: string) {
  try {
    await setDoc(
      doc(db, 'platform_settings', section),
      { ...data, updatedAt: Timestamp.now(), updatedBy: adminUid },
      { merge: true }
    );
    await logAuditEvent({
      userId: adminUid,
      action: `UPDATE_SETTINGS_${section.toUpperCase()}`,
      module: 'Admin Settings',
      targetId: section,
      result: 'success',
    });
  } catch (err) {
    console.error(`Failed to set section ${section}:`, err);
    throw err;
  }
}

const DEFAULTS = {
  operations: {
    commissionRatePercent: 5,
    aiMatchingMinScore: 70,
    maxFileUploadSizeMb: 25,
    maintenanceMode: false,
    freelancerProMonthlyFee: 29,
    clientEnterpriseMonthlyFee: 199,
    enableSubscriptions: true,
  } as PlatformOperationsSettings,
  email: {
    smtpHost: 'smtp.gmail.com',
    smtpPort: 465,
    senderEmail: 'team@pixelgenesys.com',
    notifyNewUsers: true,
    notifyDisputes: true,
    notifyInvoices: true,
  } as EmailCommunicationSettings,
  security: {
    passwordMinLength: 8,
    requireEmailVerification: true,
    sessionExpiryDays: 30,
  } as SecurityPolicySettings,
};

// Standardized 3 Persistent Settings Sections
export const getPlatformOperationsSettings = () => getSection('operations', DEFAULTS.operations);
export const setPlatformOperationsSettings = (d: PlatformOperationsSettings, uid: string) => setSection('operations', d, uid);

export const getEmailCommunicationSettings = () => getSection('email', DEFAULTS.email);
export const setEmailCommunicationSettings = (d: EmailCommunicationSettings, uid: string) => setSection('email', d, uid);

export const getSecurityPolicySettings = () => getSection('security', DEFAULTS.security);
export const setSecurityPolicySettings = (d: SecurityPolicySettings, uid: string) => setSection('security', d, uid);

// Backward-compatibility shims
export const getPlatformConfigSettings = async () => {
  const ops = await getPlatformOperationsSettings();
  return {
    maxFileUploadSizeMb: ops.maxFileUploadSizeMb,
    aiMatchingMinScore: ops.aiMatchingMinScore,
    commissionRatePercent: ops.commissionRatePercent,
    apiRateLimitPerMin: 120,
  };
};

