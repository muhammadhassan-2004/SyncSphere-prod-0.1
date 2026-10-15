import { initializeApp } from 'firebase/app';
import { getAuth, setPersistence, indexedDBLocalPersistence, browserLocalPersistence } from 'firebase/auth';
import { initializeFirestore, doc, getDocFromServer } from 'firebase/firestore';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { uploadFileToCloudinary } from './storage/cloudinary';
import firebaseConfig from '../../firebase-applet-config.json';

export const app = initializeApp(firebaseConfig);

// Initialize Firestore with auto-detect long polling and ignoreUndefinedProperties to prevent crashes
export const db = initializeFirestore(app, {
  ignoreUndefinedProperties: true,
  experimentalAutoDetectLongPolling: true,
});
export const auth = getAuth(app);

// Enforce robust persistent session storage using IndexedDB with LocalStorage fallback
setPersistence(auth, indexedDBLocalPersistence).catch(() => {
  setPersistence(auth, browserLocalPersistence).catch((err) => {
    console.warn('Failed to set Auth persistence:', err);
  });
});

export const storage = getStorage(app);

export function compressAndResizeImage(file: File, targetSize = 512, quality = 0.95): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = targetSize;
        canvas.height = targetSize;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';

          // Center-crop to 1:1 aspect ratio to avoid aspect-ratio skewing / distortion
          const minDim = Math.min(img.width, img.height);
          const srcX = (img.width - minDim) / 2;
          const srcY = (img.height - minDim) / 2;

          // If original is JPEG, fill background with white or clear
          if (file.type !== 'image/png') {
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, targetSize, targetSize);
          }

          ctx.drawImage(img, srcX, srcY, minDim, minDim, 0, 0, targetSize, targetSize);

          const isPng = file.type === 'image/png';
          const dataUrl = isPng ? canvas.toDataURL('image/png') : canvas.toDataURL('image/jpeg', quality);
          resolve(dataUrl);
        } else {
          resolve((event.target?.result as string) || '');
        }
      };
      img.onerror = () => {
        resolve((event.target?.result as string) || '');
      };
      img.src = (event.target?.result as string) || '';
    };
    reader.onerror = () => {
      resolve('');
    };
    reader.readAsDataURL(file);
  });
}

export async function uploadAvatarFile(uid: string, file: File): Promise<string> {
  const compressedDataUrl = await compressAndResizeImage(file, 512, 0.95);

  try {
    const cleanFileName = file.name ? file.name.replace(/[^a-zA-Z0-9._-]/g, '_') : 'avatar.jpg';
    const fileName = `avatar_${Date.now()}_${cleanFileName}`;

    const res = await uploadFileToCloudinary(file, {
      folder: `syncsphere/avatars/${uid}`,
      fileName,
    });

    if (res.success && res.url) {
      return res.url;
    }
    return compressedDataUrl || '';
  } catch (err) {
    console.warn('Avatar upload fallback to compressed Data URL:', err);
    return compressedDataUrl || '';
  }
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map((provider) => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export async function testFirestoreConnection() {
  try {
    await getDocFromServer(doc(db, '_connection_test_', 'ping'));
  } catch (error) {
    // Gracefully ignore or log connection test failures to avoid noisy startup errors
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firestore is running in offline mode.');
    }
  }
}

