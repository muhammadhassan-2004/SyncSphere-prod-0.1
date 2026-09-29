import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/src/context/AuthContext';
import { ToastProvider } from '@/src/lib/toast/ToastProvider';
import { ProtectedRoute } from '@/src/components/ProtectedRoute';
import { PublicOnlyRoute } from '@/src/components/PublicOnlyRoute';
import { PortalShell } from '@/src/components/layout/PortalShell';
import { ScrollToTop } from '@/src/components/layout/ScrollToTop';
import { Loader2 } from 'lucide-react';

// Route-level code-splitting helper for named exports
const lazyNamed = <T extends Record<string, any>, K extends keyof T>(
  loader: () => Promise<T>,
  key: K
) => lazy(() => loader().then((m) => ({ default: m[key] })));

// Public pages
const LandingPage = lazyNamed(() => import('@/src/pages/public/LandingPage'), 'LandingPage');
const PortalSelectPage = lazyNamed(() => import('@/src/pages/public/PortalSelectPage'), 'PortalSelectPage');
const SignupPage = lazyNamed(() => import('@/src/pages/public/SignupPage'), 'SignupPage');
const VerifyEmailPage = lazyNamed(() => import('@/src/pages/public/VerifyEmailPage'), 'VerifyEmailPage');
const LoginPage = lazyNamed(() => import('@/src/pages/public/LoginPage'), 'LoginPage');
const ForgotPasswordPage = lazyNamed(() => import('@/src/pages/public/ForgotPasswordPage'), 'ForgotPasswordPage');
const ResetVerifyPage = lazyNamed(() => import('@/src/pages/public/ResetVerifyPage'), 'ResetVerifyPage');
const ResetNewPasswordPage = lazyNamed(() => import('@/src/pages/public/ResetNewPasswordPage'), 'ResetNewPasswordPage');
const AuthActionPage = lazyNamed(() => import('@/src/pages/public/AuthActionPage'), 'AuthActionPage');
const OnboardingPage = lazyNamed(() => import('@/src/pages/public/OnboardingPage'), 'OnboardingPage');
const AboutPage = lazyNamed(() => import('@/src/pages/public/AboutPage'), 'AboutPage');
const HelpCenterPage = lazyNamed(() => import('@/src/pages/public/HelpCenterPage'), 'HelpCenterPage');
const ContactUsPage = lazyNamed(() => import('@/src/pages/public/ContactUsPage'), 'ContactUsPage');
const PrivacyPolicyPage = lazyNamed(() => import('@/src/pages/public/PrivacyPolicyPage'), 'PrivacyPolicyPage');
const TermsOfServicePage = lazyNamed(() => import('@/src/pages/public/TermsOfServicePage'), 'TermsOfServicePage');

