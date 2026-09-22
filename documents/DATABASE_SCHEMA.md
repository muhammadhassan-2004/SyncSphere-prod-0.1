# Database Schema & Data Dictionary

SyncSphere utilizes **Google Cloud Firestore (NoSQL Document Store)**. Data is organized into root collections and targeted subcollections to optimize real-time streaming and granular security rules.

---

## 1. Collection Inventory

| Collection Path | Purpose | Key Relations |
| :--- | :--- | :--- |
| `/users/{uid}` | User profiles, role metadata, preferences | Auth UID |
| `/projects/{projectId}` | Project listings, budgets, statuses | `clientId`, `assignedSymbioteId` |
| `/projects/{projectId}/milestones/{id}` | Contract milestones and escrow | `projectId` |
| `/projects/{projectId}/tasks/{id}` | Workspace kanban task items | `projectId`, `assignedTo` |
| `/projects/{projectId}/files/{id}` | Workspace documents and assets | `projectId`, `uploaderUid` |
| `/projects/{projectId}/updates/{id}` | Timeline status posts and feed | `projectId`, `authorUid` |
| `/applications/{appId}` | Freelancer bids and proposals | `projectId`, `symbioteId` |
| `/invitations/{inviteId}` | Client-to-talent direct invitations | `projectId`, `clientId`, `symbioteId` |
| `/conversations/{convId}` | 1-on-1 and project chat channels | `participants` (UID array) |
| `/conversations/{convId}/messages/{msgId}`| Chat message documents | `senderId` |
| `/invoices/{invoiceId}` | Financial billing requests | `projectId`, `clientId`, `symbioteId` |
| `/timeEntries/{entryId}` | Billable hour logs | `projectId`, `symbioteId` |
| `/reviews/{reviewId}` | Mutual client/symbiote reviews | `targetUid`, `authorUid`, `projectId` |
| `/notifications/{notifId}` | Real-time user alert feed | `recipientUid` |
| `/auditLogs/{logId}` | Security compliance and audit logs | `actorUid` |
| `/platformSettings/{docId}` | Global platform configuration | Global singleton |
| `/adminReports/{reportId}` | System telemetry reports | `generatedBy` |

---

## 2. Collection Schemas in Detail

### 2.1 `/users/{uid}`
```typescript
interface UserProfile {
  uid: string;                    // Firebase Auth UID
  email: string;                  // User email address
  displayName: string;            // Full display name
  role: 'client' | 'symbiote' | 'admin' | 'freelancer'; // Active role
  avatarUrl?: string;             // Profile avatar image URL
  headline?: string;              // Professional title / tagline
  bio?: string;                   // Extended bio or company overview
  companyName?: string;           // Organization name (for clients)
  location?: string;              // City, Country (e.g. "San Francisco, CA")
  hourlyRate?: number;            // Default hourly rate in USD (for symbiotes)
  skills?: string[];              // Tag array (e.g. ["Python", "PyTorch", "React"])
  rating?: number;                // Average rating score (0.0 to 5.0)
  reviewCount?: number;           // Total completed reviews
  completedProjects?: number;     // Number of completed contracts
  verified?: boolean;             // Identity verified badge status
  phone?: string;                 // Contact phone number
  website?: string;               // Personal portfolio or company website
  githubUrl?: string;             // GitHub profile link
  linkedinUrl?: string;           // LinkedIn profile link
  status?: 'active' | 'suspended' | 'pending'; // Account state
  createdAt: string;              // ISO timestamp
  updatedAt: string;              // ISO timestamp
}
```

---

### 2.2 `/projects/{projectId}`
```typescript
interface Project {
  id: string;                     // Unique project ID
  title: string;                  // Project title
  description: string;            // Full project scope and requirements
  category: string;               // Category (e.g. "AI & Machine Learning")
  skills: string[];               // Required skill tags
  budgetType: 'fixed' | 'hourly'; // Billing type
  budget: number;                 // Fixed budget amount in USD
  hourlyMin?: number;             // Hourly range minimum in USD
  hourlyMax?: number;             // Hourly range maximum in USD
  duration?: string;              // Estimated timeline (e.g. "1 to 3 months")
  experienceLevel?: 'Entry' | 'Intermediate' | 'Expert';
  clientId: string;               // Client UID who created the project
  clientName: string;             // Client display name
  clientAvatarUrl?: string;       // Client avatar URL
  assignedSymbioteId?: string;    // UID of hired freelancer
  assignedSymbioteName?: string;  // Name of hired freelancer
  status: 'draft' | 'open' | 'in_progress' | 'completed' | 'cancelled';
  proposalsCount: number;         // Total bids received
  hiredCount: number;             // Hired talent count
  featured?: boolean;             // Highlighted on public feed
  deadline?: string;              // ISO project completion target
  createdAt: string;              // ISO creation date
  updatedAt?: string;             // ISO update date
}
```

