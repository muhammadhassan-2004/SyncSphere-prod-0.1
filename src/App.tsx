import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/src/context/AuthContext';
import { ToastProvider } from '@/src/lib/toast/ToastProvider';
import { ProtectedRoute } from '@/src/components/ProtectedRoute';
import { PublicOnlyRoute } from '@/src/components/PublicOnlyRoute';
import { PortalShell } from '@/src/components/layout/PortalShell';

// Public pages
import { LandingPage } from '@/src/pages/public/LandingPage';
import { PortalSelectPage } from '@/src/pages/public/PortalSelectPage';
import { SignupPage } from '@/src/pages/public/SignupPage';
import { VerifyEmailPage } from '@/src/pages/public/VerifyEmailPage';
import { LoginPage } from '@/src/pages/public/LoginPage';
import { ForgotPasswordPage } from '@/src/pages/public/ForgotPasswordPage';
import { ResetVerifyPage } from '@/src/pages/public/ResetVerifyPage';
import { ResetNewPasswordPage } from '@/src/pages/public/ResetNewPasswordPage';
import { AuthActionPage } from '@/src/pages/public/AuthActionPage';
import { OnboardingPage } from '@/src/pages/public/OnboardingPage';
import { AboutPage } from '@/src/pages/public/AboutPage';
import { HelpCenterPage } from '@/src/pages/public/HelpCenterPage';
import { ContactUsPage } from '@/src/pages/public/ContactUsPage';
import { PrivacyPolicyPage } from '@/src/pages/public/PrivacyPolicyPage';
import { TermsOfServicePage } from '@/src/pages/public/TermsOfServicePage';

// Portal pages
import { ClientDashboardPage } from '@/src/pages/client/ClientDashboardPage';
import { ClientProjectsPage } from '@/src/pages/client/ClientProjectsPage';
import { CreateProjectStep1Page } from '@/src/pages/client/CreateProjectStep1Page';
import { CreateProjectStep2Page } from '@/src/pages/client/CreateProjectStep2Page';
import { CreateProjectStep3Page } from '@/src/pages/client/CreateProjectStep3Page';
import { CreateProjectStep4Page } from '@/src/pages/client/CreateProjectStep4Page';
import { ProjectDetailsPage } from '@/src/pages/client/ProjectDetailsPage';
import { FindTalentPage } from '@/src/pages/client/FindTalentPage';
import { ProfessionalProfilePage } from '@/src/pages/client/ProfessionalProfilePage';
import { AIMatchingPage } from '@/src/pages/client/AIMatchingPage';
import { ApplicationsPage } from '@/src/pages/client/ApplicationsPage';
import { MessagingPage } from '@/src/pages/client/MessagingPage';
import { WorkspaceKanbanPage } from '@/src/pages/client/WorkspaceKanbanPage';
import { TimeTrackingPage } from '@/src/pages/client/TimeTrackingPage';
import { FilesAndDocsPage } from '@/src/pages/client/FilesAndDocsPage';
import { InvoiceManagementPage } from '@/src/pages/client/InvoiceManagementPage';
import { LeaveReviewPage } from '@/src/pages/client/LeaveReviewPage';
import { ClientReviewsPage } from '@/src/pages/client/ClientReviewsPage';
import { CompanyProfilePage } from '@/src/pages/client/settings/CompanyProfilePage';
import { NotificationsSettingsPage } from '@/src/pages/client/settings/NotificationsSettingsPage';
import { SecuritySettingsPage } from '@/src/pages/client/settings/SecuritySettingsPage';
import { BillingSettingsPage } from '@/src/pages/client/settings/BillingSettingsPage';
import { NotificationsFeedPage } from '@/src/pages/client/NotificationsFeedPage';
import { EditProfilePage } from '@/src/pages/client/EditProfilePage';
import { PlaceholderSettingsTab } from '@/src/pages/client/settings/PlaceholderSettingsTab';
import { SymbioteDashboardPage } from '@/src/pages/symbiote/SymbioteDashboardPage';
import { SymbioteBrowseProjectsPage } from '@/src/pages/symbiote/SymbioteBrowseProjectsPage';
import { SymbioteProjectDetailPage } from '@/src/pages/symbiote/SymbioteProjectDetailPage';
import { SymbioteInvitationsPage } from '@/src/pages/symbiote/SymbioteInvitationsPage';
import { SymbioteProjectsPage } from '@/src/pages/symbiote/SymbioteProjectsPage';
import { SymbioteWorkspacePage } from '@/src/pages/symbiote/SymbioteWorkspacePage';
import { SymbioteMessagingPage } from '@/src/pages/symbiote/SymbioteMessagingPage';
import { SymbioteTimeTrackingPage } from '@/src/pages/symbiote/SymbioteTimeTrackingPage';
import { SymbioteEarningsPage } from '@/src/pages/symbiote/SymbioteEarningsPage';
import { SymbioteInvoicesPage } from '@/src/pages/symbiote/SymbioteInvoicesPage';
import { SymbioteReviewsPage } from '@/src/pages/symbiote/SymbioteReviewsPage';
import { SymbioteProfilePage } from '@/src/pages/symbiote/SymbioteProfilePage';
import { SymbioteSettingsPage } from '@/src/pages/symbiote/SymbioteSettingsPage';
import { AdminDashboardPage } from '@/src/pages/admin/AdminDashboardPage';
import { UserManagementPage } from '@/src/pages/admin/UserManagementPage';
import { UserDetailPage } from '@/src/pages/admin/UserDetailPage';
import { ProjectOversightPage } from '@/src/pages/admin/ProjectOversightPage';
import { PlatformMonitoringPage } from '@/src/pages/admin/PlatformMonitoringPage';
import { AuditLogsPage } from '@/src/pages/admin/AuditLogsPage';
import { AnalyticsReportingPage } from '@/src/pages/admin/AnalyticsReportingPage';
import { ReportsCenterPage } from '@/src/pages/admin/ReportsCenterPage';
import { AdminSettingsPage } from '@/src/pages/admin/AdminSettingsPage';
import { PlaceholderPageRoute } from '@/src/pages/PlaceholderPageRoute';

import { DevPrimitivesQA } from '@/src/components/DevPrimitivesQA';
import { ScrollToTop } from '@/src/components/layout/ScrollToTop';

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <ScrollToTop />
          <div id="syncsphere-app" className="min-h-screen bg-[var(--color-background)] text-[var(--color-text-primary)] font-sans antialiased">
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
            <Route path="/signup" element={<SignupPage />} />
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


            {/* DEV QA BENCH */}
            <Route path="/dev/primitives" element={<DevPrimitivesQA />} />

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
        </div>
      </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
}
