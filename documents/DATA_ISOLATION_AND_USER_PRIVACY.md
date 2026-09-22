# Data Isolation, Privacy & Access Control Specification

**Document Version:** 1.0.0  
**Status:** Approved Architecture Standard  
**Target Platform:** SyncSphere Multi-Tenant Ecosystem (Web Client & Cloud Firestore)  
**Maintained By:** Project Architecture & Security Engineering Team  

---

## 1. Executive Summary & Zero-Trust Foundation

SyncSphere operates on a **Zero-Trust Multi-Tenant Architecture**. In this model, every incoming data request, search query, real-time listener, and route navigation must verify that the requesting authenticated user has explicit, verifiable entitlement to access the requested resource.

No component may assume that possessing a resource identifier (`projectId`, `conversationId`, `invoiceId`, etc.) grants authorization to view or mutate that resource.

### 1.1 Core Tenets
1. **Frontend Role & Scope Partitioning:** Client components must never subscribe to platform-wide collections and filter client-side in browser memory. Queries must be scoped to the authenticated user's ID at the query level.
2. **Double-Barrier Route Protection:** High-level route guards (`ProtectedRoute`) verify global roles (`client`, `symbiote`, `admin`), while individual detail pages verify fine-grained resource ownership or assignment before rendering.
3. **Graceful 403 Access Denied UX:** If a user navigates to an unauthorized URL, the application must display a clear, brand-aligned "Access Denied / 403" state with safe navigation paths rather than leaking blank shells or unauthorized records.
4. **Backend Firestore Rule Hardening:** Database security rules must mirror frontend access policies so direct API or client-SDK tampering is blocked at the database engine level.
5. **Anti-Regression Safeguards:** Privacy enhancements must not alter, degrade, or revert existing validated features (e.g., telephone validation, authentication prefill prevention, multi-step project creation wizard, real-time status reconciliation).

---

## 2. Multi-Role Data Isolation Matrix (Who Can See What)

| Resource Collection / Page | Public / Unauth | Client User | Symbiote (Freelancer) | Admin |
| :--- | :--- | :--- | :--- | :--- |
| **Public Marketplace Jobs** | View basic metadata | View all open jobs | View & apply to all open jobs | Full oversight |
| **Client Private Drafts** | ❌ Blocked | View & edit ONLY own drafts | ❌ Blocked | Full oversight |
| **In-Progress Project Details** | ❌ Blocked | View & manage ONLY own projects | ❌ Blocked (unless assigned/team) | Full oversight |
| **Project Workspace (Milestones/Tasks)** | ❌ Blocked | View ONLY own project workspaces | View ONLY assigned project workspaces | Full oversight |
| **Global Search Bar** | ❌ Blocked | Search ONLY own projects & Talent | Search ONLY assigned projects & Open jobs | Search all platform records |
| **Job Applications & Proposals** | ❌ Blocked | View applications on own projects | View ONLY own submitted applications | Full oversight |
| **Project Files & Docs** | ❌ Blocked | View files of own projects | View files of assigned projects only | Full oversight |
| **Time Tracking Dropdown** | ❌ Blocked | View time entries on own projects | Log time ONLY for assigned projects | Full oversight |
| **Invoices & Financial Records** | ❌ Blocked | View ONLY own billed invoices | View ONLY own payout invoices | Full oversight |
| **Direct Messaging Channels** | ❌ Blocked | Access ONLY joined conversations | Access ONLY joined conversations | Audit log oversight |
| **Contracts & E-Signatures** | ❌ Blocked | View ONLY contracts for own projects | View ONLY contracts for assigned jobs | Full oversight |

---

## 3. Component-by-Component Isolation Specifications

### 3.1 Global Search Bar (`GlobalSearchBar.tsx`) — Deactivated & Hidden
* **Status**: ⚪ Deactivated & Hidden Across All Portals per User Architecture Directive (2026-09-18).
* **Implementation Details**:
  * Removed from top navigation header in `PortalShell.tsx` (replaced with a flex-1 spacer to preserve notification and profile alignment).
  * `GlobalSearchBar.tsx` includes an immediate render short-circuit (`if (HIDE_GLOBAL_SEARCH) return null;`) preventing any DOM presence or Firestore listeners.
  * Role-scoping logic (`subscribeToSearchProjects`) is preserved within the codebase for zero-trust compliance should search be re-enabled in a future release.
