# SyncSphere

Modern AI-driven workspace and freelance marketplace platform built with React 19, Vite, Express, and Firebase.

SyncSphere unifies talent discovery, real-time collaboration, milestones, time tracking, invoice settlements, and AI-powered matchmaking in a single workspace.

---

## 🚀 Quick Start (Local Development)

### Prerequisites
- **Node.js**: v18.0.0 or higher (v20+ recommended)
- **npm**: v9+
- **Firebase Project**: Cloud Firestore and Firebase Authentication enabled

### 1. Installation
Clone the repository and install all dependencies:
```bash
git clone https://github.com/your-org/syncsphere.git
cd syncsphere
npm install
```

### 2. Environment Configuration
Copy `.env.example` to `.env` and populate your secrets:
```bash
cp .env.example .env
```

Key environment variables:
| Variable | Description | Required In Production |
| :--- | :--- | :---: |
| `FIREBASE_PROJECT_ID` | Firebase Project Identifier | **Yes** |
| `FIREBASE_SERVICE_ACCOUNT` | JSON string or Base64 credentials for Firebase Admin SDK | **Yes** |
| `GEMINI_API_KEY` | Google AI Studio key for AI matching & brief generator | **Yes** |
| `APP_URL` | Canonical public URL (e.g. `https://syncsphere.com`) | **Yes** |
| `SMTP_HOST`, `SMTP_PORT` | SMTP Email Server details | **Yes** |
| `SMTP_USER`, `SMTP_PASS` | SMTP Account credentials for verification emails | **Yes** |
| `PORT` | Node server listen port (default `3000`) | Optional |
| `STRIPE_SECRET_KEY` | Stripe Payment integration secret key | Optional |

### 3. Start Development Server
Runs Vite development client alongside the Express API server:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧪 Testing & Code Quality

Run the comprehensive test runner (178+ test cases covering auth, security rules, invoicing, and edge cases):
```bash
npm test
```

Run TypeScript static analysis:
```bash
npm run lint
```

---

## 📦 Production Build & Deployment

### 1. Build Client and Server Bundles
Generates optimized production assets in `dist/` (client) and `dist-server/` (Node Express server):
```bash
npm run build
```

### 2. Start Production Server
```bash
npm run start
```

### 3. Docker Deployment (Optional)
To containerize and run on Cloud Run, AWS ECS, or any Docker host:
```bash
# Build Docker image
docker build -t syncsphere:latest .

# Run container
docker run -p 3000:3000 --env-file .env syncsphere:latest
```

---

## 🔒 Security & Architecture Standards
- **Authentication**: Strict Firebase Authentication with email verification and role-based access control (`client`, `symbiote`, `admin`).
- **Database**: Cloud Firestore with strict security rules enforcing immutable audit records (`allow delete: if false;` on key collections) and soft-cancellation/deactivation models.
- **AI Matching**: Google Gemini AI API with strict prompt boundary safeguards and server-side fallback calculation.
