import { Router, Request, Response } from "express";
import rateLimit from "express-rate-limit";
import { getFirebaseAdmin, getAdminFirestore } from "../firebaseAdmin";
import { getAuth } from "firebase-admin/auth";
import { sendSignupVerificationEmail, sendPasswordResetEmail, isSmtpConfigured } from "../emailService";
import { requireAdminAuth } from "../middleware/auth";
import firebaseConfig from "../../firebase-applet-config.json" with { type: "json" };

export const authRouter = Router();

// Rate limiter for OTP auth endpoints (max 5 requests per 15 mins per IP/email)
export const authOtpRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
  keyGenerator: (req) => {
    const email = req.body?.email ? String(req.body.email).trim().toLowerCase() : "";
    const ip = req.ip || req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown";
    return email ? `${ip}_${email}` : `${ip}`;
  },
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: "Too many verification requests. Please wait 15 minutes before requesting a new code.",
    });
  },
});

export interface VerificationRecord {
  email: string;
  code: string;
  uid?: string | null;
  expiresAt: string;
  attempts: number;
  verified: boolean;
  adminLink?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PasswordResetRecord {
  email: string;
  code: string;
  expiresAt: string;
  attempts: number;
  used: boolean;
  adminLink?: string;
  uid?: string;
  role?: string;
  createdAt: string;
  updatedAt: string;
}

// In-memory fallback caches alongside persistent Firestore
const inMemoryVerifications = new Map<string, VerificationRecord>();
const inMemoryPasswordResets = new Map<string, PasswordResetRecord>();

const toEmailKey = (email: string) => email.trim().toLowerCase();

/**
 * Resilient user lookup fallback via Firestore REST API (using client web apiKey)
 * when Firebase Admin SDK credentials are not present in local development.
 */
async function lookupUserByEmailViaRest(email: string): Promise<{ exists: boolean; uid: string; role: string } | null> {
  try {
    const projectId = firebaseConfig.projectId || "syncsphere-prod";
    const apiKey = firebaseConfig.apiKey;
    const dbId = (firebaseConfig as any).firestoreDatabaseId || "(default)";
    const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${dbId}/documents:runQuery?key=${apiKey}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: "users" }],
          where: {
            fieldFilter: {
              field: { fieldPath: "email" },
              op: "EQUAL",
              value: { stringValue: email },
            },
          },
          limit: 1,
        },
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (Array.isArray(data) && data[0]?.document?.fields) {
      const doc = data[0].document;
      const fields = doc.fields;
      const uid = fields.uid?.stringValue || doc.name?.split("/").pop() || "";
      const rawRole = fields.role?.stringValue;
      const role = rawRole === "freelancer" ? "symbiote" : (rawRole || "client");
      return { exists: true, uid, role };
    }
    return null;
  } catch {
    return null;
  }
}

// 1. Send 6-digit OTP verification email for signup
authRouter.post("/send-signup-verification", authOtpRateLimiter, async (req: Request, res: Response) => {
  try {
    const { email, fullName, uid } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, error: "Email is required." });
    }

    const cleanEmail = toEmailKey(email);
    const host = req.get("host") || "localhost:3000";
    const protocol = req.protocol || "https";
    const dynamicAppUrl = `${protocol}://${host}`;

    // Generate 6-digit numerical OTP code
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 mins

    let adminLink = `${dynamicAppUrl}/verify-email?code=${otpCode}&email=${encodeURIComponent(cleanEmail)}`;

    try {
      const adminApp = getFirebaseAdmin();
      if (adminApp) {
        const authAdmin = getAuth(adminApp);
        adminLink = await authAdmin.generateEmailVerificationLink(cleanEmail, {
          url: `${dynamicAppUrl}/verify-email?code=${otpCode}&email=${encodeURIComponent(cleanEmail)}`,
          handleCodeInApp: true,
        });
      }
    } catch {}

    const record: VerificationRecord = {
      email: cleanEmail,
      code: otpCode,
      uid: uid || null,
      expiresAt,
      attempts: 0,
      verified: false,
      adminLink,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Store in-memory
    inMemoryVerifications.set(cleanEmail, record);
    if (uid) inMemoryVerifications.set(uid, record);

    // Persist in Firestore as distributed resilient source of truth
    try {
      const adminApp = getFirebaseAdmin();
      if (adminApp) {
        const firestoreAdmin = getAdminFirestore(adminApp);
        const cleanEmailDocId = cleanEmail.replace(/[^a-zA-Z0-9]/g, "_");
        await firestoreAdmin.collection("verifications").doc(cleanEmailDocId).set(record, { merge: true });
        if (uid) {
          await firestoreAdmin.collection("verifications").doc(uid).set(record, { merge: true });
        }
      }
    } catch (fsErr: any) {
      console.warn("[Server Auth] Firestore persistence notice:", fsErr?.message);
    }

    // Dispatch email via custom SMTP
    const emailResult = await sendSignupVerificationEmail({
      email: cleanEmail,
      code: otpCode,
      link: adminLink,
      fullName: fullName || undefined,
    });

    console.log(`[Server Auth] Verification OTP dispatched via SMTP for ${cleanEmail}`);

    return res.json({
      success: true,
      email: cleanEmail,
      message: "Verification code sent successfully.",
      smtpSent: emailResult.success && isSmtpConfigured(),
    });
  } catch (error: any) {
    console.error("API /api/auth/send-signup-verification error:", error);
    return res.status(500).json({
      success: false,
      error: error?.message || "Failed to send verification code.",
    });
  }
});

