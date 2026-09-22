# SyncSphere System Architecture

## 1. High-Level Architectural Blueprint

SyncSphere is constructed as a modern, unified full-stack architecture combining a reactive single-page client application (SPA) with a lightweight Node.js/Express API gateway and a cloud-native Firebase Firestore & Authentication backend.

```
┌────────────────────────────────────────────────────────────────────────────┐
│                             BROWSER CLIENT                                 │
│  React 18 + TypeScript + Tailwind CSS + Lucide React + Framer Motion       │
│                                                                            │
│  ┌───────────────────┐  ┌───────────────────┐  ┌────────────────────────┐  │
│  │   Client Portal   │  │  Symbiote Portal  │  │      Admin Portal      │  │
│  │ (/client/* routes)│  │(/symbiote/* routes│  │   (/admin/* routes)    │  │
│  └─────────┬─────────┘  └─────────┬─────────┘  └───────────┬────────────┘  │
│            │                      │                        │               │
│            └──────────────────────┼────────────────────────┘               │
│                                   ▼                                        │
│                      Global AuthContext & State                            │
└───────────────────┬─────────────────────────────────┬──────────────────────┘
                    │ REST / Multipart                │ WebSockets / SDK
                    ▼                                 ▼
┌───────────────────────────────────────┐ ┌──────────────────────────────────┐
│          Express Backend Server       │ │     Firebase Cloud Platform      │
│  (Port 3000 Ingress / Reverse Proxy)  │ │                                  │
│                                       │ │  • Firebase Authentication       │
│  • Gemini AI Engine (@google/genai)   │ │  • Cloud Firestore (Real-Time)   │
│  • Cloudinary Media Upload Service    │ │  • Firebase Storage              │
│  • Nodemailer SMTP Service (OTP/Mail) │ │  • Role & Permission Rules       │
│  • Password Reuse Verification API    │ │                                  │
│  • Firebase Admin SDK Verification    │ │                                  │
└───────────────────────────────────────┘ └──────────────────────────────────┘
```

---

## 2. Directory Map

```
/
├── documents/                     # Project technical documentation
├── server/                        # Server micro-modules
│   ├── cloudinary.ts              # Cloudinary SDK image upload & optimization
│   ├── emailService.ts            # Nodemailer SMTP transporter (OTP, templates)
│   ├── env.ts                     # Server-side environment variable loader
│   └── firebaseAdmin.ts           # Firebase Admin SDK initialization
├── src/
│   ├── components/                # React component tree
│   │   ├── admin/                 # Admin specific analytics & moderation panels
│   │   ├── auth/                  # Route guards (RequireAdmin)
│   │   ├── landing/               # Hero sections, mockups, FAQs, testimonials
│   │   ├── layout/                # PortalShell, PublicNavbar, PublicFooter, GlobalSearchBar
│   │   ├── profile/               # User profile preview modal
│   │   ├── project/               # Workspace tabs, milestones, task drawers, team modals
│   │   ├── settings/              # Settings navigation sidebar
│   │   ├── talent/                # Profile headers, portfolio, reviews, experience tabs
│   │   ├── ui/                    # Base primitives: Button, Card, Input, Badge, Avatar, OTP
│   │   └── widgets/               # KPI cards, Table shells, Progress bars, Wizard indicators
│   ├── context/
│   │   └── AuthContext.tsx        # Centralized auth state, role switching, user profiles
│   ├── data/
│   │   └── symbiotes.ts           # Seed freelancer profiles and mock talent dataset
│   ├── lib/
│   │   ├── auth/                  # Password reset & client auth helpers
│   │   ├── firestore/             # 28 modular Firestore query and listener modules
│   │   ├── storage/               # Cloudinary upload helpers & file downloader
│   │   ├── toast/                 # Toast context & UI notification system
│   │   ├── utils/                 # File type detection & formatting utils
│   │   ├── validation/            # Form validators (email, passwords, budgets)
│   │   ├── constants.ts           # System constants, categories, skill taxonomy
│   │   ├── firebase.ts            # Client-side Firebase SDK configuration
│   │   └── utils.ts               # Classnames helper (cn)
│   ├── pages/
│   │   ├── admin/                 # 9 Admin management and analytics pages
│   │   ├── client/                # 14 Client portal project and hiring pages
│   │   ├── public/                # 12 Public marketing, login, and auth pages
│   │   ├── symbiote/              # 13 Symbiote freelancer workspace pages
│   │   └── PlaceholderPageRoute.tsx
│   ├── types/
│   │   └── firestore.ts           # TypeScript interfaces for all Firestore models
│   ├── App.tsx                    # Top-level Router and Route definitions
│   ├── index.css                  # Tailwind styles and CSS Custom Properties
│   └── main.tsx                   # React DOM root render
├── firestore.rules                # Firestore security rules
├── storage.rules                  # Firebase Storage rules
├── server.ts                      # Express server entry point & Vite middleware
├── package.json                   # Dependencies and scripts
└── vite.config.ts                 # Vite bundler configuration
```

