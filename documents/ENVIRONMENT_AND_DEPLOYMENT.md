# Environment, Configuration & Deployment Guide

This guide covers all environment variable definitions, build scripts, development server lifecycles, and production deployment configurations for SyncSphere.

---

## 1. Environment Variable Reference (`.env.example`)

SyncSphere uses server-side environment variables for sensitive API keys and SMTP credentials, while non-sensitive client variables use the `VITE_` prefix.

```env
# =================================================================
# Firebase Client SDK Configuration (Public / Client-Safe)
# =================================================================
VITE_FIREBASE_API_KEY=your-firebase-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project-id.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
VITE_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX

# =================================================================
# Server-Side API Secrets (NEVER expose to client)
# =================================================================
# Google Gemini AI API Key
GEMINI_API_KEY=your-google-gemini-api-key

# Firebase Admin SDK Service Account (Optional / Production Auth)
FIREBASE_SERVICE_ACCOUNT_KEY=

# Cloudinary CDN Configuration (Image and Asset Uploads)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-cloudinary-api-key
CLOUDINARY_API_SECRET=your-cloudinary-api-secret

# Nodemailer SMTP Email Service (OTP, Invitations & Notifications)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=team@pixelgenesys.com
SMTP_PASS=ufosccidxxkpntjf
SMTP_FROM=team@pixelgenesys.com

# Server Runtime Configuration
NODE_ENV=production
```

---

## 2. Build Pipeline & Production Packaging

SyncSphere compiles both the client-side SPA and the backend Express server into optimized production bundles:

```bash
# 1. Install Dependencies
npm install

# 2. Typecheck & Lint
npm run lint

# 3. Production Build
npm run build
```

### What `npm run build` executes:
1. `vite build`: Compiles all React, TypeScript, and Tailwind CSS assets into optimized static assets in `/dist`.
2. `esbuild server.ts`: Bundles the Express backend into a single CommonJS executable file at `/dist/server.cjs` with external dependencies preserved (`--packages=external`).

---

## 3. Production Execution

```bash
# Start the standalone production server
npm start
# (Runs: node dist/server.cjs)
```

The production server:
* Listens on port `3000` (binding to `0.0.0.0`).
* Serves static assets from `/dist`.
* Routes `/api/*` requests to Express route handlers.
* Returns `index.html` for all client-side SPA route fallbacks.

---

## 4. Development Workflow

In development mode:
```bash
npm run dev
# (Runs: tsx server.ts)
```
* The Express server boots using `tsx` (TypeScript execute).
* Vite middleware is automatically mounted to provide instant server-side module resolution.
* Port `3000` serves both the API routes and the client application.