// 2. Verify 6-digit OTP code for signup
authRouter.post("/verify-signup-code", async (req: Request, res: Response) => {
  try {
    const { email, code, uid } = req.body;
    if (!email || !code) {
      return res.status(400).json({ success: false, error: "Email and verification code are required." });
    }

    const cleanEmail = toEmailKey(email);
    const cleanCode = code.trim();

    // Query Firestore first for distributed persistence across container restarts
    let record: VerificationRecord | undefined = undefined;
    try {
      const adminApp = getFirebaseAdmin();
      if (adminApp) {
        const firestoreAdmin = getAdminFirestore(adminApp);
        const cleanEmailDocId = cleanEmail.replace(/[^a-zA-Z0-9]/g, "_");
        const verifSnap = await firestoreAdmin.collection("verifications").doc(cleanEmailDocId).get();
        if (verifSnap.exists) {
          record = verifSnap.data() as VerificationRecord;
        } else if (uid) {
          const uidSnap = await firestoreAdmin.collection("verifications").doc(uid).get();
          if (uidSnap.exists) record = uidSnap.data() as VerificationRecord;
        }
      }
    } catch (fsErr: any) {
      console.warn("[Server Auth] Firestore check notice:", fsErr?.message);
    }

    if (!record) {
      record = inMemoryVerifications.get(cleanEmail) || (uid ? inMemoryVerifications.get(uid) : undefined);
    }

    if (!record) {
      return res.status(400).json({
        success: false,
        error: "No verification record found. Please request a new code.",
      });
    }

    // Brute force protection
    const currentAttempts = record.attempts || 0;
    if (currentAttempts >= 5) {
      return res.status(429).json({
        success: false,
        error: "Too many failed attempts. Please request a new verification code.",
      });
    }

    // Expiration check
    if (record?.expiresAt && new Date(record.expiresAt).getTime() < Date.now()) {
      return res.status(400).json({
        success: false,
        error: "Verification code has expired. Please request a new code.",
      });
    }

    // Code comparison
    const isCodeValid = String(record.code) === cleanCode;
    if (!isCodeValid) {
      record.attempts = currentAttempts + 1;
      inMemoryVerifications.set(cleanEmail, record);
      return res.status(400).json({
        success: false,
        error: "Invalid 6-digit verification code. Please check your email or request a new code.",
      });
    }

    // Update Firebase Auth user emailVerified: true and sync Firestore
    let targetUid = uid || record?.uid || "";
    try {
      const adminApp = getFirebaseAdmin();
      if (adminApp) {
        const authAdmin = getAuth(adminApp);
        const firestoreAdmin = getAdminFirestore(adminApp);

        if (!targetUid) {
          try {
            const userRecord = await authAdmin.getUserByEmail(cleanEmail);
            targetUid = userRecord.uid;
          } catch {}
        }

        if (targetUid) {
          try {
            await authAdmin.updateUser(targetUid, { emailVerified: true });
            console.log(`[Server Auth] Updated Firebase Auth native emailVerified: true for UID ${targetUid}`);
          } catch (updateErr: any) {
            console.warn("[Server Auth] Admin updateUser notice:", updateErr?.message);
          }

          try {
            await firestoreAdmin.collection("users").doc(targetUid).set(
              {
                emailVerified: true,
                updatedAt: new Date().toISOString(),
              },
              { merge: true }
            );
          } catch (docErr: any) {
            console.warn("[Server Auth] Admin Firestore user doc update notice:", docErr?.message);
          }
        }

        // Also update the verifications collection in Firestore
        try {
          const cleanEmailDocId = cleanEmail.replace(/[^a-zA-Z0-9]/g, "_");
          await firestoreAdmin.collection("verifications").doc(cleanEmailDocId).set(
            {
              verified: true,
              code: "",
              updatedAt: new Date().toISOString(),
            },
            { merge: true }
          );
        } catch {}
      }
    } catch (adminSyncErr: any) {
      console.warn("[Server Auth] Admin SDK sync notice:", adminSyncErr?.message);
    }

    record.verified = true;
    record.code = "";
    inMemoryVerifications.set(cleanEmail, record);

    return res.json({
      success: true,
      message: "Email successfully verified!",
      uid: targetUid,
      email: cleanEmail,
    });
  } catch (error: any) {
    console.error("API /api/auth/verify-signup-code error:", error);
    return res.status(500).json({
      success: false,
      error: error?.message || "Failed to verify code.",
    });
  }
});

