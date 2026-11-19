import { Router, Request, Response } from "express";
import { getFirebaseAdmin, getAdminFirestore } from "../firebaseAdmin";
import { getAuth } from "firebase-admin/auth";
import { isSmtpConfigured, getSmtpConfig, createTransporter } from "../emailService";
import { requireAdminAuth } from "../middleware/auth";

export const adminRouter = Router();

// 1. SMTP Status & Config Check
adminRouter.get("/smtp-status", requireAdminAuth, (req: Request, res: Response) => {
  const cfg = getSmtpConfig();
  res.json({
    configured: isSmtpConfigured(),
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    user: cfg.user ? `${cfg.user.slice(0, 3)}***@${cfg.user.split("@")[1] || ""}` : "",
    from: cfg.from,
    passwordConfigured: Boolean(cfg.pass),
  });
});

// 2. Test SMTP Connection
adminRouter.post("/test-smtp", requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const { to } = req.body;
    const recipient = to || (req as any).user?.email || process.env.SMTP_USER;
    if (!recipient) {
      return res.status(400).json({ success: false, error: "Recipient email address is required." });
    }
    const transporter = createTransporter();
    if (!transporter) {
      return res.status(400).json({ success: false, error: "SMTP is not configured." });
    }

    const cfg = getSmtpConfig();
    const info = await transporter.sendMail({
      from: cfg.from || cfg.user,
      to: recipient,
      subject: "SyncSphere SMTP Test Delivery",
      text: `SyncSphere SMTP configuration test successful! Delivered via ${cfg.host}:${cfg.port}.`,
      html: `
        <div style="font-family: sans-serif; padding: 20px; background: #0b0f19; color: #fff; border-radius: 8px;">
          <h2 style="color: #22d3ee;">SyncSphere SMTP Test Delivery</h2>
          <p>Your SMTP mail configuration is verified and fully operational.</p>
          <p style="color: #94a3b8; font-size: 12px;">Sent from: ${cfg.from} via ${cfg.host}:${cfg.port}</p>
        </div>
      `,
    });

    res.json({ success: true, messageId: info.messageId, recipient });
  } catch (error: any) {
    console.error("[SMTP Test Error]:", error);
    res.status(500).json({ success: false, error: error?.message || "Failed to send test email" });
  }
});

// 3. Admin Email Generation Diagnostic
adminRouter.post("/test-email", requireAdminAuth, async (req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    const { email, type = "reset" } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, error: "Test email address is required." });
    }
    const cleanEmail = email.trim().toLowerCase();
    const adminApp = getFirebaseAdmin();
    if (!adminApp) {
      return res.status(500).json({ 
        success: false, 
        error: "Firebase Admin SDK not initialized.",
        rawDiagnostics: { projectId: process.env.FIREBASE_PROJECT_ID || 'unknown' }
      });
    }

    const authAdmin = getAuth(adminApp);
    const host = req.get('host') || 'localhost:3000';
    const protocol = req.protocol || 'https';
    const appUrl = `${protocol}://${host}`;

    let adminLink = "";
    let generationError = null;

    try {
      if (type === "verification") {
        adminLink = await authAdmin.generateEmailVerificationLink(cleanEmail, {
          url: `${appUrl}/verify-email`,
          handleCodeInApp: true,
        });
      } else {
        adminLink = await authAdmin.generatePasswordResetLink(cleanEmail, {
          url: `${appUrl}/reset/verify`,
          handleCodeInApp: true,
        });
      }
    } catch (genErr: any) {
      generationError = {
        code: genErr?.code || 'unknown_error',
        message: genErr?.message || String(genErr),
        stack: genErr?.stack,
        status: genErr?.status,
        details: genErr?.details || genErr?.response?.data
      };
      
      if (genErr?.code === 'auth/user-not-found' || genErr?.message?.includes('user-not-found') || genErr?.message?.includes('No user record')) {
        try {
          const tempPassword = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2) + 'A1!';
          await authAdmin.createUser({
            email: cleanEmail,
            password: tempPassword,
            emailVerified: false,
          });
          if (type === "verification") {
            adminLink = await authAdmin.generateEmailVerificationLink(cleanEmail, {
              url: `${appUrl}/verify-email`,
              handleCodeInApp: true,
            });
          } else {
            adminLink = await authAdmin.generatePasswordResetLink(cleanEmail, {
              url: `${appUrl}/reset/verify`,
              handleCodeInApp: true,
            });
          }
          generationError = null;
        } catch (createErr: any) {
          generationError = {
            code: createErr?.code || 'user_creation_failed',
            message: createErr?.message || String(createErr),
            stack: createErr?.stack
          };
        }
      }
    }

    const durationMs = Date.now() - startTime;

    if (generationError) {
      const cleanErrMsg = generationError.message.includes("identitytoolkit.googleapis.com")
        ? "Identity Toolkit API check note: Ensure Google Cloud service account is provisioned for project syncsphere-prod."
        : generationError.message;
      return res.status(500).json({
        success: false,
        error: `Email generation test note: ${cleanErrMsg}`,
        durationMs,
        rawDiagnostics: {
          projectId: adminApp.options.projectId,
          targetEmail: cleanEmail,
          testType: type,
        }
      });
    }

    return res.json({
      success: true,
      message: `Successfully generated test email link for ${cleanEmail} via Firebase Admin SDK.`,
      durationMs,
      rawDiagnostics: {
        projectId: adminApp.options.projectId,
        targetEmail: cleanEmail,
        testType: type,
        linkGenerated: true,
        linkLength: adminLink.length,
        hasOobCode: adminLink.includes('oobCode='),
        domainUsed: appUrl,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error: any) {
    const durationMs = Date.now() - startTime;
    console.error("API /api/admin/test-email error:", error);
    return res.status(500).json({
      success: false,
      error: error?.message || "Internal server error during email test diagnostic",
      durationMs,
    });
  }
});