// Client Portal pages
const ClientDashboardPage = lazyNamed(() => import('@/src/pages/client/ClientDashboardPage'), 'ClientDashboardPage');
const ClientProjectsPage = lazyNamed(() => import('@/src/pages/client/ClientProjectsPage'), 'ClientProjectsPage');
const CreateProjectStep1Page = lazyNamed(() => import('@/src/pages/client/CreateProjectStep1Page'), 'CreateProjectStep1Page');
const CreateProjectStep2Page = lazyNamed(() => import('@/src/pages/client/CreateProjectStep2Page'), 'CreateProjectStep2Page');
const CreateProjectStep3Page = lazyNamed(() => import('@/src/pages/client/CreateProjectStep3Page'), 'CreateProjectStep3Page');
const CreateProjectStep4Page = lazyNamed(() => import('@/src/pages/client/CreateProjectStep4Page'), 'CreateProjectStep4Page');
const ProjectDetailsPage = lazyNamed(() => import('@/src/pages/client/ProjectDetailsPage'), 'ProjectDetailsPage');
const FindTalentPage = lazyNamed(() => import('@/src/pages/client/FindTalentPage'), 'FindTalentPage');
const ProfessionalProfilePage = lazyNamed(() => import('@/src/pages/client/ProfessionalProfilePage'), 'ProfessionalProfilePage');
const AIMatchingPage = lazyNamed(() => import('@/src/pages/client/AIMatchingPage'), 'AIMatchingPage');
const ApplicationsPage = lazyNamed(() => import('@/src/pages/client/ApplicationsPage'), 'ApplicationsPage');
const MessagingPage = lazyNamed(() => import('@/src/pages/client/MessagingPage'), 'MessagingPage');
const WorkspaceKanbanPage = lazyNamed(() => import('@/src/pages/client/WorkspaceKanbanPage'), 'WorkspaceKanbanPage');
const TimeTrackingPage = lazyNamed(() => import('@/src/pages/client/TimeTrackingPage'), 'TimeTrackingPage');
const FilesAndDocsPage = lazyNamed(() => import('@/src/pages/client/FilesAndDocsPage'), 'FilesAndDocsPage');
const InvoiceManagementPage = lazyNamed(() => import('@/src/pages/client/InvoiceManagementPage'), 'InvoiceManagementPage');
const LeaveReviewPage = lazyNamed(() => import('@/src/pages/client/LeaveReviewPage'), 'LeaveReviewPage');
const ClientReviewsPage = lazyNamed(() => import('@/src/pages/client/ClientReviewsPage'), 'ClientReviewsPage');
const CompanyProfilePage = lazyNamed(() => import('@/src/pages/client/settings/CompanyProfilePage'), 'CompanyProfilePage');
const NotificationsSettingsPage = lazyNamed(() => import('@/src/pages/client/settings/NotificationsSettingsPage'), 'NotificationsSettingsPage');
const SecuritySettingsPage = lazyNamed(() => import('@/src/pages/client/settings/SecuritySettingsPage'), 'SecuritySettingsPage');
const BillingSettingsPage = lazyNamed(() => import('@/src/pages/client/settings/BillingSettingsPage'), 'BillingSettingsPage');
const NotificationsFeedPage = lazyNamed(() => import('@/src/pages/client/NotificationsFeedPage'), 'NotificationsFeedPage');
const EditProfilePage = lazyNamed(() => import('@/src/pages/client/EditProfilePage'), 'EditProfilePage');

// Symbiote / Freelancer Portal pages
const SymbioteDashboardPage = lazyNamed(() => import('@/src/pages/symbiote/SymbioteDashboardPage'), 'SymbioteDashboardPage');
const SymbioteBrowseProjectsPage = lazyNamed(() => import('@/src/pages/symbiote/SymbioteBrowseProjectsPage'), 'SymbioteBrowseProjectsPage');
const SymbioteProjectDetailPage = lazyNamed(() => import('@/src/pages/symbiote/SymbioteProjectDetailPage'), 'SymbioteProjectDetailPage');
const SymbioteInvitationsPage = lazyNamed(() => import('@/src/pages/symbiote/SymbioteInvitationsPage'), 'SymbioteInvitationsPage');
const SymbioteProjectsPage = lazyNamed(() => import('@/src/pages/symbiote/SymbioteProjectsPage'), 'SymbioteProjectsPage');
const SymbioteWorkspacePage = lazyNamed(() => import('@/src/pages/symbiote/SymbioteWorkspacePage'), 'SymbioteWorkspacePage');
const SymbioteMessagingPage = lazyNamed(() => import('@/src/pages/symbiote/SymbioteMessagingPage'), 'SymbioteMessagingPage');
const SymbioteTimeTrackingPage = lazyNamed(() => import('@/src/pages/symbiote/SymbioteTimeTrackingPage'), 'SymbioteTimeTrackingPage');
const SymbioteEarningsPage = lazyNamed(() => import('@/src/pages/symbiote/SymbioteEarningsPage'), 'SymbioteEarningsPage');
const SymbioteInvoicesPage = lazyNamed(() => import('@/src/pages/symbiote/SymbioteInvoicesPage'), 'SymbioteInvoicesPage');
const SymbioteReviewsPage = lazyNamed(() => import('@/src/pages/symbiote/SymbioteReviewsPage'), 'SymbioteReviewsPage');
const SymbioteProfilePage = lazyNamed(() => import('@/src/pages/symbiote/SymbioteProfilePage'), 'SymbioteProfilePage');
const SymbioteSettingsPage = lazyNamed(() => import('@/src/pages/symbiote/SymbioteSettingsPage'), 'SymbioteSettingsPage');

