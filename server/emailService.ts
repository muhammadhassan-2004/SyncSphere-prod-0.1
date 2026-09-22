import nodemailer from "nodemailer";

export interface SmtpConfig {
  host?: string;
  port?: number;
  secure?: boolean;
  user?: string;
  pass?: string;
  from?: string;
}

export function getSmtpConfig(): SmtpConfig {
  const portStr = process.env.SMTP_PORT?.trim();
  const port = portStr ? parseInt(portStr, 10) : 465;
  const rawSecure = process.env.SMTP_SECURE?.toLowerCase().trim();
  const isSecure = rawSecure === "true" 
    ? true 
    : (rawSecure === "false" ? false : port === 465);

  const rawUser = process.env.SMTP_USER ? process.env.SMTP_USER.trim() : undefined;
  let rawPass = process.env.SMTP_PASS ? process.env.SMTP_PASS.trim() : undefined;

  // If password contains spaces (like standard Google App Passwords "abcd efgh ijkl mnop"), strip spaces
  if (rawPass && rawPass.includes(" ")) {
    const noSpaces = rawPass.replace(/\s+/g, "");
    if (noSpaces.length === 16) {
      rawPass = noSpaces;
    }
  }

  return {
    host: process.env.SMTP_HOST ? process.env.SMTP_HOST.trim() : undefined,
    port: isNaN(port) ? 465 : port,
    secure: isSecure,
    user: rawUser,
    pass: rawPass,
    from: process.env.SMTP_FROM ? process.env.SMTP_FROM.trim() : (rawUser || undefined),
  };
}

export function isSmtpConfigured(): boolean {
  const config = getSmtpConfig();
  return Boolean(config.host && config.user && config.pass);
}

export function createTransporter(customConfig?: SmtpConfig) {
  const cfg = customConfig || getSmtpConfig();
  if (!cfg.host || !cfg.user || !cfg.pass) {
    return null;
  }
  const isSecure = cfg.secure ?? (cfg.port === 465);
  return nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port || 465,
    secure: isSecure,
    auth: {
      user: cfg.user,
      pass: cfg.pass,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });
}