---

### 2.3 `/applications/{applicationId}`
```typescript
interface Application {
  id: string;                     // Application ID
  projectId: string;              // Target project reference
  projectTitle: string;           // Snapshot of project title
  symbioteId: string;             // Freelancer UID
  symbioteName: string;           // Freelancer display name
  symbioteAvatarUrl?: string;     // Freelancer avatar URL
  symbioteHeadline?: string;      // Freelancer tagline
  coverLetter: string;            // Proposal body text
  rate?: number;                   // Budget rate inherited from project (bidding removed)
  estimatedDuration: string;      // Proposed delivery timeline
  status: 'pending' | 'shortlisted' | 'accepted' | 'rejected' | 'withdrawn' | 'draft';
  subscriptionVerified?: boolean; // Verified specialist subscription status
  createdAt: string;              // ISO submission date
  updatedAt?: string;             // ISO update date
}
```

---

### 2.4 `/invoices/{invoiceId}`
```typescript
interface Invoice {
  id: string;                     // Invoice ID (e.g. "INV-2026-001")
  invoiceNumber: string;          // Human-readable invoice number
  projectId: string;              // Associated project ID
  projectTitle: string;           // Snapshot of project title
  clientId: string;               // Paying client UID
  clientName: string;             // Client display name
  symbioteId: string;             // Beneficiary freelancer UID
  symbioteName: string;           // Freelancer display name
  amount: number;                 // Total invoice balance in USD
  status: 'draft' | 'pending' | 'paid' | 'overdue' | 'cancelled';
  issueDate: string;              // ISO issue date
  dueDate: string;                // ISO payment due date
  paidAt?: string;                // ISO payment timestamp
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  notes?: string;
  paymentMethod?: string;
  createdAt: string;
}
```

---

### 2.5 `/timeEntries/{entryId}`
```typescript
interface TimeEntry {
  id: string;                     // Entry ID
  projectId: string;              // Project ID
  projectTitle: string;           // Project title snapshot
  symbioteId: string;             // Freelancer UID
  symbioteName: string;           // Freelancer name
  milestoneId?: string;           // Optional associated milestone
  description: string;            // Description of work performed
  hours: number;                  // Number of billable hours (e.g. 3.5)
  hourlyRate: number;             // Rate applied in USD
  totalAmount: number;            // Computed amount (hours * rate)
  date: string;                   // Date of work (YYYY-MM-DD)
  status: 'logged' | 'billed' | 'paid' | 'disputed';
  createdAt: string;
}
```

---

### 2.6 `/conversations/{convId}` & Subcollections
```typescript
interface Conversation {
  id: string;                     // Conversation ID
  participants: string[];         // Array of participating UIDs
  participantDetails: Record<string, {
    displayName: string;
    avatarUrl?: string;
    role: string;
  }>;
  projectId?: string;             // Optional project link
  projectTitle?: string;
  lastMessage: string;            // Preview of latest message
  lastMessageTimestamp: string;   // ISO timestamp of latest message
  lastSenderId: string;           // Sender UID of latest message
  unreadCount: Record<string, number>; // Map of UID -> unread badge count
  createdAt: string;
}

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatarUrl?: string;
  content: string;
  attachments?: Array<{
    name: string;
    url: string;
    type: string;
    size: number;
  }>;
  timestamp: string;              // ISO message timestamp
  readBy?: string[];              // List of UIDs who read the message
}
```

---

### 2.7 `/workspaces/{projectId}/tasks/{taskId}` & Milestones
```typescript
interface WorkspaceTask {
  id: string;
  projectId: string;
  title: string;
  description?: string;
  status: 'todo' | 'in_progress' | 'review' | 'completed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  milestoneId?: string;
  milestoneTitle?: string;
  estimatedHours?: number;
  actualHours?: number;
  assigneeId?: string;
  assigneeName?: string;
  assigneeAvatarInitials?: string;
  submittedForReviewAt?: string;  // Timestamp when specialist submitted task for review
  reviewNotes?: string;           // Notes / feedback provided during review or change request
  approvedAt?: string;            // Timestamp when client approved task
  approvedBy?: string;            // UID or name of client who approved
  invoiced?: boolean;             // Whether task has been billed into an invoice
  invoiceId?: string;             // Reference to auto-generated or manual invoice
  createdAt: string;
  updatedAt?: string;
}

interface WorkspaceMilestone {
  id: string;
  projectId: string;
  title?: string;
  name?: string;
  description?: string;
  phase?: number | string;
  hoursAllocated?: number;
  rate?: number;
  completed: boolean;             // Automatically true when all assigned tasks are approved
  createdAt?: string;
  updatedAt?: string;
}
```