// Admin Portal pages
const AdminDashboardPage = lazyNamed(() => import('@/src/pages/admin/AdminDashboardPage'), 'AdminDashboardPage');
const UserManagementPage = lazyNamed(() => import('@/src/pages/admin/UserManagementPage'), 'UserManagementPage');
const UserDetailPage = lazyNamed(() => import('@/src/pages/admin/UserDetailPage'), 'UserDetailPage');
const ProjectOversightPage = lazyNamed(() => import('@/src/pages/admin/ProjectOversightPage'), 'ProjectOversightPage');
const PlatformMonitoringPage = lazyNamed(() => import('@/src/pages/admin/PlatformMonitoringPage'), 'PlatformMonitoringPage');
const AuditLogsPage = lazyNamed(() => import('@/src/pages/admin/AuditLogsPage'), 'AuditLogsPage');
const AnalyticsReportingPage = lazyNamed(() => import('@/src/pages/admin/AnalyticsReportingPage'), 'AnalyticsReportingPage');
const ReportsCenterPage = lazyNamed(() => import('@/src/pages/admin/ReportsCenterPage'), 'ReportsCenterPage');
const AdminSettingsPage = lazyNamed(() => import('@/src/pages/admin/AdminSettingsPage'), 'AdminSettingsPage');

// Dev QA Bench
const DevPrimitivesQA = lazyNamed(() => import('@/src/components/DevPrimitivesQA'), 'DevPrimitivesQA');