// 4. Admin Audit Logs (Admin SDK bypasses client Firestore rules)
adminRouter.get("/audit-logs", requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const adminApp = getFirebaseAdmin();
    if (!adminApp) {
      return res.status(500).json({ success: false, error: "Firebase Admin SDK not initialized." });
    }

    const firestoreAdmin = getAdminFirestore(adminApp);
    const moduleFilter = typeof req.query.module === "string" ? req.query.module.trim() : "";
    const resultFilter = typeof req.query.result === "string" ? req.query.result.trim() : "";
    const search = typeof req.query.search === "string" ? req.query.search.trim().toLowerCase() : "";
    const startDate = typeof req.query.startDate === "string" ? req.query.startDate : "";
    const endDate = typeof req.query.endDate === "string" ? req.query.endDate : "";
    const pageSize = Math.min(Math.max(parseInt(String(req.query.limit || "100"), 10) || 100, 1), 250);

    let snap;
    try {
      if (moduleFilter) {
        snap = await firestoreAdmin
          .collection("audit_logs")
          .where("module", "==", moduleFilter)
          .orderBy("timestamp", "desc")
          .limit(pageSize)
          .get();
      } else if (resultFilter) {
        snap = await firestoreAdmin
          .collection("audit_logs")
          .where("result", "==", resultFilter)
          .orderBy("timestamp", "desc")
          .limit(pageSize)
          .get();
      } else {
        snap = await firestoreAdmin
          .collection("audit_logs")
          .orderBy("timestamp", "desc")
          .limit(pageSize)
          .get();
      }
    } catch (queryErr) {
      console.warn("[Audit Logs] Constrained query failed, falling back to unfiltered fetch:", queryErr);
      snap = await firestoreAdmin.collection("audit_logs").limit(pageSize).get();
    }

    let rows = snap.docs.map((d) => {
      const data = d.data() || {};
      let timestampIso: string | null = null;
      const ts = data.timestamp;
      if (ts?.toDate) {
        timestampIso = ts.toDate().toISOString();
      } else if (typeof ts === "string") {
        timestampIso = ts;
      } else if (typeof ts === "number") {
        timestampIso = new Date(ts).toISOString();
      } else if (ts instanceof Date) {
        timestampIso = ts.toISOString();
      }

      const email = data.userEmail || data.actorEmail || "admin@syncsphere.com";
      const actorName =
        data.actorName || data.userName || (email ? String(email).split("@")[0] : "Platform Admin");

      return {
        id: d.id,
        userId: data.userId || "system",
        userEmail: email,
        actorName: String(actorName).charAt(0).toUpperCase() + String(actorName).slice(1),
        action: data.action || "SYSTEM_EVENT",
        module: data.module || "System",
        targetId: data.targetId || undefined,
        targetName: data.targetName || data.targetUserName || undefined,
        targetEmail: data.targetUserEmail || data.targetEmail || undefined,
        timestamp: timestampIso,
        result: data.result === "failure" ? "failure" : data.result === "warning" ? "warning" : "success",
        details: data.details || "",
        ipAddress: data.ipAddress || undefined,
      };
    });

    if (moduleFilter) {
      rows = rows.filter((r) => String(r.module).toLowerCase() === moduleFilter.toLowerCase());
    }
    if (resultFilter) {
      rows = rows.filter((r) => r.result === resultFilter);
    }
    if (startDate) {
      const startMs = new Date(startDate).getTime();
      rows = rows.filter((r) => r.timestamp && new Date(r.timestamp).getTime() >= startMs);
    }
    if (endDate) {
      const endMs = new Date(endDate).getTime() + 86400000;
      rows = rows.filter((r) => r.timestamp && new Date(r.timestamp).getTime() <= endMs);
    }
    if (search) {
      rows = rows.filter(
        (r) =>
          String(r.action).toLowerCase().includes(search) ||
          String(r.userEmail || "").toLowerCase().includes(search) ||
          String(r.userId).toLowerCase().includes(search) ||
          String(r.module).toLowerCase().includes(search) ||
          String(r.details || "").toLowerCase().includes(search) ||
          String(r.targetId || "").toLowerCase().includes(search)
      );
    }

    rows.sort((a, b) => {
      const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      return timeB - timeA;
    });

    return res.json({ success: true, rows, hasMore: snap.size === pageSize });
  } catch (error: any) {
    console.error("API GET /api/admin/audit-logs error:", error);
    return res.status(500).json({
      success: false,
      error: error?.message || "Failed to load audit logs.",
    });
  }
});

