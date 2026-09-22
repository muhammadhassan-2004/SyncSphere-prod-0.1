# Backend API & Services Specification

SyncSphere's server layer (`server.ts` + `/server/*`) runs on Node.js using Express. It serves as an API Gateway, an AI orchestration middleware, and an asset upload processor.

---

## 1. API Route Index

### 1.1 Authentication & Password APIs
| Route | Method | Payload / Params | Response | Description |
| :--- | :--- | :--- | :--- | :--- |
| `/api/auth/send-verification-otp` | `POST` | `{ email, role }` | `{ success: true, messageId }` | Sends 6-digit verification code |
| `/api/auth/verify-otp` | `POST` | `{ email, code }` | `{ valid: boolean }` | Checks submitted OTP |
| `/api/auth/update-password` | `POST` | `{ uid, oldPassword, newPassword }` | `{ success: true }` | Verifies old password & updates via Firebase Admin |
| `/api/auth/admin-set-status` | `POST` | `{ uid, status }` | `{ success: true }` | Suspends or activates user |

---

### 1.2 Gemini AI Capabilities (`@google/genai`)
| Route | Method | Request Body | Description |
| :--- | :--- | :--- | :--- |
| `/api/ai/match-talent` | `POST` | `{ projectId, projectRequirements, candidates }` | Ranks symbiotes and computes match scores with explanations |
| `/api/ai/generate-proposal` | `POST` | `{ projectTitle, projectDescription, symbioteBio, skills }` | Generates a structured proposal draft |
| `/api/ai/summarize-project` | `POST` | `{ rawDescription, category, budget }` | Polishes project brief into technical milestones and acceptance criteria |
| `/api/ai/generate-contract` | `POST` | `{ project, symbiote, client, milestones }` | Produces freelance agreement legal clauses |

---

### 1.3 Media & Cloudinary Storage APIs
| Route | Method | Content-Type | Response | Description |
| :--- | :--- | :--- | :--- | :--- |
| `/api/upload/image` | `POST` | `multipart/form-data` | `{ url, public_id, width, height }` | Uploads and optimizes images via Cloudinary |
| `/api/upload/document` | `POST` | `multipart/form-data` | `{ url, name, size, type }` | Stores project files and attachments |

---

### 1.4 Notification & Email Transports (`/server/emailService.ts`)
| Route | Method | Payload | Description |
| :--- | :--- | :--- | :--- |
| `/api/email/invitation` | `POST` | `{ toEmail, clientName, projectTitle, inviteLink }` | Dispatches invitation email to prospective symbiotes |
| `/api/email/invoice-alert` | `POST` | `{ toEmail, invoiceNumber, amount, dueDate, viewUrl }` | Sends payment notification to clients |

---

## 2. Gemini AI Integration Architecture

The backend leverages the modern `@google/genai` TypeScript SDK:

```typescript
import { GoogleGenAI } from '@google/genai';

let aiInstance: GoogleGenAI | null = null;

function getAI(): GoogleGenAI {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is required');
    }
    aiInstance = new GoogleGenAI({ apiKey });
  }
  return aiInstance;
}
```

### Prompt Engineering Patterns
* **Talent Matcher**: Considers skill overlap, past review ratings, hourly rate alignment, and portfolio relevance to generate a 0–100% score and concise bullet-point rationale.
* **Proposal Assistant**: Contextualizes the freelancer's bio and past completed projects to craft tailored cover letters with realistic timeline breakdowns.
* **Milestone Breakdown**: Analyzes scope to auto-generate 3-5 sequential development phases with deliverables.

---

## 3. Email Microservice Architecture (`server/emailService.ts`)

Nodemailer is configured using environment variables with SSL encryption:
* `SMTP_HOST`: `smtp.gmail.com`
* `SMTP_PORT`: `465` (SSL Secure Connection)
* `SMTP_USER`: `team@pixelgenesys.com`
* `SMTP_PASS`: `ufosccidxxkpntjf` (Google Dedicated App Password)
* `SMTP_FROM`: `team@pixelgenesys.com` (or `SMTP_FROM`)

Templates are pre-rendered with responsive HTML email markup and accessible dark-mode friendly CSS inline styling. OTP verification emails, project invitations, milestone approvals, and invoice notices are dispatched directly through this authenticated channel.
