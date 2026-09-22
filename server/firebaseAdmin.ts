import { initializeApp, getApps, App, cert } from "firebase-admin/app";
import { getFirestore, Firestore } from "firebase-admin/firestore";
import firebaseConfig from "../firebase-applet-config.json" with { type: "json" };
import fs from "fs";
import path from "path";

let adminApp: App | null = null;

export function getFirebaseAdmin(): App | null {
  if (adminApp) return adminApp;
  try {
    const existingApps = getApps();
    if (existingApps && existingApps.length > 0) {
      adminApp = existingApps[0]!;
      console.log("[Firebase Admin] Reusing existing app instance. Project ID:", adminApp.options.projectId);
      return adminApp;
    }

    const projectId = firebaseConfig.projectId || process.env.FIREBASE_PROJECT_ID || "syncsphere-prod";
    console.log("[Firebase Admin] Initializing Admin SDK for target projectId:", projectId);

    let credentialOption: any = undefined;

    // Load credentials from environment variable, service-account.json file, or ADC
    const rawSaEnv = process.env.FIREBASE_SERVICE_ACCOUNT || process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (rawSaEnv) {
      try {
        let parsed: any;
        if (typeof rawSaEnv === "string") {
          let trimmed = rawSaEnv.trim();
          // Check if Base64 encoded
          if (!trimmed.startsWith("{") && !trimmed.startsWith("[") && !trimmed.startsWith("-----BEGIN")) {
            try {
              const decoded = Buffer.from(trimmed, "base64").toString("utf-8");
              if (decoded.startsWith("{") || decoded.startsWith("-----BEGIN")) {
                trimmed = decoded.trim();
              }
            } catch {}
          }

          // Case 1: Raw PEM Private Key string provided
          if (trimmed.startsWith("-----BEGIN PRIVATE KEY-----") || trimmed.startsWith("-----BEGIN RSA PRIVATE KEY-----")) {
            const formattedKey = trimmed.replace(/\\n/g, "\n");
            parsed = {
              projectId: projectId,
              clientEmail: `firebase-adminsdk-fbsvc@${projectId}.iam.gserviceaccount.com`,
              privateKey: formattedKey,
            };
          } else {
            parsed = JSON.parse(trimmed);
          }
        } else {
          parsed = rawSaEnv;
        }

        if (parsed.private_key && parsed.private_key.includes("\\n")) {
          parsed.private_key = parsed.private_key.replace(/\\n/g, "\n");
        }
        credentialOption = cert(parsed);
        console.log("[Firebase Admin] Loaded service account credentials successfully.");
      } catch (e: any) {
        console.warn("[Firebase Admin] FIREBASE_SERVICE_ACCOUNT parsing note:", e?.message);
      }
    } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS && fs.existsSync(process.env.GOOGLE_APPLICATION_CREDENTIALS)) {
      try {
        const saFile = JSON.parse(fs.readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS, "utf-8"));
        if (saFile.private_key && saFile.private_key.includes("\\n")) {
          saFile.private_key = saFile.private_key.replace(/\\n/g, "\n");
        }
        credentialOption = cert(saFile);
        console.log("[Firebase Admin] Loaded service account from GOOGLE_APPLICATION_CREDENTIALS path:", process.env.GOOGLE_APPLICATION_CREDENTIALS);
      } catch (e: any) {
        console.warn("[Firebase Admin] GOOGLE_APPLICATION_CREDENTIALS file loading note:", e?.message);
      }
    } else {
      const defaultSaPath = path.join(process.cwd(), "service-account.json");
      if (fs.existsSync(defaultSaPath)) {
        try {
          const saFile = JSON.parse(fs.readFileSync(defaultSaPath, "utf-8"));
          if (saFile.private_key && saFile.private_key.includes("\\n")) {
            saFile.private_key = saFile.private_key.replace(/\\n/g, "\n");
          }
          credentialOption = cert(saFile);
          console.log("[Firebase Admin] Loaded service account from local service-account.json.");
        } catch (e: any) {
          console.warn("[Firebase Admin] Local service-account.json loading note:", e?.message);
        }
      }
    }

    if (!credentialOption) {
      const isGcp = Boolean(process.env.K_SERVICE || process.env.FUNCTION_NAME || process.env.GAE_SERVICE);
      if (!isGcp) {
        console.warn("[Firebase Admin] No explicit service account found in local environment. Admin SDK inactive; operations will safely use client/in-memory fallback.");
        return null;
      }
      console.warn("[Firebase Admin] No explicit service account found. Falling back to Application Default Credentials (ADC) in Google Cloud environment.");
    }

    const initOptions: any = {
      projectId: projectId,
    };
    if (credentialOption) {
      initOptions.credential = credentialOption;
    }

    adminApp = initializeApp(initOptions);

    console.log("[Firebase Admin] Successfully initialized. Options projectId:", adminApp.options.projectId);
    return adminApp;
  } catch (err: any) {
    console.error("[Firebase Admin] Initialization error:", err);
    return null;
  }
}

export function getAdminFirestore(app?: App): Firestore {
  const currentApp = app || getFirebaseAdmin();
  if (!currentApp) {
    throw new Error("Firebase Admin app not initialized");
  }
  return getFirestore(currentApp);
}