function PageLoadingFallback() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center bg-[var(--color-background)]">
      <div className="flex items-center gap-3 bg-[var(--color-surface)] px-5 py-3 rounded-full border border-[var(--color-border)] shadow-lg">
        <Loader2 className="w-5 h-5 animate-spin text-cyan-400" />
        <span className="text-xs font-medium text-[var(--color-text-secondary)]">Loading...</span>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <ScrollToTop />
          <div id="syncsphere-app" className="min-h-screen bg-[var(--color-background)] text-[var(--color-text-primary)] font-sans antialiased">
            <Suspense fallback={<PageLoadingFallback />}>
              <Routes>
                {/* PUBLIC ROUTES */}
                <Route path="/" element={<LandingPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/help" element={<HelpCenterPage />} />
            <Route path="/contact" element={<ContactUsPage />} />
            <Route path="/privacy" element={<PrivacyPolicyPage />} />
            <Route path="/terms" element={<TermsOfServicePage />} />
            <Route
              path="/portal-select"
              element={
                <PublicOnlyRoute>
                  <PortalSelectPage />
                </PublicOnlyRoute>
              }
            />
            <Route
              path="/signup"
              element={
                <PublicOnlyRoute>
                  <SignupPage />
                </PublicOnlyRoute>
              }
            />
            <Route path="/verify-email" element={<VerifyEmailPage />} />
            <Route path="/onboarding" element={<OnboardingPage />} />

            <Route
              path="/login"
              element={
                <PublicOnlyRoute>
                  <LoginPage />
                </PublicOnlyRoute>
              }
            />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset/verify" element={<ResetVerifyPage />} />
            <Route path="/reset/new-password" element={<ResetNewPasswordPage />} />
            <Route path="/auth/action" element={<AuthActionPage />} />
            <Route path="/__/auth/action" element={<AuthActionPage />} />


            {/* DEV QA BENCH - Guarded for Admin and DEV environments only */}
            <Route
              path="/dev/primitives"
              element={
                import.meta.env.DEV ? (
                  <DevPrimitivesQA />
                ) : (
                  <ProtectedRoute requiredRole="admin">
                    <DevPrimitivesQA />
                  </ProtectedRoute>
                )
              }
            />

            {/* CLIENT PORTAL GROUP (Blue Accent) */}
            <Route
              path="/client"
              element={
                <ProtectedRoute requiredRole="client">
                  <PortalShell role="client" />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/client/dashboard" replace />} />
              <Route path="dashboard" element={<ClientDashboardPage />} />
              <Route path="create-project" element={<Navigate to="/client/projects/new/step-1" replace />} />
              <Route path="projects/new" element={<Navigate to="/client/projects/new/step-1" replace />} />
              <Route path="projects/new/step-1" element={<CreateProjectStep1Page />} />
              <Route path="projects/new/step-2" element={<CreateProjectStep2Page />} />
              <Route path="projects/new/step-3" element={<CreateProjectStep3Page />} />
              <Route path="projects/new/step-4" element={<CreateProjectStep4Page />} />
              <Route path="projects/:projectId/matching" element={<AIMatchingPage />} />
              <Route path="projects/:projectId/review" element={<LeaveReviewPage />} />
              <Route path="projects/:projectId/:subTab" element={<ProjectDetailsPage />} />
              <Route path="projects/:projectId" element={<ProjectDetailsPage />} />
              <Route path="projects" element={<ClientProjectsPage />} />
              <Route path="find-talent" element={<FindTalentPage />} />
              <Route path="talent" element={<FindTalentPage />} />
              <Route path="professionals/:symbioteId/:tab" element={<ProfessionalProfilePage />} />
              <Route path="professionals/:symbioteId" element={<ProfessionalProfilePage />} />
              <Route path="ai-matching" element={<AIMatchingPage />} />
              <Route path="applications" element={<ApplicationsPage />} />
              <Route path="messages/:conversationId" element={<MessagingPage />} />
              <Route path="messages" element={<MessagingPage />} />
              <Route path="time-tracking" element={<TimeTrackingPage />} />
              <Route path="files" element={<FilesAndDocsPage />} />
              <Route path="invoices" element={<InvoiceManagementPage />} />
              <Route path="reviews" element={<ClientReviewsPage />} />
              <Route path="settings" element={<Navigate to="/client/settings/company-profile" replace />} />
              <Route path="settings/company-profile" element={<CompanyProfilePage />} />
              <Route path="settings/notifications" element={<NotificationsSettingsPage />} />
              <Route path="settings/security" element={<SecuritySettingsPage />} />
              <Route path="settings/billing" element={<BillingSettingsPage />} />
              <Route path="notifications" element={<NotificationsFeedPage />} />
              <Route path="profile/edit" element={<EditProfilePage />} />
              <Route path="profile" element={<EditProfilePage />} />
              <Route path="*" element={<Navigate to="/client/dashboard" replace />} />
            </Route>

            {/* SYMBIOTE PORTAL GROUP (Green Accent) */}
            <Route
              path="/symbiote"
              element={
                <ProtectedRoute requiredRole="symbiote">
                  <PortalShell role="symbiote" />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/symbiote/dashboard" replace />} />
              <Route path="dashboard" element={<SymbioteDashboardPage />} />
              <Route path="browse" element={<SymbioteBrowseProjectsPage />} />
              <Route path="browse/:projectId" element={<SymbioteProjectDetailPage />} />
              <Route path="invitations" element={<SymbioteInvitationsPage />} />
              <Route path="projects" element={<SymbioteProjectsPage />} />
              <Route path="workspace" element={<Navigate to="/symbiote/projects" replace />} />
              <Route path="workspace/:projectId" element={<SymbioteWorkspacePage />} />
              <Route path="messages" element={<SymbioteMessagingPage />} />
              <Route path="messages/:conversationId" element={<SymbioteMessagingPage />} />
              <Route path="time-tracking" element={<SymbioteTimeTrackingPage />} />
              <Route path="earnings" element={<SymbioteEarningsPage />} />
              <Route path="invoices" element={<SymbioteInvoicesPage />} />
              <Route path="reviews" element={<SymbioteReviewsPage />} />
              <Route path="profile/edit" element={<SymbioteProfilePage />} />
              <Route path="profile" element={<SymbioteProfilePage />} />
              <Route path="settings" element={<SymbioteSettingsPage />} />
              <Route path="notifications" element={<NotificationsFeedPage />} />
              <Route path="*" element={<Navigate to="/symbiote/dashboard" replace />} />
            </Route>

            {/* ADMIN PORTAL GROUP (Red Accent) */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute requiredRole="admin">
                  <PortalShell role="admin" />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/admin/dashboard" replace />} />
              <Route path="dashboard" element={<AdminDashboardPage />} />
              <Route path="users" element={<UserManagementPage />} />
              <Route path="users/:userId" element={<UserDetailPage />} />
              <Route path="projects" element={<ProjectOversightPage />} />
              <Route path="monitoring" element={<PlatformMonitoringPage />} />
              <Route path="audit-logs" element={<AuditLogsPage />} />
              <Route path="analytics" element={<AnalyticsReportingPage />} />
              <Route path="reports" element={<ReportsCenterPage />} />
              <Route path="settings" element={<AdminSettingsPage />} />
              <Route path="notifications" element={<NotificationsFeedPage />} />
              <Route path="profile/edit" element={<Navigate to="/admin/settings" replace />} />
              <Route path="profile" element={<Navigate to="/admin/settings" replace />} />
              <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
            </Route>

            {/* FALLBACK CATCH-ALL */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </div>
    </BrowserRouter>
    </ToastProvider>
  </AuthProvider>
  );
}