// 5. Per-user activity stream (audit + applications + invoices + time entries)
adminRouter.get("/users/:userId/activity", requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const adminApp = getFirebaseAdmin();
    if (!adminApp) {
      return res.status(500).json({ success: false, error: "Firebase Admin SDK not initialized." });
    }

    const firestoreAdmin = getAdminFirestore(adminApp);
    const userId = String(req.params.userId || "").trim();
    if (!userId) {
      return res.status(400).json({ success: false, error: "userId is required." });
    }

    const userEmail = typeof req.query.email === "string" ? req.query.email.trim().toLowerCase() : "";
    const limitCount = Math.min(Math.max(parseInt(String(req.query.limit || "30"), 10) || 30, 1), 100);

    const toIso = (raw: any): string => {
      if (!raw) return new Date(0).toISOString();
      if (typeof raw?.toDate === "function") return raw.toDate().toISOString();
      if (raw instanceof Date) return raw.toISOString();
      if (typeof raw === "string" || typeof raw === "number") {
        const d = new Date(raw);
        return isNaN(d.getTime()) ? new Date(0).toISOString() : d.toISOString();
      }
      return new Date(0).toISOString();
    };

    type ActivityRow = {
      id: string;
      action: string;
      module: string;
      details?: string;
      result: "success" | "failure" | "warning";
      timestamp: string;
      actorEmail?: string;
      isActor: boolean;
    };

    const rows: ActivityRow[] = [];

    // Audit logs (admin actions targeting or performed by this user)
    try {
      const auditSnap = await firestoreAdmin.collection("audit_logs").limit(250).get();
      auditSnap.forEach((d) => {
        const data = d.data() || {};
        const docUserId = data.userId || data.actorId;
        const docUserEmail = String(data.userEmail || data.actorEmail || "").toLowerCase().trim();
        const docTargetId = data.targetId;
        const docTargetEmail = String(data.targetUserEmail || data.targetEmail || "").toLowerCase().trim();
        const details = String(data.details || "");
        const isActor = docUserId === userId || (userEmail && docUserEmail === userEmail);
        const isTarget =
          docTargetId === userId ||
          (userEmail && (docTargetEmail === userEmail || details.toLowerCase().includes(userEmail)));
        if (!isActor && !isTarget) return;
        rows.push({
          id: `audit_${d.id}`,
          action: data.action || "SYSTEM_EVENT",
          module: data.module || "Audit",
          details: details || undefined,
          result: data.result === "failure" ? "failure" : data.result === "warning" ? "warning" : "success",
          timestamp: toIso(data.timestamp),
          actorEmail: data.userEmail || data.actorEmail,
          isActor: Boolean(isActor),
        });
      });
    } catch (err) {
      console.warn("[User Activity] audit_logs read failed:", err);
    }

    // Applications submitted by this specialist
    try {
      const appSnap = await firestoreAdmin
        .collection("applications")
        .where("symbioteId", "==", userId)
        .limit(50)
        .get();
      appSnap.forEach((d) => {
        const data = d.data() || {};
        rows.push({
          id: `app_${d.id}`,
          action: "PROPOSAL_SUBMITTED",
          module: "Applications",
          details: `Proposal status: ${data.status || "pending"}${data.projectTitle ? ` · ${data.projectTitle}` : data.projectId ? ` · project ${data.projectId}` : ""}`,
          result: "success",
          timestamp: toIso(data.createdAt || data.updatedAt),
          isActor: true,
        });
      });
    } catch (err) {
      console.warn("[User Activity] applications read failed:", err);
    }

    // Applications received on this client's projects (by clientId on application)
    try {
      const clientAppSnap = await firestoreAdmin
        .collection("applications")
        .where("clientId", "==", userId)
        .limit(50)
        .get();
      clientAppSnap.forEach((d) => {
        const data = d.data() || {};
        rows.push({
          id: `capp_${d.id}`,
          action: "APPLICATION_RECEIVED",
          module: "Applications",
          details: `Application ${data.status || "pending"} from specialist${data.symbioteName ? ` ${data.symbioteName}` : ""}`,
          result: "success",
          timestamp: toIso(data.createdAt || data.updatedAt),
          isActor: false,
        });
      });
    } catch (err) {
      console.warn("[User Activity] client applications read failed:", err);
    }

    // Time entries logged by specialist
    try {
      const timeSnap = await firestoreAdmin
        .collection("time_entries")
        .where("symbioteId", "==", userId)
        .limit(50)
        .get();
      timeSnap.forEach((d) => {
        const data = d.data() || {};
        const hours = data.hours ?? data.durationHours ?? data.totalHours;
        rows.push({
          id: `time_${d.id}`,
          action: "TIME_LOGGED",
          module: "Time Tracking",
          details: `${hours != null ? `${hours}h logged` : "Time entry recorded"}${data.projectTitle ? ` · ${data.projectTitle}` : data.projectId ? ` · project ${data.projectId}` : ""}${data.description ? ` — ${data.description}` : ""}`,
          result: "success",
          timestamp: toIso(data.date || data.createdAt || data.updatedAt),
          isActor: true,
        });
      });
    } catch (err) {
      console.warn("[User Activity] time_entries read failed:", err);
    }

    // Invoices as specialist or client
    for (const field of ["symbioteId", "clientId"] as const) {
      try {
        const invSnap = await firestoreAdmin
          .collection("invoices")
          .where(field, "==", userId)
          .limit(50)
          .get();
        invSnap.forEach((d) => {
          const data = d.data() || {};
          const amount = Number(data.amount) || 0;
          rows.push({
            id: `inv_${field}_${d.id}`,
            action: field === "symbioteId" ? "INVOICE_ISSUED" : "INVOICE_RECEIVED",
            module: "Invoices",
            details: `Invoice ${data.status || "draft"} · $${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${data.projectTitle ? ` · ${data.projectTitle}` : ""}`,
            result: String(data.status || "").toLowerCase() === "paid" ? "success" : "warning",
            timestamp: toIso(data.paidAt || data.issuedDate || data.createdAt || data.updatedAt),
            isActor: field === "symbioteId",
          });
        });
      } catch (err) {
        console.warn(`[User Activity] invoices by ${field} failed:`, err);
      }
    }

    // Reviews received (toUserId and legacy symbioteId)
    try {
      const [byToUser, bySymbiote] = await Promise.all([
        firestoreAdmin.collection("reviews").where("toUserId", "==", userId).limit(30).get(),
        firestoreAdmin.collection("reviews").where("symbioteId", "==", userId).limit(30).get(),
      ]);
      const seenReviews = new Set<string>();
      [...byToUser.docs, ...bySymbiote.docs].forEach((d) => {
        if (seenReviews.has(d.id)) return;
        seenReviews.add(d.id);
        const data = d.data() || {};
        const score = data.ratings?.overall ?? data.rating;
        rows.push({
          id: `rev_${d.id}`,
          action: "REVIEW_RECEIVED",
          module: "Reviews",
          details: typeof score === "number" ? `Rated ${score}/5` : "New review received",
          result: "success",
          timestamp: toIso(data.createdAt || data.updatedAt),
          isActor: false,
        });
      });
    } catch (err) {
      console.warn("[User Activity] reviews read failed:", err);
    }

    rows.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return res.json({ success: true, rows: rows.slice(0, limitCount) });
  } catch (error: any) {
    console.error("API GET /api/admin/users/:userId/activity error:", error);
    return res.status(500).json({
      success: false,
      error: error?.message || "Failed to load user activity.",
    });
  }
});

