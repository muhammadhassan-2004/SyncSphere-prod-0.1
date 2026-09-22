# Symbiote (Freelancer) Portal Specification & Workflows

The Symbiote Portal enables freelancers, AI developers, and technical contractors to discover high-value projects, apply directly with AI-assisted proposals via active specialist subscription, collaborate in active workspaces, log hours, and manage billing.

---

## 1. Page Inventory

| Route | Component | Key Features |
| :--- | :--- | :--- |
| `/symbiote/dashboard` | `SymbioteDashboardPage.tsx` | Overview of Active Contracts, Earnings to date, Pending Invitations count, Average Rating, and Quick Action cards. |
| `/symbiote/browse` | `SymbioteBrowseProjectsPage.tsx` | Marketplace feed with multi-facet filters: Category, Budget Type (Fixed/Hourly), Minimum Budget, Skills, and keyword search. |
| `/symbiote/browse/:id` | `SymbioteProjectDetailPage.tsx` | Detailed project specification view with client information, subscription verification gate, direct proposal submission, and AI proposal generator. |
| `/symbiote/invitations` | `SymbioteInvitationsPage.tsx` | Direct project invitations received from clients with Accept, Decline, and Chat actions. |
| `/symbiote/projects` | `SymbioteProjectsPage.tsx` | Active, completed, and pending contracts with milestone progress and direct links to workspaces. |
| `/symbiote/workspace/:id` | `SymbioteWorkspacePage.tsx` | Full collaboration workspace with 4 interactive tabs: Tasks (Kanban), Milestones, Files, and Team Updates. |
| `/symbiote/time-tracking` | `SymbioteTimeTrackingPage.tsx` | Live stop-watch timer, manual hour submission, milestone linkage, and weekly hour summaries. |
| `/symbiote/invoices` | `SymbioteInvoicesPage.tsx` | Create milestone or hourly invoices, track payment status (Draft, Pending, Paid, Overdue), and export receipts. |
| `/symbiote/earnings` | `SymbioteEarningsPage.tsx` | Financial analytics: Monthly revenue breakdown, payout status, pending receivables, and top-paying clients. |
| `/symbiote/reviews` | `SymbioteReviewsPage.tsx` | Feedback and ratings received from clients with detailed skill ratings and breakdown. |
| `/symbiote/profile` | `SymbioteProfilePage.tsx` | Editable public portfolio: Hourly rate, Bio, Skills tags, Portfolio items, Certifications, and Experience. |
| `/symbiote/messages` | `SymbioteMessagingPage.tsx` | Real-time direct chat with clients, file attachment sharing, and unread notification badges. |
| `/symbiote/settings` | `SymbioteSettingsPage.tsx` | Profile settings, notification preferences, payout accounts, and password updates. |

---

## 2. Subscription-Based Direct Application Model

Instead of competitive price bidding or quoting custom rates, PreSync operates on a **Specialist Subscription** model:
- **Zero Bidding / No Price Wars**: Specialists do not submit bids or negotiate hourly rates per project. Applications directly accept the client's defined project scope and budget.
- **Subscription Required**: An active specialist membership is required to unlock direct application submissions.
- **Unlimited Applications**: Subscribed specialists can apply directly to any open project in the marketplace.

```
[Project Brief + Scope] + [Symbiote Profile & Past Work]
                           │
                           ▼
             [Specialist Subscription Check]
             (Active Membership Grants Access)
                           │
                           ▼
             [Gemini 2.5 Flash Backend Prompt]
                           │
                           ▼
          [Tailored Cover Letter & Milestone Plan]
                           │
                           ▼
  [Symbiote Reviews Pitch, Delivery Timeline, & Submits Directly]
```

### Generated Proposal Structure
1. **Executive Hook**: Contextual acknowledgement of the client's problem.
2. **Relevant Experience**: Alignment of symbiote's past projects with requested tech stack.
3. **Execution Plan**: Proposed milestone sequence with deliverables.
4. **Estimated Timeline & Quality Commitment**: Delivery timeframe and technical approach.

---

## 3. Real-Time Workspace (`SymbioteWorkspacePage.tsx`)

Each active contract features a dedicated workspace powered by real-time Firestore listeners:
* **Kanban Task Board**: Follows the strict Upwork-style task lifecycle:
  1. **To Do (`todo`)**: Initial backlog managed for the active milestone.
  2. **In Progress (`in_progress`)**: Active work with time tracking.
  3. **In Review (`review`)**: Specialist submits finished tasks for formal Client review with notes/PR deliverables. Specialists cannot mark tasks directly as Done.
  4. **Completed / Done (`completed`)**: Client reviews and clicks "Approve" (or requests changes back to `in_progress`).
* **Milestone Progress Tracker**: Milestones aggregate approved tasks. When all tasks belonging to a milestone are approved by the client, the milestone completes automatically.
* **Auto-Invoicing Engine**: Upon client approval of a milestone's tasks, an itemized invoice is automatically generated and issued to the client with real-time notifications.
* **File Vault**: Upload project deliverables, code assets, and design files (integrated with Cloudinary & Firebase Storage).
* **Live Status Feed**: Post technical progress updates visible to the client in real time.

---

## 4. Task Review, Approval & Auto-Invoicing Workflow

```
[Specialist Works on Task] ──► [Submit for Review with Notes/PR]
                                             │
                                             ▼
                                   [Status: 'review']
                                             │
                                             ▼
                                [Client Inspects Deliverable]
                                  /                         \
                          [Request Changes]             [Approve Task]
                                 │                            │
                                 ▼                            ▼
                      [Back to 'in_progress']        [Status: 'completed']
                                                              │
                                                              ▼
                                              [All Milestone Tasks Done?]
                                                              │
                                                              ▼
                                            [Milestone Completed & Auto-Invoice Generated]
```
