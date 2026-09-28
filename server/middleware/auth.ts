import { Router, Request, Response, NextFunction } from "express";
import { getFirebaseAdmin, getAdminFirestore } from "../firebaseAdmin";
import { getAuth } from "firebase-admin/auth";

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        error: "Unauthorized: Missing or invalid Authorization Bearer header.",
      });
    }

    const token = authHeader.split("Bearer ")[1]?.trim();
    if (!token) {
      return res.status(401).json({
        success: false,
        error: "Unauthorized: Bearer token is empty.",
      });
    }

    const adminApp = getFirebaseAdmin();
    if (!adminApp) {
      // In local dev without service account, allow gracefully if mock token provided
      if (process.env.NODE_ENV !== "production" && token.startsWith("demo_")) {
        (req as any).user = { uid: token.replace("demo_", "") || "client-demo", role: "client" };
        return next();
      }
      return res.status(500).json({
        success: false,
        error: "Firebase Admin SDK not initialized.",
      });
    }

    const authAdmin = getAuth(adminApp);
    let decodedToken;
    try {
      decodedToken = await authAdmin.verifyIdToken(token);
    } catch (tokenErr: any) {
      console.warn("[Auth Middleware] ID Token verification failed:", tokenErr?.message);
      return res.status(401).json({
        success: false,
        error: "Unauthorized: Invalid or expired Firebase ID token.",
      });
    }

    (req as any).user = decodedToken;
    return next();
  } catch (err: any) {
    console.error("[Auth Middleware] Error:", err);
    return res.status(500).json({
      success: false,
      error: "Internal server error during authentication check.",
    });
  }
}

export async function requireAdminAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        error: "Unauthorized: Missing or invalid Authorization Bearer header.",
      });
    }

    const token = authHeader.split("Bearer ")[1]?.trim();
    if (!token) {
      return res.status(401).json({
        success: false,
        error: "Unauthorized: Bearer token is empty.",
      });
    }

    const adminApp = getFirebaseAdmin();
    if (!adminApp) {
      return res.status(500).json({
        success: false,
        error: "Firebase Admin SDK not initialized.",
      });
    }

    const authAdmin = getAuth(adminApp);
    const firestoreAdmin = getAdminFirestore(adminApp);

    // 1. Independently verify the Firebase ID Token
    let decodedToken;
    try {
      decodedToken = await authAdmin.verifyIdToken(token);
    } catch (tokenErr: any) {
      console.warn("[Admin Middleware] ID Token verification failed:", tokenErr?.message);
      return res.status(401).json({
        success: false,
        error: "Unauthorized: Invalid or expired Firebase ID token.",
      });
    }

    // 2. Independently verify the user record in Firestore has role === 'admin'
    const uid = decodedToken.uid;
    const userDocSnap = await firestoreAdmin.collection("users").doc(uid).get();

    if (!userDocSnap.exists) {
      return res.status(403).json({
        success: false,
        error: "Forbidden: User record not found.",
      });
    }

    const userData = userDocSnap.data();
    const userRole = userData?.role || decodedToken.role;

    if (userRole !== "admin") {
      console.warn(`[Admin Middleware] Access denied for UID ${uid} with role '${userRole}'`);
      return res.status(403).json({
        success: false,
        error: "Forbidden: Admin privileges required. Caller is not an administrator.",
      });
    }

    (req as any).user = decodedToken;
    (req as any).adminUser = userData;
    return next();
  } catch (err: any) {
    console.error("[Admin Middleware] Error:", err);
    return res.status(500).json({
      success: false,
      error: "Internal server error during authorization check.",
    });
  }
}