// 6. Admin Delete Project & Associated Artifacts
adminRouter.delete("/projects/:projectId", requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const adminUser = (req as any).user;
    const adminUid = adminUser?.uid || "admin";

    if (!projectId) {
      return res.status(400).json({ success: false, error: "Project ID is required." });
    }

    const adminApp = getFirebaseAdmin();
    if (!adminApp) {
      return res.status(500).json({ success: false, error: "Firebase Admin SDK not initialized." });
    }

    const firestoreAdmin = getAdminFirestore(adminApp);
    const projRef = firestoreAdmin.collection("projects").doc(projectId);
    const projSnap = await projRef.get();

    if (!projSnap.exists) {
      return res.status(404).json({ success: false, error: "Project record not found." });
    }

    const projData = projSnap.data();
    const projTitle = projData?.title || projData?.name || projectId;

    // Helper to safely delete matching documents in batches
    const deleteMatchingDocs = async (collectionName: string, field: string, value: any) => {
      try {
        const snap = await firestoreAdmin.collection(collectionName).where(field, "==", value).get();
        if (!snap.empty) {
          const batch = firestoreAdmin.batch();
          snap.docs.forEach((d) => batch.delete(d.ref));
          await batch.commit();
        }
      } catch (err) {
        console.warn(`[Delete Project] Batch delete in ${collectionName} (${field} == ${value}) warning:`, err);
      }
    };

    // 1. Delete main project document
    await projRef.delete();

    // 2. Clean up associated project artifacts
    await deleteMatchingDocs("applications", "projectId", projectId);
    await deleteMatchingDocs("invitations", "projectId", projectId);
    await deleteMatchingDocs("time_entries", "projectId", projectId);
    await deleteMatchingDocs("invoices", "projectId", projectId);
    await deleteMatchingDocs("tasks", "projectId", projectId);
    await deleteMatchingDocs("milestones", "projectId", projectId);
    await deleteMatchingDocs("project_activities", "projectId", projectId);

    // 3. Record audit log
    try {
      await firestoreAdmin.collection("audit_logs").add({
        userId: adminUid,
        userEmail: adminUser?.email || "admin@syncsphere.io",
        action: "DELETE_PROJECT",
        module: "Projects",
        targetId: projectId,
        details: `Permanently deleted project '${projTitle}' (${projectId}) and all associated sub-artifacts.`,
        result: "success",
        timestamp: new Date(),
      });
    } catch (auditErr) {
      console.warn("[Delete Project] Audit log warning:", auditErr);
    }

    return res.json({
      success: true,
      message: `Project '${projTitle}' was permanently deleted successfully.`,
    });
  } catch (error: any) {
    console.error("API DELETE /api/admin/projects error:", error);
    return res.status(500).json({
      success: false,
      error: `Failed to delete project: ${error?.message || "Internal server error"}.`,
    });
  }
});