* **Original Problem Identified:** Component previously called `subscribeToProjects()`, fetching all 16 platform projects without checking user role or ownership.
* **Specification (Preserved for Future Re-enablement):**
  * **For Clients:** 
    * Query source: `subscribeToProjectsByOwner(clientId)` + Verified Freelancers directory.
    * Results restricted to projects created by the logged-in client.
    * Allows search by `title`, `description`, `skills`, and `status` (including completed projects).
  * **For Symbiotes:**
    * Query source: `subscribeToProjectsBySymbiote(uid)` + Open Marketplace jobs (`status === 'open'`).
    * Results must never disclose unassigned clients' draft, in-progress, or completed projects.
  * **For Admins:**
    * Unrestricted cross-platform search across all projects, users, and audit records.

---

### 3.2 Client Project Details (`ProjectDetailsPage.tsx`)
* **Problem Identified:** Any client entering `/client/projects/:projectId` could view another client's milestones, team members, budget notes, and complete the project.
* **Specification:**
  * Component must verify ownership upon resolving the project record:
    ```typescript
    const isOwner = project.clientId === currentUserId || project.ownerId === currentUserId;
    ```
  * If `isOwner === false` (and user is not an Admin):
    * Halt real-time subcollection listeners immediately.
    * Render `<UnauthorizedAccessCard />` stating: *"You do not have authorization to view this project. If you believe this is an error, please contact platform support."*
    * Provide a direct CTA button: `[Back to My Projects]`.

---

### 3.3 Symbiote Project Workspace (`SymbioteWorkspacePage.tsx`)
* **Problem Identified:** Any symbiote navigating to `/symbiote/workspace/:projectId` could access the workspace, task board, milestones, and post updates without being hired.
* **Specification:**
  * Component must verify active assignment:
    ```typescript
    const isAssigned = 
      project.assignedSymbioteId === currentUserId ||
      project.teamMemberUids?.includes(currentUserId) ||
      project.teamMembers?.some((m) => m.uid === currentUserId);
    ```
  * If `isAssigned === false` (and user is not an Admin):
    * Disconnect milestone, task, file, and update listeners.
    * Display an **Access Denied Banner** explaining that this project workspace is restricted to active team members.
    * Provide a direct CTA button: `[Browse Available Projects]`.

---

### 3.4 Symbiote Time Tracking (`SymbioteTimeTrackingPage.tsx`)
* **Problem Identified:** Contains an unintended fallback where if a symbiote has zero assigned projects, `subscribeToProjects()` was called, exposing every project on the platform in their project selector dropdown.
* **Specification:**
  * Remove `subscribeToProjects()` fallback completely.
  * If a symbiote has no assigned projects, the dropdown must display a disabled placeholder: *"No active assigned projects"*.
  * Show a clean, informative empty-state card guiding them to browse open projects.

---

### 3.5 Project Query Helper Functions (`src/lib/firestore/projects.ts`)
* **Problem Identified:** `subscribeToProjectsBySymbiote` downloaded the entire `projects` collection into browser memory and filtered with `.filter()` in JavaScript.
* **Specification:**
  * Replace full-collection downloads with targeted Firestore server-side queries (`where('assignedSymbioteId', '==', uid)`).
  * Ensure Firestore indexes support compound queries without degrading real-time performance.

---

## 4. Backend Shield: Firestore Security Rules (`firestore.rules`)

The frontend guarantees a polished UX, but **Cloud Firestore Security Rules** are the ultimate security boundary. The rules must be hardened in synchronization with frontend changes:

### 4.1 Projects Collection
```javascript
match /projects/{projectId} {
  // Publicly readable for marketplace browsing ONLY if published and open
  allow read: if resource.data.status == 'open' || 
                 resource.data.status == 'published' ||
                 (isSignedIn() && (
                   request.auth.uid == resource.data.clientId ||
                   request.auth.uid == resource.data.ownerId ||
                   request.auth.uid == resource.data.assignedSymbioteId ||
                   (resource.data.keys().contains('teamMemberUids') && request.auth.uid in resource.data.teamMemberUids) ||
                   isAdmin()
                 ));
}
```

### 4.2 Workspaces & Subcollections
```javascript
match /workspaces/{projectId} {
  allow read, write: if isSignedIn() && (
    // Only assigned contractors, project owner, or admin
    request.auth.uid == get(/databases/$(database)/documents/projects/$(projectId)).data.clientId ||
    request.auth.uid == get(/databases/$(database)/documents/projects/$(projectId)).data.ownerId ||
    request.auth.uid == get(/databases/$(database)/documents/projects/$(projectId)).data.assignedSymbioteId ||
    isAdmin()
  );

  match /{subcollection=**} {
    allow read, write: if isSignedIn() && (
      request.auth.uid == get(/databases/$(database)/documents/projects/$(projectId)).data.clientId ||
      request.auth.uid == get(/databases/$(database)/documents/projects/$(projectId)).data.ownerId ||
      request.auth.uid == get(/databases/$(database)/documents/projects/$(projectId)).data.assignedSymbioteId ||
      isAdmin()
    );
  }
}
```

### 4.3 Applications & Bids
```javascript
match /applications/{applicationId} {
  // Applications visible ONLY to the applying freelancer, the project client, or admin
  allow read: if isSignedIn() && (
    request.auth.uid == resource.data.symbioteId ||
    request.auth.uid == resource.data.clientId ||
    request.auth.uid == resource.data.ownerId ||
    isAdmin()
  );
}
```

---

## 5. Anti-Regression Safeguards

When applying these security and isolation updates, the following critical platform features must remain protected from regressions:

| Feature / Area | Expected Behavior to Preserve |
| :--- | :--- |
| **Authentication & Profile Forms** | No autofill leakage between fields, phone number validation (digits only, 8-15 chars, leading zero preserved), password visibility toggle on signup/login. |
| **Browse Jobs Flow** | Unassigned symbiotes must still be able to browse open marketplace jobs (`status === 'open'`) and submit applications. |
| **Client Project Wizard** | 4-step project creation (`/client/projects/new/step-1` to `step-4`) must successfully persist drafts with proper `clientId` and `ownerId` tags. |
| **Time Tracking Reconciler** | Status synchronization across cross-component storage and real-time listeners must remain active. |
| **Admin Oversight Suite** | Platform administrators (`role === 'admin'`) must retain system-wide diagnostic and oversight visibility across all portals. |

---

## 6. Verification & Acceptance Testing Scenarios

Before any code update related to user privacy is signed off, the following test cases must be manually and automatedly verified:

- [ ] **TC-SEC-01 (Client-to-Client Isolation):** Sign in as Client A. Manually paste the URL for a project owned by Client B. Verify that an Access Denied state displays with zero data leakage.
- [ ] **TC-SEC-02 (Symbiote Workspace Isolation):** Sign in as Symbiote X. Paste the URL of a project assigned to Symbiote Y. Verify that the workspace is blocked and no milestones or task data are rendered.
- [ ] **TC-SEC-03 (Search Scoping):** Sign in as a Client. Type keywords from another client's confidential project into the Global Search Bar. Verify that zero unauthorized projects appear in the search results dropdown.
- [ ] **TC-SEC-04 (Search Status Support):** Type `"completed"` into the search bar. Verify that completed projects belonging to the current user are returned properly.
- [ ] **TC-SEC-05 (Time Tracking Dropdown):** Sign in as a new Symbiote with 0 assigned projects. Open `/symbiote/time-tracking`. Verify that no unassigned platform projects appear in the selector dropdown.
- [ ] **TC-SEC-06 (Network Payload Audit):** Inspect browser DevTools (Network / WS frames) during search and dashboard load. Verify that non-relevant project documents are never downloaded over the wire.
