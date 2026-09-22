import dotenv from "dotenv";
import fs from "fs";
import path from "path";

// Load .env first
dotenv.config();

// If .env file exists on disk, parse and allow overrides if process.env contains empty or placeholder values
try {
  const envPath = path.join(process.cwd(), ".env");
  if (fs.existsSync(envPath)) {
    const parsed = dotenv.parse(fs.readFileSync(envPath));
    for (const [k, v] of Object.entries(parsed)) {
      if (v && v.trim()) {
        const current = process.env[k];
        // If current is missing, or is a placeholder like "dontwant to provide", override with .env value
        if (
          !current ||
          current === "dontwant to provide" ||
          current === "dont have" ||
          current === "undefined" ||
          (k === "SMTP_PASS" && current.length !== 16 && v.replace(/\s+/g, "").length === 16)
        ) {
          process.env[k] = v.trim();
        }
      }
    }
  }
} catch {
  // Silent fallback
}

// Sanitize Cloudinary environment variables BEFORE any cloudinary module is evaluated
if (process.env.CLOUDINARY_URL) {
  let url = process.env.CLOUDINARY_URL.trim().replace(/^["']|["']$/g, "");
  if (url.startsWith("CLOUDINARY_URL=")) {
    url = url.replace(/^CLOUDINARY_URL=/, "").trim().replace(/^["']|["']$/g, "");
  }
  if (
    url.includes("<your_api_key>") ||
    url.includes("<your_api_secret>") ||
    !url.toLowerCase().startsWith("cloudinary://")
  ) {
    delete process.env.CLOUDINARY_URL;
  } else {
    process.env.CLOUDINARY_URL = url;
  }
}

if (process.env.CLOUDINARY_ACCOUNT_URL) {
  const cleanAcc = process.env.CLOUDINARY_ACCOUNT_URL.trim().replace(/^["']|["']$/g, "");
  if (cleanAcc.toLowerCase().startsWith("account://")) {
    process.env.CLOUDINARY_ACCOUNT_URL = cleanAcc;
  } else {
    delete process.env.CLOUDINARY_ACCOUNT_URL;
  }
}

// Ensure clean trimmed values without quotes
if (process.env.SMTP_HOST) {
  process.env.SMTP_HOST = process.env.SMTP_HOST.trim().replace(/^["']|["']$/g, "");
}
if (process.env.SMTP_USER) {
  process.env.SMTP_USER = process.env.SMTP_USER.trim().replace(/^["']|["']$/g, "");
}
if (process.env.SMTP_PASS) {
  process.env.SMTP_PASS = process.env.SMTP_PASS.trim().replace(/^["']|["']$/g, "");
}
if (process.env.SMTP_FROM) {
  process.env.SMTP_FROM = process.env.SMTP_FROM.trim().replace(/^["']|["']$/g, "");
}
if (process.env.CLOUDINARY_CLOUD_NAME) {
  process.env.CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME.trim().replace(/^["']|["']$/g, "");
}
if (process.env.CLOUDINARY_API_KEY) {
  process.env.CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY.trim().replace(/^["']|["']$/g, "");
}
if (process.env.CLOUDINARY_API_SECRET) {
  process.env.CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET.trim().replace(/^["']|["']$/g, "");
}