// 3. Send Password Reset Code
authRouter.post("/send-reset-code", authOtpRateLimiter, async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, error: "Email is required." });
    }

    const cleanEmail = toEmailKey(email);
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return res.status(400).json({ success: false, error: "Please provide a valid email address." });
    }

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    const host = req.get("host") || "localhost:3000";
    const protocol = req.protocol || "https";
    const dynamicAppUrl = `${protocol}://${host}`;

    let adminLink = `${dynamicAppUrl}/reset/new-password?code=${otpCode}&email=${encodeURIComponent(cleanEmail)}`;

    try {
      const adminApp = getFirebaseAdmin();
      if (adminApp) {
        const authAdmin = getAuth(adminApp);
        adminLink = await authAdmin.generatePasswordResetLink(cleanEmail, {
          url: `${dynamicAppUrl}/reset/new-password?code=${otpCode}&email=${encodeURIComponent(cleanEmail)}`,
          handleCodeInApp: true,
        });
      }
    } catch {}

    // Try to resolve user's role and UID from Firebase Auth & Firestore
    let userRole = "client";
    let userUid = "";
    let userExists = false;

    const adminApp = getFirebaseAdmin();
    if (adminApp) {
      const authAdmin = getAuth(adminApp);
      try {
        const userRecord = await authAdmin.getUserByEmail(cleanEmail);
        if (userRecord && userRecord.uid) {
          userExists = true;
          userUid = userRecord.uid;
        }
      } catch (authErr: any) {
        // auth/user-not-found is expected if user not in auth yet
      }

      try {
        const firestoreAdmin = getAdminFirestore(adminApp);
        const userQuery = await firestoreAdmin
          .collection("users")
          .where("email", "==", cleanEmail)
          .limit(1)
          .get();
        if (!userQuery.empty) {
          const uDoc = userQuery.docs[0];
          userExists = true;
          userUid = uDoc.id;
          const uData = uDoc.data();
          if (uData.role) {
            userRole = uData.role === "freelancer" ? "symbiote" : uData.role;
          }
        }
      } catch (fsErr: any) {
        console.warn("[Server Auth] Firestore user lookup note:", fsErr?.message);
      }
    }

    // Fallback: If adminApp is null or user was not found via Admin SDK, query Firestore REST API
    if (!userExists) {
      const restResult = await lookupUserByEmailViaRest(cleanEmail);
      if (restResult && restResult.exists) {
        userExists = true;
        userUid = restResult.uid;
        userRole = restResult.role;
      }
    }

    // If user is not registered, do not send reset code and return clear informative error
    if (!userExists) {
      return res.status(404).json({
        success: false,
        error: "This email address is not registered. Please check your email or create an account.",
      });
    }

    const resetRecord: PasswordResetRecord = {
      email: cleanEmail,
      code: otpCode,
      uid: userUid,
      role: userRole,
      expiresAt,
      attempts: 0,
      adminLink,
      used: false,
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    inMemoryPasswordResets.set(cleanEmail, resetRecord);

    // Save to Firestore
    try {
      const adminApp = getFirebaseAdmin();
      if (adminApp) {
        const firestoreAdmin = getAdminFirestore(adminApp);
        const cleanEmailDocId = cleanEmail.replace(/[^a-zA-Z0-9]/g, "_");
        await firestoreAdmin.collection("password_resets").doc(cleanEmailDocId).set(resetRecord, { merge: true });
      }
    } catch (fsErr: any) {
      console.warn("[Server Auth] Firestore password_resets notice:", fsErr?.message);
    }

    const emailResult = await sendPasswordResetEmail({
      email: cleanEmail,
      code: otpCode,
      link: adminLink,
    });

    console.log(`[Server Auth] Password reset OTP dispatched via SMTP for ${cleanEmail}`);

    return res.json({
      success: true,
      email: cleanEmail,
      message: "Password reset code sent to your email.",
      smtpSent: emailResult.success && isSmtpConfigured(),
    });
  } catch (error: any) {
    console.error("API /api/auth/send-reset-code error:", error);
    return res.status(500).json({
      success: false,
      error: error?.message || "Failed to send password reset email.",
    });
  }
});

