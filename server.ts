import "./server/env";
import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { isSmtpConfigured } from "./server/emailService";
import { authRouter } from "./server/routes/auth.routes";
import { aiRouter } from "./server/routes/ai.routes";
import { uploadRouter } from "./server/routes/upload.routes";
import { adminRouter } from "./server/routes/admin.routes";
import { paymentsRouter } from "./server/routes/payments.routes";

const app = express();
const PORT = 3000;

// Prevent background library errors (e.g. gRPC or transient network drops) from crashing the server
process.on("unhandledRejection", (reason) => {
  console.warn("[Server Warning] Intercepted unhandled promise rejection:", reason);
});
process.on("uncaughtException", (err) => {
  console.error("[Server Error] Intercepted uncaught exception:", err);
});

app.set("trust proxy", 1);
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
app.use("/api/auth", authRouter);
app.use("/api/admin", adminRouter);
app.use("/api/upload", uploadRouter);
app.use("/api/payments", paymentsRouter);
app.use("/api", aiRouter); // /api/generate-project-brief & /api/generate-matches

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

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`SyncSphere server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
