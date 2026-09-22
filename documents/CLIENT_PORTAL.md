# Client Portal Specification & User Workflows

The Client Portal provides business owners, technical managers, and project leaders with tools to create projects, discover talent, review proposals, orchestrate active workspaces, and settle invoices.

---

## 1. Page Inventory

| Route | Component | Key Features |
| :--- | :--- | :--- |
| `/client/dashboard` | `ClientDashboardPage.tsx` | Metric cards (Active Projects, Total Spend, Pending Proposals), quick project launcher, recent chat feed, and live status summary. |
| `/client/projects` | `ClientProjectsPage.tsx` | Tabbed project manager (All, Draft, Open, In Progress, Completed), search, status badges, and project action menus. |
| `/client/projects/:id` | `ProjectDetailsPage.tsx` | Comprehensive project control center with 6 dedicated tabs: Overview, Progress, Milestones, Workspace, Team, and Files. |
| `/client/projects/new/step-1` | `CreateProjectStep1Page.tsx` | Project Title, Category, Scope Definition, and Draft Autosaving. |
| `/client/projects/new/step-2` | `CreateProjectStep2Page.tsx` | Required Skills selection, Experience level requirements, and Deliverables checklist. |
| `/client/projects/new/step-3` | `CreateProjectStep3Page.tsx` | Budgeting (Fixed Price vs Hourly Rate), Milestone payment schedules, and Delivery timeline. |
| `/client/projects/new/step-4` | `CreateProjectStep4Page.tsx` | Project preview, AI Brief polisher, Terms confirmation, and one-click publishing. |
| `/client/find-talent` | `FindTalentPage.tsx` | Filterable talent directory by hourly rate, skills, minimum rating, and availability with direct invite modals. |
| `/client/professionals/:id` | `ProfessionalProfilePage.tsx` | In-depth freelancer profile inspection with portfolio tabs, completed contracts, client reviews, and direct hire actions. |
| `/client/ai-matching` | `AIMatchingPage.tsx` | AI-driven semantic talent recommender that ranks prospective symbiotes against active project briefs with match percentage scores. |
| `/client/applications` | `ApplicationsPage.tsx` | Proposal review pipeline: Shortlist, Chat, Reject, or Hire candidates directly into project workspaces. |
| `/client/workspace` / `/client/projects/:id/workspace` | `WorkspaceKanbanPage.tsx` | Real-time project collaboration board with Milestones, Kanban Tasks (To Do, In Progress, Review, Completed), task deliverable approval, change requests, and automated invoice triggers. |
| `/client/time-tracking` | `TimeTrackingPage.tsx` | Contractor timesheet approval panel: Review hours logged, approve entries, and dispute discrepancies. |
| `/client/invoices` | `InvoiceManagementPage.tsx` | Invoice review, PDF invoice export, payment processing, and transaction history. |
| `/client/messages` | `MessagingPage.tsx` | Full-screen multi-channel messaging suite with attachment uploads and typing indicators. |
| `/client/reviews` | `ClientReviewsPage.tsx` | View feedback received from symbiotes and manage pending review submissions. |
| `/client/reviews/new` | `LeaveReviewPage.tsx` | 5-star rating submission form with skill endorsement tags and public commentary. |
| `/client/files` | `FilesAndDocsPage.tsx` | Consolidated document vault across all client projects. |
| `/client/settings/*` | `EditProfilePage.tsx` | Profile info, company details, billing preferences, notification settings, and password updates. |

---

## 2. Deep Dive: 4-Step Project Creation Wizard

```
Step 1: Basics ──► Step 2: Skills & Scope ──► Step 3: Budget & Terms ──► Step 4: AI Polish & Launch
  - Project Title    - Primary Category          - Fixed vs Hourly         - Gemini AI Scope Refinement
  - Brief Summary    - Skill Tags Selector       - Estimated Budget        - Full Spec Review
  - Target Industry  - Seniority Level           - Milestones Setup        - Publish to Marketplace
```

### Auto-Draft Persistence
* Every step automatically synchronizes form state to `localStorage` and optionally creates a `status: 'draft'` document in Firestore so clients never lose their progress on reload.
* Step 4 includes a **"Enhance with Gemini AI"** action that analyzes the rough draft and suggests clear acceptance criteria, milestone breakdowns, and optimal budget ranges.

---

## 3. AI Semantic Talent Matching (`AIMatchingPage.tsx`)

1. **Input Selection**: Client selects any active or draft project.
2. **Analysis**: Client clicks **"Find Best AI Matches"**.
3. **Execution**: The Express backend sends the project requirements alongside talent profiles to Gemini.
4. **Output Display**:
   * **Overall Match Score** (e.g. `96% Match`).
   * **Key Strengths**: Bullet points highlighting matching skills and domain experience.
   * **One-Click Actions**: "Send Direct Invitation", "Start Chat", or "View Full Profile".

---

## 4. Simplified 4-Step Project Execution & Payment Cycle

To ensure transparency, eliminate confusion, and keep financial timing synchronized with technical progress, the project lifecycle operates on a strict, direct 4-step execution flow:

```
[ Step 1: Task & Time Logging ]
  • Specialist executes task on Kanban board.
  • Specialist tracks working hours with live timer/timesheet sessions.
  • Specialist submits task for review with deliverable notes and artifacts.
       │
       ▼
[ Step 2: Workspace Review & Approvals Queue ]
  • Client receives notification and sees pending review badge on Workspace tab.
  • Client accesses the dedicated "Approvals Queue" directly inside the Workspace tab.
  • Client inspects deliverable notes, logged sessions, and verified hourly cost.
  • Client either requests revisions (returns to in-progress) or approves the task.
  • Approving a task automatically verifies & approves all associated time entries.
       │
       ▼
[ Step 3: Automated Milestone Deliverable Invoice ]
  • When all tasks in a milestone are completed and approved, an automated invoice is generated.
  • The invoice reflects exact approved deliverable hours or agreed milestone amounts.
       │
       ▼
[ Step 4: Direct Invoice Settlement & Payment ]
  • Client reviews the final milestone invoice in the Invoices tab and processes payment.
  • No escrow deposit, advance funding locks, or upfront financial escrow holding is required.
```

### Key Architectural Enforcements:
* **No Escrow / No Advance Funding**: All escrow and advance lock mechanisms are removed. Payment directly tracks verified deliverable milestones.
* **Workspace Integrated Approvals**: The Approvals Queue is directly accessible inside the `Workspace` tab (with a dual Kanban Board / Approvals Queue view switcher and real-time badge counters).
* **Client-Only Authority**: Freelancers/Specialists cannot mark tasks as `completed` directly; they can only submit tasks for client review. Only the client holds approval authority.
* **Auto-Approval of Time**: When a client approves a task deliverable, all pending `time_entries` tied to that task are automatically approved in real time.