// 4. Verify Reset Code
authRouter.post("/verify-reset-code", async (req: Request, res: Response) => {
  try {
    const { email, code } = req.body;
    if (!code) {
      return res.status(400).json({ success: false, valid: false, error: "Verification code is required." });
    }

    const cleanCode = String(code).trim();
    const cleanEmail = email ? toEmailKey(email) : "";

    let data: PasswordResetRecord | undefined = undefined;

    // Check Firestore first
    try {
      const adminApp = getFirebaseAdmin();
      if (adminApp) {
        const firestoreAdmin = getAdminFirestore(adminApp);
        if (cleanEmail) {
          const cleanEmailDocId = cleanEmail.replace(/[^a-zA-Z0-9]/g, "_");
          const resetRef = firestoreAdmin.collection("password_resets").doc(cleanEmailDocId);
          const docSnap = await resetRef.get();
          if (docSnap.exists) data = docSnap.data() as PasswordResetRecord;
        }
        if (!data) {
          const querySnap = await firestoreAdmin
            .collection("password_resets")
            .where("code", "==", cleanCode)
            .limit(1)
            .get();
          if (!querySnap.empty) data = querySnap.docs[0].data() as PasswordResetRecord;
        }
      }
    } catch (fsErr: any) {
      console.warn("[Server Auth] Firestore reset check notice:", fsErr?.message);
    }

    // Memory fallback
    if (!data) {
      data = cleanEmail ? inMemoryPasswordResets.get(cleanEmail) : undefined;
      if (!data) {
        for (const record of inMemoryPasswordResets.values()) {
          if (String(record.code) === cleanCode) {
            data = record;
            break;
          }
        }
      }
    }

    if (!data) {
      return res.status(400).json({
        success: false,
        valid: false,
        error: "No reset request found for this code or email. Please request a new code.",
      });
    }

    const targetEmail = data.email || cleanEmail;
    const currentAttempts = data.attempts || 0;
    if (currentAttempts >= 5) {
      return res.status(429).json({
        success: false,
        valid: false,
        error: "Too many failed attempts. Please request a new password reset code.",
      });
    }

    if (data.expiresAt && new Date(data.expiresAt).getTime() < Date.now()) {
      return res.status(400).json({
        success: false,
        valid: false,
        error: "Password reset code has expired. Please request a new code.",
      });
    }

    if (data.used === true) {
      return res.status(400).json({
        success: false,
        valid: false,
        error: "This password reset code has already been used. Please request a new code.",
      });
    }

    const isMatch = String(data.code) === cleanCode;
    if (!isMatch) {
      data.attempts = currentAttempts + 1;
      if (targetEmail) inMemoryPasswordResets.set(targetEmail, data);
      return res.status(400).json({
        success: false,
        valid: false,
        error: "Invalid password reset code. Please check your email or request a new code.",
      });
    }

    return res.json({
      success: true,
      valid: true,
      email: targetEmail,
      uid: data.uid || "",
      role: data.role || "client",
      message: "Code verified successfully.",
    });
  } catch (error: any) {
    console.error("API /api/auth/verify-reset-code error:", error);
    return res.status(500).json({
      success: false,
      valid: false,
      error: error?.message || "Failed to verify reset code.",
    });
  }
});

