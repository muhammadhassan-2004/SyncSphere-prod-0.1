export type UserRole = 'client' | 'symbiote' | 'admin' | 'owner' | 'freelancer';

export interface NotificationPreferences {
  newApplications?: boolean;
  messages?: boolean;
  invoiceAlerts?: boolean;
  milestoneUpdates?: boolean;
  aiMatching?: boolean;
  weeklyDigest?: boolean;
}

export interface CompanyProfile {
  companyName?: string;
  logoUrl?: string;
  industry?: string;
  companySize?: string;
  website?: string;
  companyDescription?: string;
  country?: string;
  timeZone?: string;
}

export interface UserSession {
  id: string;
  deviceInfo: string;
  browser: string;
  ipAddress: string;
  location: string;
  lastActive: string;
  current: boolean;
}

export interface BillingInfo {
  planName?: string;
  status?: 'active' | 'past_due' | 'canceled' | 'trialing';
  renewalDate?: string;
  amountPerMonth?: number;
  paymentMethodLast4?: string;
  paymentMethodBrand?: string;
  billingEmail?: string;
}

export interface ExperienceItem {
  id: string;
  role: string;
  company: string;
  startDate: string;
  endDate?: string;
  isCurrent?: boolean;
  description: string;
}

export interface PortfolioItem {
  id: string;
  name: string;
  techTags: string[];
  description?: string;
  linkUrl?: string;
  iconColor?: string;
}

export interface CertificationItem {
  id: string;
  name: string;
  issuer: string;
  year: string;
  verified: boolean;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  fullName?: string;
  role: UserRole;
  avatarInitials?: string;
  avatarUrl?: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  jobTitle?: string;
  timeZone?: string;
  linkedInUrl?: string;
  websiteUrl?: string;
  companyName?: string;
  companyProfile?: CompanyProfile;
  notificationPreferences?: NotificationPreferences;
  billingInfo?: BillingInfo;
  mfaEnabled?: boolean;
  mfaPhoneNumber?: string;
  title?: string;
  rating?: number;
  reviewsCount?: number;
  hourlyRate?: number;
  skills?: string[];
  experience?: string;
  experiences?: ExperienceItem[];
  portfolio?: PortfolioItem[];
  certifications?: CertificationItem[];
  availability?: string;
  location?: string;
  bio?: string;
  topAchievements?: string[];
  completedProjects?: number;
  onboardingCompleted?: boolean;
  emailVerified?: boolean;
  industry?: string;

