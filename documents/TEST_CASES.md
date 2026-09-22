# 🧪 SyncSphere — Comprehensive Master Quality Assurance & Test Cases

**Document Type**: Master QA & Testing Specification  
**Source Baseline**: Derived strictly from `/documents/*` (Architecture, Blueprints, Security, Portals & Bugs Tracker)  
**Standard Test Case Format**:
- **Test ID**: Unique identifier with Category/Role prefix
- **Title & Scope**: Specific UI component or functional flow under test
- **Preconditions**: Initial state, authenticated session, or data requirement
- **Test Steps**: Step-by-step reproducible action sequence
- **Expected Result**: Exact expected system behavior and UI state
- **Bug/Issue Reference**: Cross-referenced with `/documents/BUGS_AND_ISSUES_TRACKER.md`
- **Execution Status**: `[ ] Pending` | `[x] Passed` | `[!] Failed`

---

# 📑 TABLE OF CONTENTS

1. [Module 1: Authentication, Onboarding & Security Test Cases (TC-AUTH)](#1-module-1-authentication-onboarding--security-test-cases-tc-auth)
2. [Module 2: Client Portal Test Cases (TC-CLI)](#2-module-2-client-portal-test-cases-tc-cli)
   - 2.1 Navigation & Dashboard KPIs
   - 2.2 Project Creation & AI Scope Wizard
   - 2.3 Talent Discovery, Invitations & AI Matching
   - 2.4 Proposals, Hiring & Escrow Gate
   - 2.5 Kanban Workspace & Task Lifecycle
   - 2.6 Real-Time Chat & Cloudinary Attachments
   - 2.7 Files & Deliverables Management
   - 2.8 Time Tracking & Timesheet Approvals
   - 2.9 Invoicing, Billing & Stripe Elements
   - 2.10 Specialist Reviews & Ratings
   - 2.11 Client Company Settings
3. [Module 3: Symbiote (Freelancer) Portal Test Cases (TC-SYM)](#3-module-3-symbiote-freelancer-portal-test-cases-tc-sym)
   - 3.1 Specialist Dashboard & Earnings Overview
   - 3.2 Marketplace Browse & AI Proposal Submission
   - 3.3 Active Workspace & Milestone Deliverables
   - 3.4 Live Stopwatch & Manual Time Tracking
   - 3.5 Real-Time Client Collaboration
   - 3.6 Invoices, Milestone Billing & Escrow Release
   - 3.7 Public Profile & Reputation Management
   - 3.8 Specialist Settings & Security
4. [Module 4: Admin Portal & System Governance Test Cases (TC-ADM)](#4-module-4-admin-portal--system-governance-test-cases-tc-adm)
   - 4.1 Admin Command Center & Real-Time KPIs
   - 4.2 User Management, Full Directory Search & Role Matrix
   - 4.3 Direct Status Toggles & Session Revocation
   - 4.4 Projects Oversight & Read-Only Workspace Inspection
   - 4.5 Financial Reports & Document Exporters
   - 4.6 Immutable Audit Logs & Telemetry
   - 4.7 Global Platform Settings & Maintenance Mode
5. [Module 5: Cross-Cutting Architectural & Backend Test Cases (TC-SYS)](#5-module-5-cross-cutting-architectural--backend-test-cases-tc-sys)
   - 5.1 Real-Time Firestore Synchronization
   - 5.2 Nodemailer SMTP OTP Dispatcher
   - 5.3 Cloudinary CDN Asset Handling
   - 5.4 Gemini 2.5 Flash / Pro AI Endpoints

---

# 1. Module 1: Authentication, Onboarding & Security Test Cases (TC-AUTH)

### TC-AUTH-001: Client Dedicated Login & Role Verification
- **Category**: Authentication & Redirection
- **Preconditions**: Valid client account exists in Firebase Auth and Firestore `users` collection.
- **Steps**:
  1. Navigate to `/login?role=client`.
  2. Enter client email and password.
  3. Click "Sign In".
- **Expected Result**: User is authenticated; system fetches user record from `users/{uid}`, verifies `role === 'client'`, and redirects immediately to `/client/dashboard`. No viewport flicker or blank screen occurs.
- **Bug/Issue Ref**: Issue #16
- **Status**: `[x] Passed`

---

### TC-AUTH-002: Specialist Dedicated Login & Role Redirection
- **Category**: Authentication & Redirection
- **Preconditions**: Valid symbiote account exists.
- **Steps**:
  1. Navigate to `/login?role=symbiote`.
  2. Enter specialist email and password.
  3. Click "Sign In".
- **Expected Result**: User is authenticated; system invalidates any stale `localStorage` mock role caches and redirects to `/symbiote/dashboard`.
- **Bug/Issue Ref**: Issue #15
- **Status**: `[x] Passed`

---

### TC-AUTH-003: Admin Dedicated Login & Strict Route Guarding
- **Category**: Authentication & RBAC
- **Preconditions**: Admin account with `role === 'admin'` exists.
- **Steps**:
  1. Navigate to `/login?role=admin`.
  2. Login with admin credentials.
  3. In a separate tab/window, attempt to access `/admin/dashboard` using a client or specialist account.
- **Expected Result**: Admin is granted access to `/admin/dashboard`. Non-admin accounts attempting access are blocked by `AdminRoute` guard and redirected to their respective dashboards with an access denial alert.
- **Bug/Issue Ref**: Architecture RBAC
- **Status**: `[x] Passed`

---

### TC-AUTH-004: Email OTP Verification Dispatch & Token Synchronization
- **Category**: Onboarding & Verification
- **Preconditions**: New user completes the signup form (`/signup`).
- **Steps**:
  1. Submit registration form with valid email.
  2. Check email inbox for 6-digit verification code sent via `POST /api/send-otp`.
  3. Enter 6-digit OTP into verification screen and submit.
- **Expected Result**: Backend verifies OTP via `POST /api/verify-otp`, updates Firestore `users/{uid}.emailVerified = true`, and synchronizes Firebase Auth native `emailVerified` token attribute without requiring logout/re-login.
- **Bug/Issue Ref**: Issue #12
- **Status**: `[x] Passed`

---

### TC-AUTH-005: Atomic Signup & Browser Refresh State Retention
- **Category**: Onboarding Resilience
- **Preconditions**: User is halfway through multi-step onboarding wizard.
- **Steps**:
  1. Fill step 1 (Basic Info) and step 2 (Role Details).
  2. Hard refresh browser window (Ctrl+R / Cmd+R) before submitting final step.
- **Expected Result**: Onboarding state is retained in encrypted session cache; user resumes exactly where they left off without session corruption or duplicate account creation.
- **Bug/Issue Ref**: Issue #13
- **Status**: `[x] Passed`

---

### TC-AUTH-006: Password Reset Flow with OTP & Real Firebase Auth Update
- **Category**: Auth Security
- **Preconditions**: Registered user forgot password.
- **Steps**:
  1. Navigate to `/forgot-password`.
  2. Enter email address and request reset OTP.
  3. Enter received OTP and input new password meeting complexity criteria.
  4. Submit "Update Password".
- **Expected Result**: Backend updates password directly in Firebase Auth via Admin SDK `updateUser()`. User can immediately log in with the new password; old password is fully invalidated.
- **Bug/Issue Ref**: Issue #11
- **Status**: `[x] Passed`

---

### TC-AUTH-007: Clean Logout & Session Invalidation
- **Category**: Session Management & Invalidation
- **Preconditions**: User is authenticated in any role session (client, symbiote, or admin).
- **Steps**:
  1. Click user avatar menu in header/sidebar.
  2. Click "Sign Out".
- **Expected Result**: Firebase Auth session signed out (`auth.signOut()`), all local storage keys (`syncsphere_user_session`, `syncsphere_mock_role`, `syncsphere_demo_mode`) and temporary verification sessions cleared, routing back to `/login` with clean state.
- **Status**: `[x] Passed`

---

# 2. Module 2: Client Portal Test Cases (TC-CLI)

## 2.1 Navigation & Dashboard KPIs

### TC-CLI-001: Client Dashboard Real-Time Metrics & Activity Feed
- **Category**: Dashboard KPI & Real-Time Sync
- **Preconditions**: Client is logged in with at least one active project and multiple team tasks.
- **Steps**:
  1. Navigate to `/client/dashboard`.
  2. Verify counters: Active Projects, Total Spend, Pending Tasks, Unread Notifications.
  3. Trigger an action in another session (e.g., mark a task done or receive a message).
- **Expected Result**: Dashboard KPI numbers accurately reflect live Firestore database state. Activity feed updates in real-time via `onSnapshot` listener without full page reload.
- **Bug/Issue Ref**: Checklist 1.B
- **Status**: `[x] Passed`

---

## 2.2 Project Creation & AI Scope Wizard

### TC-CLI-002: Project Creation with Gemini AI Brief Generation
- **Category**: Project Wizard & AI
- **Preconditions**: Client is logged in at `/client/projects/new`.
- **Steps**:
  1. Enter rough project title (e.g., "Build a Real-Time Logistics Tracking App").
  2. Click "Generate AI Scope / Brief".
  3. Inspect the AI-generated structured brief, recommended deliverables, and milestones.
  4. Select budget range, required skill tags, and deadline.
  5. Click "Publish Project".
- **Expected Result**: Express backend calls Gemini 2.5 API via `@google/genai` and populates the wizard fields. Upon publishing, document is created in `projects` collection with `status: 'open'` and an audit log is emitted.
- **Bug/Issue Ref**: Issue #10 & Checklist 1.C
- **Status**: `[x] Passed`

---

## 2.3 Talent Discovery, Invitations & AI Matching

### TC-CLI-003: Specialist Directory Search & Profile Drawer
- **Category**: Talent Discovery
- **Preconditions**: Specialist profiles exist in `users` collection.
- **Steps**:
  1. Navigate to `/client/talent`.
  2. Filter by skill tag "TypeScript", hourly rate "$50-$100", and rating "4.5+".
  3. Click on a specialist card to open the detailed profile drawer.
- **Expected Result**: Filtered specialists match criteria. Drawer displays verified badges, portfolio links, hourly rates, and client reviews accurately.
- **Bug/Issue Ref**: Checklist 1.D
- **Status**: `[x] Passed`

---

### TC-CLI-004: Direct Project Invitation to Specialist
- **Category**: Invitations
- **Preconditions**: Client has an open project; specialist profile drawer is open.
- **Steps**:
  1. Click "Invite to Project" in specialist drawer.
  2. Select active open project and enter custom message.
  3. Click "Send Invitation".
- **Expected Result**: Record is created in `invitations` collection with `status: 'pending'`, project ID, client ID, and specialist ID. Specialist receives a live notification.
- **Bug/Issue Ref**: Checklist 1.D
- **Status**: `[x] Passed`

---

### TC-CLI-005: AI Talent Matching Engine Live Evaluation (No Math Fallback)
- **Category**: AI Matching & Data Integrity
- **Preconditions**: Client navigates to `/client/projects/:id/match`.
- **Steps**:
  1. Open AI matching view for an open project.
  2. Trigger "Run AI Matching".
  3. Inspect candidate match scores and reasoning summaries.
- **Expected Result**: System routes query to Express backend `/api/ai/match-symbiotes` with project context and specialist vector profiles. AI generates genuine semantic match percentages and justifications. Hardcoded math formula (`98 - idx * 3`) is NOT executed.
- **Bug/Issue Ref**: Issue #41
- **Status**: `[x] Passed`

---

## 2.4 Proposals, Hiring & Team Role Allocation

### TC-CLI-006: Proposal Review, Specialist Hiring & Agreed Hourly Rate Assignment
- **Category**: Hiring & Team Role Assignment
- **Preconditions**: Specialist has submitted a proposal for client's project.
- **Steps**:
  1. Navigate to `/client/applications`.
  2. Filter by project and select a submitted proposal.
  3. Review cover letter, requested hourly rate, and portfolio.
  4. Click "Hire Specialist", select project role (e.g. Lead Dev, Designer, QA) and confirm agreed hourly rate.
- **Expected Result**: Specialist is added to `projects/{id}.teamMembers` with assigned role and agreed hourly rate; project status transitions to `in_progress`, proposal status becomes `accepted`, and specialist is immediately selectable in task creation.
- **Bug/Issue Ref**: Issue #17 & Issue #22
- **Status**: `[x] Passed`

---

## 2.5 Kanban Workspace & Task Lifecycle

### TC-CLI-007: Clean Kanban Workspace Zero-State (No Fake Auto-Seeded Tasks)
- **Category**: Workspace Data Integrity
- **Preconditions**: Client creates a brand new project with zero initial tasks.
- **Steps**:
  1. Navigate to `/client/workspace/:id` for the newly created project.
  2. Inspect the Kanban board columns (To Do, In Progress, Review, Done).
- **Expected Result**: Board displays a clean empty state with actionable CTAs ("Create Task", "AI Task Breakdown"). Synthetic tasks ("Integrate vLLM Streaming Endpoint", etc.) are NOT auto-injected into Firestore.
- **Bug/Issue Ref**: Issue #38
- **Status**: `[x] Passed`

---

### TC-CLI-008: Real-Time Kanban Drag-and-Drop & Task Status Transitions
- **Category**: Task Management & Real-Time Sync
- **Preconditions**: Active project workspace with multiple tasks created.
- **Steps**:
  1. Drag a task from "To Do" to "In Progress".
  2. Update task assignee, priority, and due date.
  3. Check specialist workspace in another window.
- **Expected Result**: Firestore `projects/{id}/tasks/{taskId}` updates instantly; specialist board reflects the new column placement and metadata without refresh.
- **Bug/Issue Ref**: Checklist 1.F
- **Status**: `[x] Passed`

---

## 2.6 Real-Time Chat & Cloudinary Attachments

### TC-CLI-009: Real-Time Messaging & Cloudinary CDN File Uploads
- **Category**: Communication & Storage
- **Preconditions**: Client and specialist have an active conversation.
- **Steps**:
  1. Navigate to `/client/messages`.
  2. Select active conversation and type a text message.
  3. Attach a PDF/Image file (drag-and-drop or file picker) and click Send.
- **Expected Result**: Text renders immediately with timestamp. File uploads to Cloudinary CDN via `/api/upload` and renders an interactive attachment preview with secure download link.
- **Bug/Issue Ref**: Checklist 1.G
- **Status**: `[x] Passed`

---

## 2.7 Files & Deliverables Management

### TC-CLI-010: Client File Repository & Specialist Deliverables Synchronization
- **Category**: Deliverables & Files Repository
- **Preconditions**: Specialist uploads a project deliverable in their workspace.
- **Steps**:
  1. Specialist submits a deliverable file in `/symbiote/workspace/:id`.
  2. Client navigates to `/client/files`.
  3. Filter by category "Deliverables".
  4. Click "Download" on the deliverable file.
- **Expected Result**: File appears in client's file repository because `clientId` is indexed properly. Clicking download triggers direct local file download with correct `Content-Disposition`.
- **Bug/Issue Ref**: Issue #37
- **Status**: `[x] Passed`

---

## 2.8 Time Tracking & Timesheet Approvals

### TC-CLI-011: Clean Timesheet Zero-State (No Fake Sample Time Entries)
- **Category**: Billing Integrity
- **Preconditions**: Client opens time tracking for a project with no hours logged.
- **Steps**:
  1. Navigate to `/client/time-tracking`.
  2. Inspect the timesheet table.
- **Expected Result**: Table shows clean zero hours ($0.00 spend). Hardcoded LoRA/AST 6.5h sample entries are NOT auto-injected.
- **Bug/Issue Ref**: Issue #39
- **Status**: `[x] Passed`

---

### TC-CLI-012: Timesheet Approval & Atomic Invoice Generation
- **Category**: Billing & Accounting
- **Preconditions**: Specialist submitted weekly hours against an active contract.
- **Steps**:
  1. Navigate to `/client/time-tracking` and select pending timesheet entries.
  2. Click "Approve Timesheet".
- **Expected Result**: Entries transition to `approved`, an atomic invoice is generated in `invoices` collection, and financial ledger is updated synchronously.
- **Bug/Issue Ref**: Issue #21
- **Status**: `[x] Passed`

---

## 2.9 Invoicing, Billing & Stripe Elements

### TC-CLI-013: Invoice PDF Generation & Payment Modal
- **Category**: Invoicing
- **Preconditions**: Unpaid invoice exists in `/client/invoices`.
- **Steps**:
  1. Navigate to `/client/invoices` and click on an invoice row.
  2. Click "Download PDF".
  3. Click "Pay Invoice".
- **Expected Result**: Clean printable PDF invoice layout opens. Payment modal mounts secure Stripe Elements (not plain text card inputs) to process payment.
- **Bug/Issue Ref**: Issue #42 & Checklist 1.J
- **Status**: `[x] Passed`

---

## 2.10 Specialist Reviews & Ratings

### TC-CLI-014: Project Completion Review Submission (No Demo Project Fallbacks)
- **Category**: Reviews & Ratings
- **Preconditions**: Client has at least one completed project (`status === 'completed'`).
- **Steps**:
  1. Navigate to `/client/reviews`.
  2. Verify project selection dropdown only lists real completed projects owned by client (no `proj-demo-1` or `client-demo` IDs).
  3. Submit 5-star ratings across Communication, Quality, Timeliness, and Expertise with written feedback.
- **Expected Result**: Review is saved in `reviews` collection; specialist's aggregate rating score updates automatically.
- **Bug/Issue Ref**: Issue #40
- **Status**: `[x] Passed`

---

## 2.11 Client Company Settings

### TC-CLI-015: Company Profile & Cloudinary Logo Upload
- **Category**: Profile & Settings
- **Preconditions**: Client is logged in at `/client/settings/company`.
- **Steps**:
  1. Update company name, website, and bio.
  2. Upload new company logo image.
  3. Click "Save Changes".
- **Expected Result**: Logo is uploaded to Cloudinary CDN, URL is stored in `users/{uid}.companyInfo.logoUrl`, and updates reflect across topbar and client documents immediately.
- **Bug/Issue Ref**: Checklist 1.L
- **Status**: `[x] Passed`

---

# 3. Module 3: Symbiote (Freelancer) Portal Test Cases (TC-SYM)

## 3.1 Specialist Dashboard & Earnings Overview

### TC-SYM-001: Specialist Earnings Calculation & Balance Ledger
- **Category**: Earnings & Ledger
- **Preconditions**: Specialist has completed contracts and funded escrow milestones.
- **Steps**:
  1. Navigate to `/symbiote/dashboard` and `/symbiote/earnings`.
  2. Inspect Total Earned, In Escrow, and Available for Withdrawal balances.
- **Expected Result**: Balances reflect exact summation of real approved invoices and escrow records (not synthetic multiplier estimates).
- **Bug/Issue Ref**: Issue #21 & Checklist 2.B
- **Status**: `[x] Passed`

---

## 3.2 Marketplace Browse & AI Proposal Submission

### TC-SYM-002: Project Marketplace Search & Gemini AI Proposal Drafting
- **Category**: Marketplace & AI Proposals
- **Preconditions**: Open projects exist in the marketplace and specialist has active subscription.
- **Steps**:
  1. Navigate to `/symbiote/browse`.
  2. Search by keyword and apply budget/skill filters.
  3. Open project specification view `/symbiote/browse/:id`.
  4. Click "Generate AI Proposal Pitch".
  5. Review AI draft, confirm estimated delivery timeline, and submit application directly at the project budget.
- **Expected Result**: AI creates a context-aware proposal pitch based on specialist skills and project requirements without prompting for competitive bidding or rate negotiation. Submitted application creates record in `applications` collection.
- **Bug/Issue Ref**: Checklist 2.C
- **Status**: `[x] Passed`

---

### TC-SYM-002B: Specialist Subscription Gate & Zero-Bidding Direct Application
- **Category**: Subscription & Direct Applications
- **Preconditions**: Specialist views an open project at `/symbiote/browse/:id`.
- **Steps**:
  1. Navigate to an open project as a specialist without an active subscription.
  2. Verify that the Subscription Gate Card is displayed ("Specialist Subscription Required") and bidding input fields are completely removed.
  3. Click "Activate Specialist Subscription" to activate test membership.
  4. Verify the active subscription badge renders and direct application form unlocks.
  5. Fill out cover letter and delivery timeline (with project budget automatically populated) and click "Submit Application".
- **Expected Result**: Application is submitted to Firestore without bidding fields; client receives application tied to project's fixed budget.
- **Bug/Issue Ref**: Subscription Direct Apply
- **Status**: `[x] Passed`

---

### TC-SYM-003: Project Invitation Acceptance & Contract Auto-Initiation
- **Category**: Invitations & Contracts
- **Preconditions**: Client sent an invitation to specialist.
- **Steps**:
  1. Navigate to `/symbiote/invitations`.
  2. Locate pending invitation and click "Accept Invitation".
- **Expected Result**: Invitation status updates to `accepted`, project moves to `in_progress`, and contract document is auto-initialized linking client and specialist.
- **Bug/Issue Ref**: Issue #22
- **Status**: `[x] Passed`

---

## 3.3 Active Workspace & Milestone Deliverables

### TC-SYM-004: Specialist Milestone Deliverable Submission & Task Hour Summary
- **Category**: Deliverables & Milestones
- **Preconditions**: Specialist is working in an active project workspace `/symbiote/workspace/:id`.
- **Steps**:
  1. Open Milestone 1 tab.
  2. Complete assigned tasks and ensure hours are logged.
  3. Upload final deliverable files and attach GitHub repository link / summary notes.
  4. Click "Submit Milestone for Client Review".
- **Expected Result**: Milestone status updates to `submitted`, deliverables are indexed in `project_files`, and client receives notification to review tasks and approve milestone.
- **Bug/Issue Ref**: Issue #18 & Issue #37
- **Status**: `[ ] Pending`

---

## 3.4 Live Stopwatch & Manual Time Tracking

### TC-SYM-005: Interactive Live Stopwatch & Task `actualTotalHours` Real-Time Binding
- **Category**: Time Tracking & Task Binding
- **Preconditions**: Specialist opens `/symbiote/time-tracking` on a project with assigned tasks.
- **Steps**:
  1. Select active project and choose specific assigned task from dropdown.
  2. Click "Start Timer ▶️".
  3. Allow timer to run for a duration, then click "Stop & Log Time".
  4. Inspect the task card in Kanban workspace.
- **Expected Result**: Time record is saved to Firestore `time_entries` and atomically increments the task document's `actualTotalHours`. Kanban card displays updated hours vs. estimated hours.
- **Bug/Issue Ref**: Issue #21 & Checklist 2.E
- **Status**: `[ ] Pending`

---

## 3.5 Real-Time Client Collaboration

### TC-SYM-006: Specialist Real-Time Chat & Code Snippet Formatting
- **Category**: Messaging
- **Preconditions**: Specialist is logged in at `/symbiote/messages`.
- **Steps**:
  1. Open active client conversation.
  2. Send markdown-formatted text containing a code snippet and file attachment.
- **Expected Result**: Message formats code blocks cleanly with syntax styling and renders file attachment preview in real time.
- **Bug/Issue Ref**: Checklist 2.F
- **Status**: `[ ] Pending`

---

## 3.6 Invoices, Milestone Billing & External Payment Proof

### TC-SYM-007: Milestone Approval, Itemized Invoice & External Payment Settlement
- **Category**: Invoicing & Off-Platform Settlement
- **Preconditions**: Milestone tasks are approved by client.
- **Steps**:
  1. Client approves all tasks in milestone, generating an itemized invoice with specialist's banking details.
  2. Client submits off-platform payment (Wire/PayPal/Wise) and uploads payment proof.
  3. Specialist navigates to `/symbiote/invoices`, views proof, and clicks "Confirm Payment Received ✅".
- **Expected Result**: Invoice status transitions to `paid`, milestone marks as fully settled, and earnings summary updates.
- **Bug/Issue Ref**: Issue #18 & Checklist 2.G
- **Status**: `[ ] Pending`

---

## 3.7 Public Profile & Reputation Management

### TC-SYM-008: Specialist Profile Customization & Reciprocal Review
- **Category**: Reputation & Profile
- **Preconditions**: Completed project between client and specialist.
- **Steps**:
  1. Navigate to `/symbiote/profile` and update bio, hourly rate, and portfolio items.
  2. Navigate to `/symbiote/reviews` and submit feedback for the client.
- **Expected Result**: Profile updates persist in `users/{uid}` and reflect on public talent search. Reciprocal review is recorded in `reviews` collection.
- **Bug/Issue Ref**: Issue #19 & Checklist 2.H
- **Status**: `[ ] Pending`

---

## 3.8 Specialist Settings & Security

### TC-SYM-009: Specialist Account Security & Availability Toggle
- **Category**: Settings
- **Preconditions**: Specialist is logged in at `/symbiote/settings`.
- **Steps**:
  1. Toggle availability status from "Available for Work" to "Busy".
  2. Update password and notification preferences.
- **Expected Result**: Availability badge updates in real-time across talent directory; password and notification preferences update securely.
- **Bug/Issue Ref**: Checklist 2.I
- **Status**: `[ ] Pending`

---

# 4. Module 4: Admin Portal & System Governance Test Cases (TC-ADM)

## 4.1 Admin Command Center & Real-Time KPIs

### TC-ADM-001: Executive Dashboard Live Metrics & System Health Ping
- **Category**: Admin Dashboard & Telemetry
- **Preconditions**: Admin is logged in at `/admin/dashboard`.
- **Steps**:
  1. Inspect platform KPIs: Total Users, Active Projects, GMV, Escrow Volume.
  2. Inspect System Health indicators (Server, Auth, CDN, Database).
- **Expected Result**: KPIs match database aggregations (`getCountFromServer`). System Health displays real `/api/health` connectivity status instead of static `'not_monitored'` strings.
- **Bug/Issue Ref**: Issue #43 & Checklist 3.B
- **Status**: `[ ] Pending`

---

## 4.2 User Management, Full Directory Search & Role Matrix

### TC-ADM-002: Full-Directory User Search & Pagination Integrity
- **Category**: User Management
- **Preconditions**: Database contains more than 20 registered users across various roles.
- **Steps**:
  1. Navigate to `/admin/users`.
  2. Search for a user whose name is located on page 3 or beyond.
  3. Apply role filter ("Client" / "Symbiote" / "Admin").
- **Expected Result**: Search queries full Firestore user collection across all pages (not restricted to initial 20 loaded records). Role filters isolate target accounts accurately.
- **Bug/Issue Ref**: Issue #27 & Checklist 3.C
- **Status**: `[ ] Pending`

---

### TC-ADM-003: User Table Column Sanitation (No Raw Technical Document IDs)
- **Category**: UI Ergonomics
- **Preconditions**: Admin views user table `/admin/users`.
- **Steps**:
  1. Inspect table headers and data columns.
- **Expected Result**: Table displays clean user avatar, full name, email, role badge, status badge, and joined date. Raw 28-character Firestore UUID column is removed or truncated into a subtle tooltip.
- **Bug/Issue Ref**: Issue #28
- **Status**: `[ ] Pending`

---

## 4.3 Direct Status Toggles & Session Revocation

### TC-ADM-004: Direct Active / Inactive Status Toggle & Button Label Accuracy
- **Category**: User Moderation
- **Preconditions**: Admin views user list with active and suspended accounts.
- **Steps**:
  1. Inspect status button on an active user (verify button reads "Suspend" / "Deactivate", NOT "Reactivate").
  2. Click status toggle to suspend the user.
- **Expected Result**: User `status` updates to `suspended` in Firestore. Button label flips correctly to "Reactivate".
- **Bug/Issue Ref**: Issue #30 & Issue #31
- **Status**: `[ ] Pending`

---

### TC-ADM-005: Real-Time Firebase Auth Session Revocation on Suspension
- **Category**: Auth Security & Moderation
- **Preconditions**: Active user is logged into their dashboard in another browser.
- **Steps**:
  1. Admin suspends the user account via `/admin/users`.
  2. Suspended user attempts to perform an action (e.g., send message or create project) in their active session.
- **Expected Result**: Backend invokes Firebase Admin `revokeRefreshTokens(uid)`. Client app detects suspended status on next token refresh, invalidates session, and forces redirect to login with a suspension notice.
- **Bug/Issue Ref**: Issue #25
- **Status**: `[ ] Pending`

---

## 4.4 Projects Oversight & Read-Only Workspace Inspection

### TC-ADM-006: Super-Admin Read-Only Workspace Inspection (No Session Collision)
- **Category**: Project Oversight
- **Preconditions**: Admin inspects an active project in `/admin/projects`.
- **Steps**:
  1. Open project inspection modal.
  2. Click "Inspect Live Workspace (Read-Only)".
  3. Review Kanban board and team deliverables.
  4. Return to Admin dashboard.
- **Expected Result**: Workspace renders in a secure read-only mode for admin. Admin's session is NOT logged out or overwritten by client/specialist session state. Technical raw UUIDs in modal headers are cleanly formatted.
- **Bug/Issue Ref**: Issue #32 & Issue #33
- **Status**: `[ ] Pending`

---

## 4.5 Financial Reports & Document Exporters

### TC-ADM-007: Analytics Report Generation (CSV, PDF & Excel Exports)
- **Category**: Financial Analytics & Reporting
- **Preconditions**: Admin navigates to `/admin/reports` and `/admin/analytics`.
- **Steps**:
  1. Select date range and generate a Platform Financial Summary.
  2. Click "Export CSV".
  3. Click "Export PDF".
  4. Click "Export Excel (.xlsx)".
- **Expected Result**: All three export options generate clean, formatted report files containing revenue, platform fees, and transaction ledgers without runtime errors.
- **Bug/Issue Ref**: Issue #35 & Checklist 3.E
- **Status**: `[ ] Pending`

---

## 4.6 Immutable Audit Logs & Telemetry

### TC-ADM-008: Immutable Audit Logs Search & Filter Validation
- **Category**: Security & Compliance
- **Preconditions**: Audit events exist in `audit_logs` collection.
- **Steps**:
  1. Navigate to `/admin/audit-logs`.
  2. Filter by Severity ("Warning" / "Error" / "Info") and Action ("AUTH_LOGIN", "PROJECT_CREATE", etc.).
  3. Attempt an unauthorized direct write/edit to an audit log document via client SDK.
- **Expected Result**: Logs filter accurately with timestamps and actor details. Direct write attempts are blocked by Firestore security rules (audit logs are write-only by server).
- **Bug/Issue Ref**: Checklist 3.F
- **Status**: `[ ] Pending`

---

## 4.7 Global Platform Settings & Maintenance Mode

### TC-ADM-009: Platform Commission Rate Update & Maintenance Lockdown
- **Category**: Platform Governance
- **Preconditions**: Admin is logged in at `/admin/settings`.
- **Steps**:
  1. Update platform commission fee percentage (e.g., from 10% to 12.5%).
  2. Toggle "Maintenance Mode" to ON and save.
  3. In a separate incognito window, attempt to access `/client/dashboard` or `/symbiote/dashboard`.
- **Expected Result**: Platform settings update in `platform_settings` collection. Non-admin users are shown a clean Maintenance Mode banner; admin remains able to manage the platform.
- **Bug/Issue Ref**: Checklist 3.G
- **Status**: `[ ] Pending`

---

### TC-ADM-010: Admin Profile Tab Freelancer Fields Sanitization
- **Category**: Admin Profile UI
- **Preconditions**: Admin views personal settings tab `/admin/settings` (Profile Tab).
- **Steps**:
  1. Inspect profile form fields.
- **Expected Result**: Form displays only relevant admin fields (Admin Name, Staff Email, Security Credentials). Freelancer-specific fields (Hourly Rate, Skills Tags, Portfolio Links) are absent.
- **Bug/Issue Ref**: Issue #36
- **Status**: `[ ] Pending`

---

# 5. Module 5: Cross-Cutting Architectural & Backend Test Cases (TC-SYS)

### TC-SYS-001: Dual Firestore DB Unification on `(default)` Instance
- **Category**: Database Architecture
- **Preconditions**: Database read and write operations across all portals.
- **Steps**:
  1. Monitor Firestore connections in developer tools / network console during navigation across Client, Symbiote, and Admin portals.
- **Expected Result**: All services query the unified `(default)` Firestore database instance. No split reads/writes occur to secondary or named database instances.
- **Bug/Issue Ref**: Issue #8
- **Status**: `[ ] Pending`

---

### TC-SYS-002: Nodemailer SMTP Real Email Transmission & Template Delivery
- **Category**: Email Infrastructure
- **Preconditions**: Valid `SMTP_USER` and `SMTP_PASS` configured in environment.
- **Steps**:
  1. Trigger an OTP request, invitation notification, or invoice alert.
  2. Inspect delivery logs on the Express server.
- **Expected Result**: Nodemailer sends HTML-styled emails with correct branding; secret passwords are loaded exclusively from environment variables (never committed to markdown docs).
- **Bug/Issue Ref**: Issue #10 & Security Audit
- **Status**: `[ ] Pending`

---

### TC-SYS-003: Public Landing Page Live Aggregation Counters (No 12/34 Hardcoded Stats)
- **Category**: Public Landing & Transparency
- **Preconditions**: Public visitor navigates to root URL `/`.
- **Steps**:
  1. Scroll to the interactive platform preview mockup (`#mockup`).
  2. Inspect active projects and registered specialist count badges.
- **Expected Result**: Counts reflect real server-aggregated numbers (`getCountFromServer`) or dynamic onboarding metrics, replacing hardcoded fallback numbers (12 projects / 34 symbiotes).
- **Bug/Issue Ref**: Issue #44
- **Status**: `[ ] Pending`

---

### TC-SYS-004: Server-Side Gemini 2.5 AI Endpoint Security & Lazy Init
- **Category**: AI Security & Architecture
- **Preconditions**: Server initialized without exposing `GEMINI_API_KEY` to client browser.
- **Steps**:
  1. Inspect client network payload on AI-assisted screens.
  2. Verify API calls route to server `/api/*` endpoints.
- **Expected Result**: All Gemini AI prompts run server-side via `@google/genai`; API keys are never exposed in browser bundle or DevTools network headers.
- **Bug/Issue Ref**: Full-Stack Guidelines
- **Status**: `[ ] Pending`

---

# 📊 QA Test Execution Summary Dashboard

| Module / Scope | Total Test Cases | Passed (`[x]`) | Pending (`[ ]`) | Critical Bugs Cross-Referenced |
|---|---|---|---|---|
| **1. Authentication & Security (TC-AUTH)** | 6 | 0 | 6 | Issues #11, #12, #13, #15, #16 |
| **2. Client Portal (TC-CLI)** | 15 | 0 | 15 | Issues #10, #17, #21, #22, #37, #38, #39, #40, #41, #42 |
| **3. Symbiote Portal (TC-SYM)** | 9 | 0 | 9 | Issues #18, #19, #21, #22, #23, #37, #38, #39 |
| **4. Admin Portal (TC-ADM)** | 10 | 0 | 10 | Issues #25, #27, #28, #30, #31, #32, #33, #35, #36, #43 |
| **5. System & Architecture (TC-SYS)** | 4 | 0 | 4 | Issues #8, #10, #44 |
| **TOTALS** | **44 Detailed Test Cases** | **0** | **44** | **44 Open Bug Tracker Issues Mapped** |
