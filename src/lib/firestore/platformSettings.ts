import {
  doc,
  getDoc,
  setDoc,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '@/src/lib/firebase';
import { PlatformSettings } from '@/src/types/firestore';

const SETTINGS_DOC_PATH = 'platform_settings/global';

const DEFAULT_SETTINGS: PlatformSettings = {
  general: {
    platformName: 'SyncSphere',
    supportEmail: 'support@syncsphere.io',
    maintenanceMode: false,
  },
  branding: {
    primaryColor: '#00E599',
  },
  security: {
    requireMfa: true,
    sessionTimeoutMinutes: 60,
  },
  notifications: {
    emailAlertsEnabled: true,
    systemAnnouncementsEnabled: true,
  },
  platformConfig: {
    platformFeePercentage: 10,
    maxFileUploadMB: 25,
  },
};

export async function getPlatformSettings(): Promise<PlatformSettings> {
  try {
    const docRef = doc(db, 'platform_settings', 'global');
    const snap = await getDoc(docRef);
    if (!snap.exists()) {
      return DEFAULT_SETTINGS;
    }
    return snap.data() as PlatformSettings;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, SETTINGS_DOC_PATH);
    return DEFAULT_SETTINGS;
  }
}

export async function updatePlatformSettings(settings: Partial<PlatformSettings>): Promise<void> {
  try {
    const docRef = doc(db, 'platform_settings', 'global');
    await setDoc(docRef, {
      ...settings,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, SETTINGS_DOC_PATH);
  }
}
