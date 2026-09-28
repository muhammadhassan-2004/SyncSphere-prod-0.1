import "./server/env";
import express from "express";
import path from "path";
import fs from "fs";
import net from "net";
import { createServer as createViteServer } from "vite";
import rateLimit from "express-rate-limit";
import { isSmtpConfigured } from "./server/emailService";
import { authRouter } from "./server/routes/auth.routes";
import { aiRouter } from "./server/routes/ai.routes";
import { uploadRouter } from "./server/routes/upload.routes";
import { adminRouter } from "./server/routes/admin.routes";
import { paymentsRouter } from "./server/routes/payments.routes";

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Prevent background library errors (e.g. gRPC or transient network drops) from crashing the server
process.on("unhandledRejection", (reason) => {
  console.warn("[Server Warning] Intercepted unhandled promise rejection:", reason);
});
process.on("uncaughtException", (err) => {
  console.error("[Server Error] Intercepted uncaught exception:", err);
});

app.set("trust proxy", 1);

// ─── CORS ────────────────────────────────────────────────────────────────────
const allowedOrigins: string[] = [
  process.env.APP_URL ?? "",
  "http://localhost:3000",
  "http://localhost:5173",
].filter(Boolean);

app.use((req, res, next) => {
  const origin = req.headers.origin ?? "";
  if (allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

// ─── RATE LIMITING ───────────────────────────────────────────────────────────
// Global limiter: 100 requests per 15 minutes per IP
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please try again later." },
});

// Stricter limiter for auth endpoints (brute-force protection): 20 requests per 15 minutes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many authentication attempts. Please try again later." },
});

// AI endpoints: 30 requests per 15 minutes (expensive upstream calls)
const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "AI rate limit reached. Please try again later." },
});

// Apply global limiter to all /api routes
app.use("/api", globalLimiter);

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Ensure upload directory exists and serve static uploads
const uploadsDir = path.join(process.cwd(), "public", "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use("/uploads", express.static(uploadsDir));

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    service: "SyncSphere API",
    smtpConfigured: isSmtpConfigured(),
  });
});

// Modular Route Mounts
app.use("/api/auth", authLimiter, authRouter);
app.use("/api/admin", adminRouter);
app.use("/api/upload", uploadRouter);
app.use("/api/payments", paymentsRouter);
app.use("/api", aiLimiter, aiRouter); // /api/generate-project-brief & /api/generate-matches

// Root-level Aliases for backwards compatibility
app.post("/api/upload-base64", (req, res, next) => {
  req.url = "/base64";
  uploadRouter(req, res, next);
});

// Vite middleware setup
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  let targetPort = PORT;
  const isOccupied = await new Promise<boolean>((resolve) => {
    const socket = net.createConnection({ port: targetPort, host: "127.0.0.1" });
    socket.once("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.once("error", () => {
      resolve(false);
    });
    socket.setTimeout(600, () => {
      socket.destroy();
      resolve(false);
    });
  });

  if (isOccupied) {
    console.warn(`[Server Notice] Port ${targetPort} is already occupied by another running application. Automatically switching to port ${targetPort + 1}...`);
    targetPort += 1;
  }

  app.listen(targetPort, "0.0.0.0", () => {
    console.log(`SyncSphere server running on http://localhost:${targetPort}`);
  });
}

startServer();