  companySize?: string;
  department?: string;
  adminTitle?: string;
  yearsOfExperience?: string;
  primaryGoal?: string;
  budgetRange?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id?: string;
  title: string;
  description: string;
  ownerId: string;
  clientId?: string;
  clientName?: string;
  companyName?: string;
  clientEmail?: string;
  status: 'draft' | 'open' | 'in_progress' | 'completed' | 'closed';
  category?: string;
  industry?: string;
  projectType?: string;
  experienceLevel?: string;
  skills?: string[];
  budgetType?: 'fixed' | 'hourly';
  minBudget?: number;
  maxBudget?: number;
  currency?: string;
  startDate?: string;
  endDate?: string;
  duration?: string;
  priority?: 'Low' | 'Med' | 'High' | 'Urgent';
  workMode?: 'Remote' | 'Hybrid' | 'Onsite';
  weeklyCommitment?: number;
  budget?: number | { min?: number; max?: number; total?: number; type?: string; currency?: string };
  timeline?: string;
  deadline?: string;
  techTags?: string[];
  assignedSymbioteId?: string;
  assignedSymbioteName?: string;
  symbioteId?: string;
  aiConversation?: Array<{
    role: 'assistant' | 'user';
    text: string;
    timestamp: string;
  }>;
  aiBrief?: {
    title: string;
    description: string;
    keyRisks?: string[];
    recommendedSkills?: string[];
    attachedAt?: string;
  };
  aiBriefAttached?: boolean;
  visibility?: 'Public' | 'Invite Only';
  publishedAt?: string;
  healthStatus?: 'On Track' | 'At Risk' | 'Behind';
  progressPercent?: number;
  progressPct?: number;
  completedAt?: string;
  teamMembers?: Array<{
    uid: string;
    displayName: string;
    role: string;
    avatarInitials?: string;
    email?: string;
    hourlyRate?: number;
    matchScore?: number;
    addedAt?: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface Application {
  id?: string;
  projectId: string;
  projectTitle?: string;
  symbioteId: string;
  symbioteName?: string;
  symbioteTitle?: string;
  symbioteAvatarInitials?: string;
  symbioteAvatarUrl?: string;
  clientId: string;
  aiMatchScore?: number;
  aiMatchStatus?: 'pending' | 'calculated';
  status: 'shortlisted' | 'interview' | 'hired' | 'rejected' | 'pending' | 'draft';
  appliedAt: string;
  rate?: number;
  proposedRate?: number;
  estimatedDuration?: string;
  experience?: string;
  coverNote?: string;
  coverLetter?: string;
  questionsForClient?: string;
}

export interface Invitation {
  id?: string;
  projectId: string;
  projectTitle?: string;
  symbioteId: string;
  symbioteName?: string;
  symbioteTitle?: string;
  symbioteAvatarInitials?: string;
  symbioteAvatarUrl?: string;
  clientId: string;
  clientName?: string;
  status: 'pending' | 'accepted' | 'approved' | 'declined';
  budgetRange: string;
  timeline: string;
  techTags: string[];
  aiMatchScore?: number;
  matchScore?: number;
  clientNote?: string;
  message?: string;
  createdAt: string;
}

export interface TaskAssignee {
  uid: string;
  displayName: string;
  avatarInitials?: string;
  avatarUrl?: string;
  role?: string;
}

export interface WorkspaceTask {
  id?: string;
  projectId: string;
  projectTitle?: string;
  title: string;
  description?: string;
  status: 'todo' | 'in_progress' | 'review' | 'completed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category?: string;
  milestoneId?: string;
  milestoneTitle?: string;
  estimatedHours?: number;
  actualHours?: number;
  actualTotalHours?: number;
  dependencyTaskId?: string;
  dependencyTaskTitle?: string;
  assigneeId?: string;
  assigneeName?: string;
  assigneeAvatarInitials?: string;
  assigneeAvatarUrl?: string;
  assignees?: TaskAssignee[];
  submittedForReviewAt?: string;
  reviewNotes?: string;
  approvedAt?: string;
  approvedBy?: string;
  invoiced?: boolean;
  invoiceId?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface MilestoneDeliverableItem {
  name: string;
  url: string;
  size?: string;
  type?: string;
  uploadedAt?: string;
}

export interface WorkspaceMilestone {
  id?: string;
  projectId: string;
  title?: string;
  name?: string;
  description?: string;
  dueDate?: string;
  phase?: number | string;
  hoursAllocated?: number;
  rate?: number;
  completed?: boolean;
  status?: 'pending' | 'in_progress' | 'submitted' | 'approved';
  deliverables?: MilestoneDeliverableItem[];
  repositoryUrl?: string;
  summaryNotes?: string;
  submittedAt?: string;
  submittedBy?: string;
  submittedByName?: string;
  approvedAt?: string;
  approvedBy?: string;
  invoiced?: boolean;
  invoiceNumber?: string;
  invoiceId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface WorkspaceUpdate {
  id?: string;
  projectId: string;
  title?: string;
  content: string;
  authorUid: string;
  authorName?: string;
  authorRole?: string;
  createdAt: string;
}

export interface ChatAttachment {
  name: string;
  url: string;
  size?: string;
  type?: string;
}

export interface Conversation {
  id?: string;
  participantIds: string[];
  participantNames?: Record<string, string>;
  participantAvatars?: Record<string, string>;
  participantTitles?: Record<string, string>;
  projectId?: string;
  lastMessage: string;
  updatedAt: string;
  lastMessageAt?: string;
  unreadCount?: Record<string, number>;
  typing?: Record<string, number>;
}

export interface Message {
  id?: string;
  conversationId: string;
  senderId: string;
  senderName?: string;
  text: string;
  attachments?: ChatAttachment[];
  sentAt: string;
  read: boolean;
}

export interface TimeEntry {
  id?: string;
  symbioteId: string;
  symbioteName?: string;
  symbioteAvatarUrl?: string;
  projectId: string;
  projectName?: string;
  clientId?: string;
  milestoneId?: string;
  milestoneTitle?: string;
  taskId?: string;
  taskTitle?: string;
  date: string;
  hours: number;
  description: string;
  status: 'pending' | 'approved' | 'rejected';
}

export interface InvoiceLineItem {
  description: string;
  hours?: number;
  rate?: number;
  amount: number;
}

export interface InvoicePaymentDetails {
  chargeId?: string;
  paymentIntentId?: string;
  receiptUrl?: string;
  paidAt?: string;
  brand?: string;
  last4?: string;
  fee?: number;
  netAmount?: number;
  directSettled?: boolean;
  gateway?: 'stripe' | 'sandbox' | 'bank_transfer';
}

export interface Invoice {
  id?: string;
  invoiceNumber: string;
  clientId: string;
  clientName?: string;
  symbioteId: string;
  symbioteName?: string;
  projectId?: string;
  projectName?: string;
  title?: string;
  description?: string;
  amount: number;
  issuedDate?: string;
  dueDate: string;
  status: 'pending' | 'paid' | 'overdue' | 'approved' | 'draft';
  lineItems?: InvoiceLineItem[];
  paymentMethod?: string;
  paymentDetails?: InvoicePaymentDetails;
  createdAt?: string;
}

export interface ReviewRatings {
  communication: number;
  technicalSkills: number;
  timeliness: number;
  workQuality: number;
  overall: number;
}

export interface Review {
  id?: string;
  projectId: string;
  projectName?: string;
  fromUserId: string;
  reviewerId?: string;
  toUserId: string;
  symbioteId?: string;
  symbioteName?: string;
  clientId?: string;
  clientName?: string;
  ratings: ReviewRatings;
  feedback: string;
  recommend: boolean;
  declined?: boolean;
  createdAt?: string;
  helpfulCount?: number;
}

export interface NotificationItem {
  id?: string;
  userId: string;
  type: string;
  title: string;
  description: string;
  read: boolean;
  relatedItemId?: string;
  relatedItemLink?: string;
  createdAt: string;
}

export interface AuditLog {
  id?: string;
  timestamp: string;
  userId: string;
  action: string;
  module: string;
  ipAddress: string;
  result: 'success' | 'failed';
}

export interface ProjectMilestone {
  id?: string;
  projectId?: string;
  name: string;
  dueDate: string;
  progressPercent: number;
  status: 'Completed' | 'In Progress' | 'Upcoming' | 'Pending';
  deliverablesCount?: number;
  completedDeliverables?: number;
  amount?: number;
}

export interface ProjectActivityItem {
  id?: string;
  projectId?: string;
  title: string;
  description: string;
  type: 'milestone' | 'file' | 'team' | 'invoice' | 'commit' | 'general';
  actorName?: string;
  timestamp: string;
  referenceText?: string;
  referenceUrl?: string;
}

export type FileCategory = 'requirements' | 'contracts' | 'deliverables' | 'invoices';

export interface ProjectFile {
  id?: string;
  projectId: string;
  projectName?: string;
  clientId?: string;
  name: string;
  size: string;
  sizeBytes?: number;
  type: string;
  category: FileCategory;
  downloadUrl: string;
  uploadedBy: string;
  uploadedByName?: string;
  uploadedAt: string;
}

export interface PlatformSettings {
  id?: string;
  general: {
    platformName: string;
    supportEmail: string;
    maintenanceMode: boolean;
  };
  branding: {
    primaryColor: string;
    logoUrl?: string;
  };
  security: {
    requireMfa: boolean;
    sessionTimeoutMinutes: number;
  };
  notifications: {
    emailAlertsEnabled: boolean;
    systemAnnouncementsEnabled: boolean;
  };
  platformConfig: {
    platformFeePercentage: number;
    maxFileUploadMB: number;
  };
  updatedAt?: string;
}
