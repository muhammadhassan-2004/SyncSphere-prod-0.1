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