function getBaseTemplate(contentHtml: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SyncSphere</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0b0f19; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f1f5f9;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #0b0f19; padding: 30px 15px;">
    <tr>
      <td align="center">
        <table width="100%" max-width="560" border="0" cellspacing="0" cellpadding="0" style="max-width: 560px; background-color: #131b2e; border: 1px solid #1e293b; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
          <!-- Header / Brand -->
          <tr>
            <td style="padding: 28px 32px; background: linear-gradient(135deg, #131b2e 0%, #1e293b 100%); border-bottom: 1px solid #1e293b;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <div style="display: inline-block; font-size: 20px; font-weight: 800; letter-spacing: -0.5px; color: #38bdf8;">
                      <span style="color: #38bdf8;">Sync</span><span style="color: #f1f5f9;">Sphere</span>
                    </div>
                  </td>
                  <td align="right">
                    <span style="display: inline-block; padding: 4px 10px; font-size: 10px; font-weight: 700; font-family: monospace; text-transform: uppercase; background-color: rgba(56, 189, 248, 0.1); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.2); border-radius: 6px;">
                      Secure Notification
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 36px 32px;">
              ${contentHtml}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; background-color: #0d1322; border-top: 1px solid #1e293b; text-align: center; font-size: 11px; color: #64748b; line-height: 1.6;">
              <p style="margin: 0 0 6px 0;">This email was sent by SyncSphere Platform Security.</p>
              <p style="margin: 0;">If you did not request this email, you can safely disregard it. Your account remains protected.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

/**
 * Dispatches a 6-digit OTP verification email for Sign-up / Account Activation
 */
export async function sendSignupVerificationEmail(params: {
  email: string;
  code: string;
  link?: string;
  fullName?: string;
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const { email, code, link, fullName } = params;
  const config = getSmtpConfig();
  const cleanEmail = email.trim().toLowerCase();

  const greeting = fullName ? `Hello ${fullName},` : "Hello,";
  const contentHtml = `
    <h2 style="margin: 0 0 12px 0; font-size: 22px; font-weight: 700; color: #f1f5f9;">Verify your email address</h2>
    <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #94a3b8;">
      ${greeting} Welcome to SyncSphere! Please use the 6-digit verification code below to confirm your email and activate your account.
    </p>

    <!-- 6-Digit OTP Box -->
    <div style="margin: 24px 0; padding: 20px; background-color: #0b0f19; border: 1px solid #38bdf8; border-radius: 12px; text-align: center;">
      <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #38bdf8; margin-bottom: 8px;">
        Your 6-Digit Security Code
      </div>
      <div style="font-family: 'SF Mono', Consolas, Monaco, monospace; font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #ffffff; text-shadow: 0 0 10px rgba(56,189,248,0.3);">
        ${code}
      </div>
      <div style="font-size: 11px; color: #64748b; margin-top: 8px;">
        Valid for 15 minutes
      </div>
    </div>

    ${
      link
        ? `
    <div style="text-align: center; margin: 24px 0;">
      <p style="font-size: 12px; color: #94a3b8; margin-bottom: 12px;">Or verify automatically by clicking below:</p>
      <a href="${link}" style="display: inline-block; padding: 12px 28px; background-color: #38bdf8; color: #0b0f19; text-decoration: none; font-size: 14px; font-weight: 700; border-radius: 8px; box-shadow: 0 4px 12px rgba(56, 189, 248, 0.25);">
        Verify Email Address
      </a>
    </div>
    `
        : ""
    }

    <p style="margin: 24px 0 0 0; font-size: 12px; line-height: 1.5; color: #64748b;">
      For your security, never share this code with anyone. SyncSphere team members will never ask for your verification code.
    </p>
  `;

  const html = getBaseTemplate(contentHtml);
  const subject = `[SyncSphere] ${code} is your email verification code`;

  // Always log clearly to server console
  console.log(`\n======================================================`);
  console.log(`[SMTP Email Dispatch: Signup Verification]`);
  console.log(`To: ${cleanEmail}`);
  console.log(`6-Digit OTP: >>> ${code} <<<`);
  if (link) console.log(`Link: ${link}`);
  console.log(`======================================================\n`);

  if (!isSmtpConfigured()) {
    console.log(`[SMTP Notice] SMTP is not configured in .env (SMTP_HOST is empty). Logged OTP code to console.`);
    return { success: true };
  }

  try {
    const transporter = createTransporter(config);
    if (!transporter) {
      return { success: true };
    }
    const info = await transporter.sendMail({
      from: config.from,
      to: cleanEmail,
      subject,
      html,
    });
    console.log(`[SMTP Success] Sent verification email to ${cleanEmail}. MessageId: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (err: any) {
    console.error(`[SMTP Error] Failed to send verification email to ${cleanEmail}:`, err?.message);
    return { success: false, error: err?.message || "Failed to send email via SMTP" };
  }
}

/**
 * Dispatches a 6-digit OTP password reset email
 */
export async function sendPasswordResetEmail(params: {
  email: string;
  code: string;
  link?: string;
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const { email, code, link } = params;
  const config = getSmtpConfig();
  const cleanEmail = email.trim().toLowerCase();

  const contentHtml = `
    <h2 style="margin: 0 0 12px 0; font-size: 22px; font-weight: 700; color: #f1f5f9;">Reset Your Password</h2>
    <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #94a3b8;">
      We received a request to reset the password for your SyncSphere account (<strong style="color: #f1f5f9;">${cleanEmail}</strong>). Enter the 6-digit code below to proceed with setting a new password.
    </p>

    <!-- 6-Digit OTP Box -->
    <div style="margin: 24px 0; padding: 20px; background-color: #0b0f19; border: 1px solid #38bdf8; border-radius: 12px; text-align: center;">
      <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #38bdf8; margin-bottom: 8px;">
        Password Reset Code
      </div>
      <div style="font-family: 'SF Mono', Consolas, Monaco, monospace; font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #ffffff; text-shadow: 0 0 10px rgba(56,189,248,0.3);">
        ${code}
      </div>
      <div style="font-size: 11px; color: #64748b; margin-top: 8px;">
        Valid for 15 minutes
      </div>
    </div>

    ${
      link
        ? `
    <div style="text-align: center; margin: 24px 0;">
      <p style="font-size: 12px; color: #94a3b8; margin-bottom: 12px;">Or reset directly with one click:</p>
      <a href="${link}" style="display: inline-block; padding: 12px 28px; background-color: #38bdf8; color: #0b0f19; text-decoration: none; font-size: 14px; font-weight: 700; border-radius: 8px; box-shadow: 0 4px 12px rgba(56, 189, 248, 0.25);">
        Set New Password
      </a>
    </div>
    `
        : ""
    }

    <p style="margin: 24px 0 0 0; font-size: 12px; line-height: 1.5; color: #64748b;">
      If you did not request a password reset, please change your credentials immediately or contact support.
    </p>
  `;

  const html = getBaseTemplate(contentHtml);
  const subject = `[SyncSphere] ${code} is your password reset code`;

  // Always log clearly to server console
  console.log(`\n======================================================`);
  console.log(`[SMTP Email Dispatch: Password Reset]`);
  console.log(`To: ${cleanEmail}`);
  console.log(`6-Digit Reset Code: >>> ${code} <<<`);
  if (link) console.log(`Link: ${link}`);
  console.log(`======================================================\n`);

  if (!isSmtpConfigured()) {
    console.log(`[SMTP Notice] SMTP is not configured in .env (SMTP_HOST is empty). Logged OTP code to console.`);
    return { success: true };
  }

  try {
    const transporter = createTransporter(config);
    if (!transporter) {
      return { success: true };
    }
    const info = await transporter.sendMail({
      from: config.from,
      to: cleanEmail,
      subject,
      html,
    });
    console.log(`[SMTP Success] Sent password reset email to ${cleanEmail}. MessageId: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (err: any) {
    console.error(`[SMTP Error] Failed to send password reset email to ${cleanEmail}:`, err?.message);
    return { success: false, error: err?.message || "Failed to send email via SMTP" };
  }
}