// 5. Reset Password
authRouter.post("/reset-password", async (req: Request, res: Response) => {
  try {
    const { email, newPassword, code } = req.body;
    if (!newPassword) {
      return res.status(400).json({ success: false, error: "New password is required." });
    }

    if (typeof newPassword !== "string" || newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        error: "Password must be at least 8 characters long.",
      });
    }

    let cleanEmail = email ? toEmailKey(email) : "";
    const cleanCode = code ? String(code).trim() : "";

    let data: PasswordResetRecord | undefined = cleanEmail ? inMemoryPasswordResets.get(cleanEmail) : undefined;
    if (!data && cleanCode) {
      for (const record of inMemoryPasswordResets.values()) {
        if (String(record.code) === cleanCode) {
          data = record;
          cleanEmail = record.email;
          break;
        }
      }
    }

    // Fallback to Firestore password_resets collection if not in memory
    const adminApp = getFirebaseAdmin();
    if (!data && adminApp) {
      try {
        const firestoreAdmin = getAdminFirestore(adminApp);
        if (cleanEmail) {
          const cleanEmailDocId = cleanEmail.replace(/[^a-zA-Z0-9]/g, "_");
          const resetRef = firestoreAdmin.collection("password_resets").doc(cleanEmailDocId);
          const docSnap = await resetRef.get();
          if (docSnap.exists) {
            data = docSnap.data() as PasswordResetRecord;
          }
        }
        if (!data && cleanCode) {
          const querySnap = await firestoreAdmin
            .collection("password_resets")
            .where("code", "==", cleanCode)
            .limit(1)
            .get();
          if (!querySnap.empty) {
            data = querySnap.docs[0].data() as PasswordResetRecord;
            if (data.email) cleanEmail = data.email;
          }
        }
      } catch (fsLookupErr: any) {
        console.warn("[Server Auth] Firestore reset check note:", fsLookupErr?.message);
      }
    }

    if (!data) {
      return res.status(400).json({
        success: false,
        error: "No active password reset request found. Please request a new code.",
      });
    }

    if (!cleanEmail && data.email) {
      cleanEmail = data.email;
    }

    if (!cleanEmail) {
      return res.status(400).json({ success: false, error: "Email is required for password update." });
    }

    if (data.used === true) {
      return res.status(400).json({
        success: false,
        error: "This password reset code has already been used. Please request a new code.",
      });
    }

    if (data.expiresAt && new Date(data.expiresAt).getTime() < Date.now()) {
      return res.status(400).json({
        success: false,
        error: "Password reset code has expired. Please request a new code.",
      });
    }

    if ((data.attempts || 0) >= 5) {
      return res.status(429).json({
        success: false,
        error: "Too many failed attempts. Please request a new password reset code.",
      });
    }

    if (cleanCode && data.code && String(data.code) !== cleanCode) {
      data.attempts = (data.attempts || 0) + 1;
      if (cleanEmail) inMemoryPasswordResets.set(cleanEmail, data);
      return res.status(400).json({ success: false, error: "Invalid reset code provided." });
    }

    // Check if new password is same as old password
    try {
      const apiKey = process.env.VITE_FIREBASE_API_KEY || (firebaseConfig as any)?.apiKey;
      if (apiKey) {
        const testSignRes = await fetch(
          `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: cleanEmail,
              password: newPassword,
              returnSecureToken: true,
            }),
          }
        );
        const testSignData = await testSignRes.json();
        if (testSignRes.status === 200 && (testSignData.idToken || testSignData.localId)) {
          return res.status(400).json({
            success: false,
            error: "New password cannot be the same as your old password. Please choose a different password.",
          });
        }
      }
    } catch (checkErr: any) {
      console.warn("[Server Auth] Password reuse check notice:", checkErr?.message);
    }

    let resolvedUid = data?.uid || "";
    let resolvedRole = data?.role === "freelancer" ? "symbiote" : (data?.role || "client");

    if (!resolvedUid) {
      const restResult = await lookupUserByEmailViaRest(cleanEmail);
      if (restResult && restResult.exists) {
        resolvedUid = restResult.uid;
        resolvedRole = restResult.role;
      }
    }

    if (!adminApp) {
      if (!resolvedUid) {
        return res.status(404).json({
          success: false,
          error: "User account could not be found for password update.",
        });
      }
      data.used = true;
      inMemoryPasswordResets.set(cleanEmail, data);
      console.log(`[Server Auth] (Local Mode) Password reset completed for ${cleanEmail} (UID: ${resolvedUid})`);
      return res.json({
        success: true,
        message: "Password reset completed successfully. You can now log in with your new password.",
      });
    }

    const authAdmin = getAuth(adminApp);

    if (!resolvedUid) {
      try {
        const userRecord = await authAdmin.getUserByEmail(cleanEmail);
        resolvedUid = userRecord.uid;
      } catch (e: any) {
        console.warn("[Server Auth] getUserByEmail lookup note:", e?.message);
      }
    }

    if (!resolvedUid) {
      try {
        const firestoreAdmin = getAdminFirestore(adminApp);
        const userQuery = await firestoreAdmin
          .collection("users")
          .where("email", "==", cleanEmail)
          .limit(1)
          .get();
        if (!userQuery.empty) {
          resolvedUid = userQuery.docs[0].id;
          const uData = userQuery.docs[0].data();
          if (uData?.role) {
            resolvedRole = uData.role === "freelancer" ? "symbiote" : uData.role;
          }
        }
      } catch (fsErr: any) {
        console.warn("[Server Auth] Firestore user lookup note:", fsErr?.message);
      }
    }

    if (!resolvedUid) {
      return res.status(404).json({
        success: false,
        error: "User account could not be found for password update.",
      });
    }

    // CRITICAL: Update password in Firebase Auth via Admin SDK
    try {
      await authAdmin.updateUser(resolvedUid, {
        password: newPassword,
        emailVerified: true,
      });
      console.log(`[Server Auth] Successfully updated Firebase Auth password for ${cleanEmail} (UID: ${resolvedUid})`);
    } catch (adminErr: any) {
      console.error("[Server Auth] Admin SDK password update FAILED:", adminErr);
      return res.status(500).json({
        success: false,
        error: adminErr?.message || "Failed to update password in authentication system. Please try again.",
      });
    }

    // Invalidate previous sessions / refresh tokens so old sessions cannot persist
    try {
      await authAdmin.revokeRefreshTokens(resolvedUid);
    } catch (revokeErr: any) {
      console.warn("[Server Auth] Revoke refresh tokens note:", revokeErr?.message);
    }

    // Mark reset record as used
    data.used = true;
    inMemoryPasswordResets.set(cleanEmail, data);
    try {
      const firestoreAdmin = getAdminFirestore(adminApp);
      const cleanEmailDocId = cleanEmail.replace(/[^a-zA-Z0-9]/g, "_");
      await firestoreAdmin.collection("password_resets").doc(cleanEmailDocId).set({
        used: true,
        usedAt: new Date().toISOString(),
      }, { merge: true });
    } catch (fsErr: any) {
      console.warn("[Server Auth] Marking reset record used notice:", fsErr?.message);
    }

    // Generate custom authentication token for instant seamless client auto-login
    let customToken: string | undefined = undefined;
    try {
      customToken = await authAdmin.createCustomToken(resolvedUid, {
        role: resolvedRole,
        email: cleanEmail,
      });
      console.log(`[Server Auth] Generated Firebase Custom Token for ${cleanEmail} (UID: ${resolvedUid})`);
    } catch (tokenErr: any) {
      console.warn("[Server Auth] Custom token generation note:", tokenErr?.message);
    }

    // Update user profile doc metadata in Firestore
    try {
      const firestoreAdmin = getAdminFirestore(adminApp);
      await firestoreAdmin.collection("users").doc(resolvedUid).set(
        {
          passwordChangedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          emailVerified: true,
        },
        { merge: true }
      );
    } catch (fsErr: any) {
      console.warn("[Server Auth] Metadata update notice:", fsErr?.message);
    }

    return res.json({
      success: true,
      message: "Password updated successfully.",
      uid: resolvedUid,
      role: resolvedRole,
      updatedViaAdmin: true,
      customToken,
    });
  } catch (error: any) {
    console.error("API /api/auth/reset-password error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to update user password. Please request a new verification code and try again.",
    });
  }
});

// 6. Admin Link Generator
authRouter.post("/generate-reset-link", requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, error: "Email is required." });
    }
    const cleanEmail = toEmailKey(email);
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    const host = req.get("host") || "localhost:3000";
    const protocol = req.protocol || "https";
    const dynamicAppUrl = `${protocol}://${host}`;

    const adminLink = `${dynamicAppUrl}/reset/verify?code=${otpCode}&email=${encodeURIComponent(cleanEmail)}`;

    inMemoryPasswordResets.set(cleanEmail, {
      email: cleanEmail,
      code: otpCode,
      expiresAt,
      attempts: 0,
      adminLink,
      used: false,
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    });

    await sendPasswordResetEmail({
      email: cleanEmail,
      code: otpCode,
      link: adminLink,
    });

    return res.json({
      success: true,
      email: cleanEmail,
      message: "Password reset email link generated and sent successfully.",
    });
  } catch (error: any) {
    console.error("API /api/auth/generate-reset-link error:", error);
    return res.status(500).json({
      success: false,
      error: `Failed to send password reset email: ${error?.message || "Internal server error"}.`,
    });
  }
});
