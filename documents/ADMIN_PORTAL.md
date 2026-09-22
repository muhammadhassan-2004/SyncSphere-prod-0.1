# Admin Portal & Governance Documentation

The Admin Portal provides platform operators, compliance officers, and system administrators with tools to monitor platform operations, manage user accounts, resolve project disputes, and analyze platform growth.

---

## 1. Page Inventory

| Route | Component | Key Features |
| :--- | :--- | :--- |
| `/admin/dashboard` | `AdminDashboardPage.tsx` | Platform KPI stats (Total Users, Active Projects, Platform Gross Revenue, System Uptime), User Growth Chart, System Health Widget, and Quick Actions. |
| `/admin/users` | `UserManagementPage.tsx` | Searchable user directory with role filters, status toggles (Active, Suspended, Pending), role elevation, and CSV export. |
| `/admin/users/:id` | `UserDetailPage.tsx` | Deep user audit: Complete profile data, historical contracts, invoice transactions, logged IP sessions, and account ban/reactivate actions. |
| `/admin/projects` | `ProjectOversightPage.tsx` | All marketplace projects across all states, total contract values, assigned talent, flag statuses, and cancel/refund overrides. |
| `/admin/monitoring` | `PlatformMonitoringPage.tsx` | Real-time platform availability, 5 core architectural service health meters (Firestore, Auth, Gemini AI, Email SMTP, Cloudinary), response speed bars, and incident status. |
| `/admin/audit-logs` | `AuditLogsPage.tsx` | Immutable activity trail: Search and filter by Actor, Module (Auth, Billing, Moderation), IP Address, and Date Range. |
| `/admin/analytics` | `AnalyticsReportingPage.tsx` | Detailed business metrics: Monthly recurring volume, category breakdown charts, user retention curves, and average project budget trends. |
| `/admin/reports` | `ReportsCenterPage.tsx` | Pre-built and custom downloadable operational, financial, and compliance PDF/CSV reports. |
| `/admin/settings` | `AdminSettingsPage.tsx` | 3 Clean, Real Tabs: Admin Profile, Platform Operations & Plans, and Security Policies. |

---

## 2. Platform Monitoring & Telemetry (`PlatformMonitoringPage.tsx`)

The system health engine evaluates and displays real-time operational statuses with intuitive visual progress bars and SLA meters:
* **Platform Availability & SLA**: 99.98% high-availability metric with visual uptime progress bars.
* **Query Latency Speed**: Dynamic millisecond roundtrip ping to Firestore with performance categorization (<150ms Ultra Fast, <450ms Optimal, <800ms Normal).
* **5 Core Architectural Pillars**:
  1. **Firestore Database**: Primary document storage and real-time live listener health.
  2. **Firebase Auth Gateway**: Session token integrity, cryptographic validation, and auth gateway status.
  3. **Gemini AI Engine**: Operational status for AI matchmaking and project brief synthesis.
  4. **Email Service (SMTP)**: Google Workspace SSL pipeline (Port 465) for OTP and transactional dispatch.
  5. **Media & CDN Service (Cloudinary)**: Asset upload pipeline, encrypted media storage, and CDN delivery.
* **System Stability Sentinel**: Continuous surveillance of exceptions and anomalies with clean zero-incident reassurance states and actionable stack inspections.
*(Note: Developer testing forms and duplicate raw audit stream consoles are purged in favor of dedicated `/admin/audit-logs` and `/admin/settings` configurations).*

---

## 3. User Moderation & Status Control Lifecycle

```
[User Flagged / Disputed]
           │
           ▼
[Admin Inspects User Profile at /admin/users/:id]
           │
     ┌─────┴──────────────────────────────┐
     ▼                                    ▼
[Suspend Account]                  [Impersonate / Audit]
  - Updates Firestore status         - Reads session history
  - Calls Admin SDK token revoke     - Reviews past disputes
  - Disables login immediately       - Audits transactions
```

---

## 4. Audit Log Schema & Immutability (`auditLogs.ts`)

Every sensitive administrative action writes an immutable record to `/auditLogs`:
* **actorUid** & **actorEmail**: Administrator who performed the action.
* **action**: e.g. `USER_SUSPENDED`, `PROJECT_FORCE_CLOSED`, `REFUND_ISSUED`, `COMMISSION_UPDATED`.
* **module**: Target domain (`AUTH`, `PROJECTS`, `FINANCE`, `SYSTEM`).
* **details**: JSON payload containing before/after states.
* **timestamp**: ISO timestamp (Firestore server timestamp).
* **Security Rule**: Write allowed only for authenticated admins; Update and Delete rules are hard-coded to `false` to guarantee immutability.

---

## 5. Admin Settings Architecture (`AdminSettingsPage.tsx`)

Consolidated into 3 clean, 100% functional, and real administrative panels (purging obsolete mockups such as fake branding themes, disconnected sessions, cosmetic RBAC dummy cards, developer SMTP diagnostics, and misleading multi-channel notifications):

1. **My Admin Profile (`AdminProfileTab.tsx`)**:
   - Official administrator credentials (First Name, Last Name, Administrative Title).
   - Fixed cryptographic login email (read-only 🔒).
   - Real profile avatar upload & removal with Firestore persistence.
   - Super Administrator authorization badge.
   - Direct password reset dispatch link via Firebase Authentication.
   - Zero client/freelancer bio, hourly rate, or portfolio fields.

2. **Platform & Marketplace Operations (`PlatformOperationsTab.tsx`)**:
   - Marketplace Commission Take-Rate (%): Live parameter for platform fee deduction on milestone invoice settlements.
   - AI Matchmaking Minimum Score (%): Semantic compatibility threshold (default 70%) enforced on the PreSync AI engine to filter out non-matching candidates.
   - Max File Upload Size (MB): Single-file upload cap enforced across submissions.
   - Platform Plans & Subscription Tiers (SaaS Monetization): Configurable monthly pricing for Freelancer Pro ($29/mo) and Client Enterprise ($199/mo) with platform subscription toggle.
   - Platform Maintenance Mode: Solid toggle switch to pause public marketplace access while retaining full administrator console access.

3. **System Security & Access (`SecurityPolicyTab.tsx`)**:
   - Password Complexity & Policy: Minimum character threshold, character diversity enforcement, and progressive brute-force lockout.
   - Mandatory Identity Verification: Enforced email verification toggle required before submitting proposals or approving contracts.
   - Cryptographic Session Integrity: Firebase JWT RS256 token rotation (60 minutes), immediate token invalidation on password change, and TLS 1.3 encryption.
   - Super Administrator Governance: Direct cryptographic UID audit logging in `admin_audit_logs`.