---

## 3. Design System & CSS Custom Properties

SyncSphere uses a refined dark/neutral aesthetic configured inside `src/index.css` using CSS custom properties:

```css
:root {
  --color-bg-primary: #0a0d12;
  --color-bg-secondary: #121824;
  --color-bg-card: #161f30;
  --color-bg-card-hover: #1c273c;
  --color-border: #223048;
  --color-border-subtle: #1a2538;
  --color-text-primary: #f1f5f9;
  --color-text-secondary: #94a3b8;
  --color-text-muted: #64748b;
  --color-accent-cyan: #00e5ff;
  --color-accent-blue: #3b82f6;
  --color-accent-emerald: #10b981;
  --color-accent-amber: #f59e0b;
  --color-accent-rose: #f43f5e;
}
```

### Typography Hierarchy
* **Display & Brand Headings**: `font-sans font-bold tracking-tight text-white`
* **Data / Code / Monospace**: `font-mono text-xs uppercase tracking-wider`
* **Body**: `font-sans text-sm md:text-base text-[var(--color-text-secondary)] leading-relaxed`

---

## 4. Route Hierarchy & Route Guards

All routes are declared in `src/App.tsx`:

* **Public Routes** (`/`, `/about`, `/contact`, `/help`, `/terms`, `/privacy`) - Accessible to everyone.
* **Public-Only Routes** (`/login`, `/signup`, `/portal-select`, `/verify-email`, `/reset/*`) - Wrapped in `<PublicOnlyRoute />`. Authenticated users are automatically redirected to their role dashboard.
* **Protected Client Routes** (`/client/*`) - Wrapped in `<ProtectedRoute requiredRole="client" />`.
* **Protected Symbiote Routes** (`/symbiote/*`) - Wrapped in `<ProtectedRoute requiredRole="symbiote" />`.
* **Protected Admin Routes** (`/admin/*`) - Wrapped in `<ProtectedRoute requiredRole="admin" />` and guarded by `<RequireAdmin />`.

---

## 5. Global State Management (`AuthContext.tsx`)

`AuthContext` provides the single source of truth for:
1. `firebaseUser`: Native Firebase Authentication user instance.
2. `userProfile`: Document snapshot from `/users/{uid}`.
3. `authenticatedUser`: Memoized active user profile synced with active role.
4. `currentRole`: Active role string (`'client' | 'symbiote' | 'admin'`).
5. `loading`: Global authentication bootstrap loading state.
6. `login(role)` / `logout()` / `setRole(role)`: Action dispatchers.

---

## 6. Project, Multi-Role Team, Task-Hourly Lifecycle & External Settlement Architecture

### 6.1 Pure SaaS Business & Monetization Model
* SyncSphere generates platform revenue exclusively through **SaaS Subscription Plans** (Client Starter/Growth/Enterprise & Specialist Pro).
* The platform does **not** act as an escrow custodian or direct financial intermediary for project milestone funds, avoiding complex banking/regulatory overhead.

### 6.2 Project & Multi-Specialist Task Hierarchy
```
Project (Owned by Business Owner / Client)
  └── Milestones (Phases: Wireframes, Backend, QA, Deployment)
        └── Tasks (Assigned to specific Team Members)
              ├── Estimated Hours (Input Target, e.g., 12.0h)
              ├── Actual Total Hours (Frozen/System-Accumulated from live timer)
              ├── Assigned Specialist (e.g. Lead Dev, Designer, QA, Project Manager)
              └── Agreed Specialist Hourly Rate (e.g. $50/hr)
```

### 6.3 Live Stopwatch & Task Hours Accumulation
1. Specialist opens Time Tracker, selects active Project and specific Task, and starts the timer.
2. Timer logs time entries and atomically accumulates the logged duration into `tasks/{taskId}.actualTotalHours`.
3. Task progress and logged vs. estimated hours reflect in real-time on Kanban cards.

### 6.4 Milestone Completion, Itemized Invoices & External Settlement
1. **Task Review**: Specialist marks task complete; Business Owner approves the completed task.
2. **Milestone Itemized Invoice**: Once all tasks in a milestone are approved, system generates an itemized invoice:
   - Line items: Task Title, Specialist Name, Actual Hours × Hourly Rate = Subtotal.
   - Embedded Specialist Payment Instructions (Bank IBAN / Swift / Routing #, PayPal, Wise, Crypto).
3. **Off-Platform Payment & Proof**: Business Owner pays the specialist externally (Bank Wire, PayPal, Wise) and attaches payment proof (Transaction ID / receipt).
4. **Specialist Confirmation**: Specialist verifies receipt and clicks **"Confirm Payment Received ✅"**, closing the milestone cycle.
