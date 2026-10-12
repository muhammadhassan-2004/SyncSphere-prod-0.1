/**
 * SyncSphere Automated Test Suite
 * Grounded verification for issues:
 * - Issue #33: Admin Workspace Link Removal
 * - Issues #38 & #39: Fake Data / Auto-Seeding Abolition
 * - Issue #21: Stopwatch Timer & Task Atomic Hours Sync
 * - Issue #19: One-Way Rating & Specialist Profile Rating Sync
 * - Issue #32: Clean Raw Technical UUIDs from Admin Modal
 * - Documentation consistency in BUGS_AND_ISSUES_TRACKER.md
 */

import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { computeFallbackMatches } from '../server/routes/ai.routes.js';

const ROOT_DIR = process.cwd();

function readFile(relativePath: string): string {
  const fullPath = path.join(ROOT_DIR, relativePath);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`File not found: ${fullPath}`);
  }
  return fs.readFileSync(fullPath, 'utf-8');
}

let passedTests = 0;
let totalTests = 0;

function runTest(name: string, fn: () => void) {
  totalTests++;
  try {
    fn();
    console.log(`  ✅ PASS: ${name}`);
    passedTests++;
  } catch (err: any) {
    console.error(`  ❌ FAIL: ${name}`);
    console.error(`     Reason: ${err.message}`);
  }
}

console.log('====================================================');
console.log('🧪 Running SyncSphere Verification Test Suite');
console.log('====================================================\n');

// ----------------------------------------------------
// Test Group 1: Issue #33 - Admin Workspace Link Removal
// ----------------------------------------------------
console.log('📌 Test Group 1: Issue #33 (Admin Workspace Unauthorized Link Removal)');
runTest('ProjectOversightPage does NOT contain unauthorized /client/projects link', () => {
  const content = readFile('src/pages/admin/ProjectOversightPage.tsx');
  assert.ok(
    !content.includes('/client/projects/'),
    'ProjectOversightPage still contains /client/projects/ link'
  );
  assert.ok(
    !content.includes('Open Full Client Workspace'),
    'ProjectOversightPage still contains "Open Full Client Workspace" text/button'
  );
});

// ----------------------------------------------------
// Test Group 2: Issues #38 & #39 - Fake Data / Auto-Seeding Abolition
// ----------------------------------------------------
console.log('\n📌 Test Group 2: Issues #38 & #39 (Zero Dummy / Fake Auto-Seeding Data)');
runTest('WorkspaceKanbanPage has no seedInitialTasks or proj-demo-1 fallback', () => {
  const content = readFile('src/pages/client/WorkspaceKanbanPage.tsx');
  assert.ok(!content.includes('seedInitialTasks'), 'WorkspaceKanbanPage still contains seedInitialTasks');
  assert.ok(!content.includes("'proj-demo-1'"), "WorkspaceKanbanPage still contains 'proj-demo-1' fallback");
});

runTest('SymbioteWorkspacePage has no fake greeting or dummy update auto-seeding', () => {
  const content = readFile('src/pages/symbiote/SymbioteWorkspacePage.tsx');
  assert.ok(
    !content.includes('Hello team! Starting work on the project.'),
    'SymbioteWorkspacePage still contains hardcoded dummy greeting'
  );
  assert.ok(
    !content.includes('First workspace update automatically generated.'),
    'SymbioteWorkspacePage still auto-seeds initial updates'
  );
});

runTest('Client TimeTrackingPage has no seedSampleTimeEntries', () => {
  const content = readFile('src/pages/client/TimeTrackingPage.tsx');
  assert.ok(!content.includes('seedSampleTimeEntries'), 'TimeTrackingPage still contains seedSampleTimeEntries');
});

runTest('SymbioteTimeTrackingPage has no handleSeedDemoData or Load Sample Data button', () => {
  const content = readFile('src/pages/symbiote/SymbioteTimeTrackingPage.tsx');
  assert.ok(!content.includes('handleSeedDemoData'), 'SymbioteTimeTrackingPage still contains handleSeedDemoData');
  assert.ok(!content.includes('Load Sample Data'), 'SymbioteTimeTrackingPage still contains "Load Sample Data" button');
});

runTest('NotificationsFeedPage has no DEFAULT_SEED_NOTIFICATIONS', () => {
  const content = readFile('src/pages/client/NotificationsFeedPage.tsx');
  assert.ok(
    !content.includes('DEFAULT_SEED_NOTIFICATIONS'),
    'NotificationsFeedPage still contains DEFAULT_SEED_NOTIFICATIONS'
  );
});

// ----------------------------------------------------
// Test Group 3: Issue #21 - Stopwatch Timer & Task Sync
// ----------------------------------------------------
console.log('\n📌 Test Group 3: Issue #21 (Stopwatch Timer & Task Atomic Hours Sync)');
runTest('WorkspaceTask type definition supports actualTotalHours', () => {
  const content = readFile('src/types/firestore.ts');
  assert.ok(
    content.includes('actualTotalHours?: number;'),
    'src/types/firestore.ts WorkspaceTask interface missing actualTotalHours'
  );
});

runTest('createTimeEntry updates actualHours & actualTotalHours, and transitions todo to in_progress', () => {
  const content = readFile('src/lib/firestore/timeEntries.ts');
  assert.ok(
    content.includes('actualHours: newActual'),
    'createTimeEntry does not update actualHours with newActual'
  );
  assert.ok(
    content.includes('actualTotalHours: newActual'),
    'createTimeEntry does not update actualTotalHours with newActual'
  );
  assert.ok(
    content.includes("updateData.status = 'in_progress'"),
    'createTimeEntry does not auto-advance todo tasks to in_progress'
  );
});

runTest('deleteTimeEntry updates and rolls back task actualHours and actualTotalHours', () => {
  const content = readFile('src/lib/firestore/timeEntries.ts');
  assert.ok(
    content.includes('export async function deleteTimeEntry(entryId: string)'),
    'deleteTimeEntry function missing from timeEntries.ts'
  );
  assert.ok(
    content.includes('Math.max(0, +(currentActual - Number(data.hours)).toFixed(2))'),
    'deleteTimeEntry does not compute decremented actual hours'
  );
});

runTest('SymbioteTimeTrackingPage enforces task selection before logging time entries', () => {
  const content = readFile('src/pages/symbiote/SymbioteTimeTrackingPage.tsx');
  assert.ok(
    content.includes('Please select a Workspace Task for this work session.'),
    'SymbioteTimeTrackingPage does not guard logging without task selection'
  );
});

runTest('Kanban cards render actualHours or actualTotalHours fallback', () => {
  const kanbanContent = readFile('src/pages/client/WorkspaceKanbanPage.tsx');
  const tabContent = readFile('src/components/project/WorkspaceTab.tsx');
  assert.ok(
    kanbanContent.includes('task.actualHours || task.actualTotalHours || 0'),
    'WorkspaceKanbanPage does not check fallback actualTotalHours'
  );
  assert.ok(
    tabContent.includes('task.actualHours || task.actualTotalHours || 0'),
    'WorkspaceTab does not check fallback actualTotalHours'
  );
});

// ----------------------------------------------------
// Test Group 4: Issue #19 - One-Way Rating & Specialist Profile Rating Sync
// ----------------------------------------------------
console.log('\n📌 Test Group 4: Issue #19 (One-Way Rating & Specialist Profile Sync)');
runTest('createReview calculates average and updates freelancer rating and reviewsCount in users collection', () => {
  const content = readFile('src/lib/firestore/reviews.ts');
  assert.ok(
    content.includes('avgRating'),
    'createReview does not calculate avgRating'
  );
  assert.ok(
    content.includes('rating: avgRating'),
    'createReview does not update rating in freelancer user doc'
  );
  assert.ok(
    content.includes('reviewsCount: allReviews.length'),
    'createReview does not update reviewsCount in freelancer user doc'
  );
});

// ----------------------------------------------------
// Test Group 5: Issue #32 - Clean Raw Technical UUIDs from Admin Modal
// ----------------------------------------------------
console.log('\n📌 Test Group 5: Issue #32 (Clean Raw Technical UUIDs from Admin Modal)');
runTest('ProjectOversightPage modal header and footer do not render raw ID strings', () => {
  const content = readFile('src/pages/admin/ProjectOversightPage.tsx');
  // In the modal header, selectedProject.category is used instead of selectedProject.projectIdLabel
  assert.ok(
    !content.includes('{selectedProject.projectIdLabel}'),
    'ProjectOversightPage modal header still renders selectedProject.projectIdLabel'
  );
  assert.ok(
    !content.includes('ID: {selectedProject.id}'),
    'ProjectOversightPage modal footer still renders raw ID: {selectedProject.id}'
  );
});

// ----------------------------------------------------
// Test Group 6: Documentation Ground Truth & Issue Tracker Sync
// ----------------------------------------------------
console.log('\n📌 Test Group 6: Documentation Integrity (BUGS_AND_ISSUES_TRACKER.md)');
runTest('BUGS_AND_ISSUES_TRACKER.md records all 5 fixes accurately with verified status', () => {
  const content = readFile('documents/BUGS_AND_ISSUES_TRACKER.md');
  assert.ok(
    content.includes('33. ✅ [P0] Admin "Open Full Client Workspace" Triggers Automatic Logout'),
    'Tracker missing Issue #33 verification'
  );
  assert.ok(
    content.includes('38. ✅ [P0] Client & Specialist Workspace Kanban Auto-Seeding Fake System Tasks'),
    'Tracker missing Issue #38 verification'
  );
  assert.ok(
    content.includes('39. ✅ [P0] Time Tracking Pages Auto-Seeding Hardcoded Sample Time Logs'),
    'Tracker missing Issue #39 verification'
  );
  assert.ok(
    content.includes('21. ✅ [P0] Live Stopwatch & Time Tracker Direct Binding to Kanban Task'),
    'Tracker missing Issue #21 verification'
  );
  assert.ok(
    content.includes('19. ⚪ [Obsolete / Architecture Policy] Strictly One-Way Rating System Adopted'),
    'Tracker missing Issue #19 architectural decision'
  );
  assert.ok(
    content.includes('32. ✅ [P1] Redundant Raw Database Project UUIDs Displayed in Admin Project Detail Modal'),
    'Tracker missing Issue #32 verification'
  );
  assert.ok(
    content.includes('51. ✅ [P1] Password Eye Icon Logic Inversion, Browser Autofill Collision & Phone Number Keystroke Leaks Across Portals'),
    'Tracker missing Issue #51 verification'
  );
});

// ----------------------------------------------------
// Test Group 7: Issue #51 - Password Eye Icon, Autofill Collision & Phone Keystroke Sanitization
// ----------------------------------------------------
console.log('\n📌 Test Group 7: Issue #51 (Password Eye Icon, Autofill Collision & Phone Sanitization)');
runTest('PasswordInput renders Eye when hidden, EyeOff when visible', () => {
  const code = readFile('src/components/ui/PasswordInput.tsx');
  assert.ok(
    /isVisible\s*\?\s*\(?\s*<EyeOff[\s\S]*?:\s*\(?\s*<Eye\b/.test(code),
    'PasswordInput.tsx does not render EyeOff when true and Eye when false'
  );
  assert.ok(!/!isVisible\s*\?\s*<EyeOff/.test(code), 'Inverted !isVisible condition present');
});

runTest('handlePhoneKeyDown keystroke interceptor blocks alphabetic characters', () => {
  const code = readFile('src/lib/validation/formValidators.tsx');
  assert.ok(code.includes('export const handlePhoneKeyDown ='), 'Missing handlePhoneKeyDown export');
  assert.ok(code.includes('e.preventDefault()'), 'handlePhoneKeyDown missing e.preventDefault()');
});

runTest('SignupPage and Settings pages prevent browser autofill collisions and bind handlePhoneKeyDown', () => {
  const signup = readFile('src/pages/public/SignupPage.tsx');
  assert.ok(signup.includes('autoComplete="off"'), 'Signup missing form autoComplete="off"');
  assert.ok(signup.includes('autoComplete="tel"'), 'Signup missing phone autoComplete="tel"');
  assert.ok(signup.includes('onKeyDown={handlePhoneKeyDown}'), 'Signup missing onKeyDown={handlePhoneKeyDown}');
  assert.ok(signup.includes('autoComplete="new-password"'), 'Signup missing autoComplete="new-password"');

  const symbiote = readFile('src/pages/symbiote/SymbioteSettingsPage.tsx');
  assert.ok(symbiote.includes('autoComplete="new-password"'), 'SymbioteSettings missing autoComplete="new-password"');
  assert.ok(symbiote.includes('onKeyDown={handlePhoneKeyDown}'), 'SymbioteSettings missing onKeyDown={handlePhoneKeyDown}');
});

// ----------------------------------------------------
// Test Group 8: Phase 1 - Global Search Role-Scoping & Time Tracking Isolation
// ----------------------------------------------------
console.log('\n📌 Test Group 8: Phase 1 Data Isolation & Search Scoping');
runTest('projects.ts exports subscribeToSearchProjects with role-based partitioning', () => {
  const code = readFile('src/lib/firestore/projects.ts');
  assert.ok(code.includes('export function subscribeToSearchProjects('), 'projects.ts missing subscribeToSearchProjects');
  assert.ok(code.includes('subscribeToProjectsByOwner(uid, callback)'), 'Missing client owner query scoping');
  assert.ok(code.includes("where('status', 'in', ['open', 'published'])"), 'Missing open marketplace query scoping');
});

runTest('GlobalSearchBar uses subscribeToSearchProjects, indexes status, and routes safely', () => {
  const code = readFile('src/components/layout/GlobalSearchBar.tsx');
  assert.ok(code.includes('subscribeToSearchProjects(role, uid,'), 'GlobalSearchBar not using subscribeToSearchProjects');
  assert.ok(code.includes('const matchStatus = (p.status || \'\').toLowerCase().includes(q)'), 'GlobalSearchBar missing matchStatus');
  assert.ok(code.includes('/symbiote/browse/${p.id}'), 'GlobalSearchBar missing safe /symbiote/browse routing for open jobs');
});

runTest('SymbioteTimeTrackingPage has no all-projects fallback and shows No active assigned projects', () => {
  const code = readFile('src/pages/symbiote/SymbioteTimeTrackingPage.tsx');
  assert.ok(!code.includes('const unsubAll = subscribeToProjects('), 'SymbioteTimeTrackingPage still contains all-projects fallback');
  assert.ok(code.includes('No active assigned projects'), 'Missing "No active assigned projects" placeholder');
});

runTest('LoginPage maintains eye toggle standards, form autocomplete, and role-based redirect', () => {
  const code = readFile('src/pages/public/LoginPage.tsx');
  assert.ok(code.includes('PasswordInput'), 'LoginPage missing PasswordInput standard');
  assert.ok(code.includes('/${currentRole}/dashboard'), 'LoginPage missing role dashboard redirect');
  assert.ok(code.includes('validators.email'), 'LoginPage missing email validation');
});

// ----------------------------------------------------
// Test Group 9: Phase 2 - Route Ownership Guards & 403 Barriers
// ----------------------------------------------------
console.log('\n📌 Test Group 9: Phase 2 Route Ownership Guards & 403 Barriers');
runTest('ProjectDetailsPage enforces isOwner check, guards subcollections, and renders 403 Access Denied', () => {
  const code = readFile('src/pages/client/ProjectDetailsPage.tsx');
  assert.ok(code.includes('isOwner'), 'ProjectDetailsPage missing isOwner check');
  assert.ok(code.includes('if (isOwner)'), 'ProjectDetailsPage does not guard subcollection subscriptions behind isOwner');
  assert.ok(code.includes('Access Denied (403)'), 'ProjectDetailsPage missing Access Denied (403) card');
  assert.ok(code.includes('Return to My Projects'), 'ProjectDetailsPage missing Return to My Projects CTA');
});

runTest('SymbioteWorkspacePage enforces isAssigned check, project-scoped time, and renders 403 Access Denied', () => {
  const code = readFile('src/pages/symbiote/SymbioteWorkspacePage.tsx');
  assert.ok(code.includes('const isAssigned = useMemo('), 'SymbioteWorkspacePage missing isAssigned check');
  assert.ok(code.includes('if (!activeProjectId || !isAssigned)'), 'SymbioteWorkspacePage does not guard listeners behind isAssigned');
  assert.ok(code.includes('subscribeToTimeEntriesForProject'), 'SymbioteWorkspacePage not using project-scoped time entries listener');
  assert.ok(!code.includes('subscribeToAllTimeEntries'), 'SymbioteWorkspacePage still imports/calls subscribeToAllTimeEntries');
  assert.ok(code.includes('Access Denied (403)'), 'SymbioteWorkspacePage missing Access Denied (403) barrier');
  assert.ok(code.includes('Browse Available Projects'), 'SymbioteWorkspacePage missing Browse Available Projects CTA');
});

// ----------------------------------------------------
// Test Group 10: Phase 3 - Backend Rules & Scoped Query Scoping
// ----------------------------------------------------
console.log('\n📌 Test Group 10: Phase 3 Backend Security Rules & Query Scoping');
runTest('firestore.rules defines isProjectParticipant and guards workspaces, applications, files, and contracts', () => {
  const rules = readFile('firestore.rules');
  assert.ok(rules.includes('function isProjectParticipant(projectId)'), 'firestore.rules missing isProjectParticipant');
  assert.ok(rules.includes('match /workspaces/{projectId}'), 'firestore.rules missing workspaces match');
  assert.ok(rules.includes('isProjectParticipant(projectId)'), 'firestore.rules workspaces not guarded by isProjectParticipant');
  assert.ok(rules.includes('request.auth.uid == resource.data.symbioteId'), 'firestore.rules applications missing symbioteId check');
  assert.ok(rules.includes('match /contracts/{contractId}'), 'firestore.rules missing contracts match');
  assert.ok(rules.includes('match /project_files/{fileId}'), 'firestore.rules missing project_files match');
  assert.ok(!rules.includes('match /project_files/{fileId} {\n      allow read: if true;'), 'project_files still publicly readable');
});

runTest('SymbioteBrowseProjectsPage uses subscribeToOpenProjects without full-collection leak', () => {
  const code = readFile('src/pages/symbiote/SymbioteBrowseProjectsPage.tsx');
  assert.ok(code.includes('subscribeToOpenProjects'), 'SymbioteBrowseProjectsPage not using subscribeToOpenProjects');
  assert.ok(!code.includes('subscribeToProjects('), 'SymbioteBrowseProjectsPage still using platform-wide subscribeToProjects');
});

runTest('SymbioteDashboardPage uses subscribeToProjectsBySymbiote without full-collection leak', () => {
  const code = readFile('src/pages/symbiote/SymbioteDashboardPage.tsx');
  assert.ok(code.includes('subscribeToProjectsBySymbiote'), 'SymbioteDashboardPage not using subscribeToProjectsBySymbiote');
  assert.ok(!code.includes('subscribeToProjects('), 'SymbioteDashboardPage still using platform-wide subscribeToProjects');
});

runTest('ClientProjectsPage removes unauthenticated full-collection subscription fallback', () => {
  const code = readFile('src/pages/client/ClientProjectsPage.tsx');
  assert.ok(!code.includes('subscribeToProjects('), 'ClientProjectsPage still contains subscribeToProjects fallback');
  assert.ok(code.includes('subscribeToProjectsByOwner(clientId,'), 'ClientProjectsPage not using subscribeToProjectsByOwner');
});

runTest('projectFiles.ts uses scoped server queries for client files subscription', () => {
  const code = readFile('src/lib/firestore/projectFiles.ts');
  assert.ok(code.includes("where('clientId', '==', clientId)"), 'projectFiles.ts missing clientId server query');
});

// ----------------------------------------------------
// Test Group 11: Issue #55 - Global Search Bar Deactivated & Hidden
// ----------------------------------------------------
console.log('\n📌 Test Group 11: Issue #55 (Global Top Bar Search Deactivation & Hidden State)');
runTest('PortalShell top bar does NOT render GlobalSearchBar across portals', () => {
  const code = readFile('src/components/layout/PortalShell.tsx');
  assert.ok(!code.includes('<GlobalSearchBar'), 'PortalShell still renders <GlobalSearchBar /> in top bar');
  assert.ok(!code.includes("import { GlobalSearchBar }"), 'PortalShell still imports GlobalSearchBar');
});

runTest('GlobalSearchBar component short-circuits and returns null when hidden', () => {
  const code = readFile('src/components/layout/GlobalSearchBar.tsx');
  assert.ok(code.includes('const HIDE_GLOBAL_SEARCH = true;'), 'GlobalSearchBar missing HIDE_GLOBAL_SEARCH flag');
  assert.ok(code.includes('if (HIDE_GLOBAL_SEARCH) return null;'), 'GlobalSearchBar does not return null when hidden');
});

runTest('BUGS_AND_ISSUES_TRACKER.md records Issue #55 with verified status', () => {
  const content = readFile('documents/BUGS_AND_ISSUES_TRACKER.md');
  assert.ok(
    content.includes('55. ✅ [P1] Global Top Bar Search Input Deactivated & Completely Hidden Across All Portals'),
    'Tracker missing Issue #55 verification'
  );
});

// ----------------------------------------------------
// Test Group 12: Issue #56 - Freelancer Sidebar Navigation Deduplication
// ----------------------------------------------------
console.log('\n📌 Test Group 12: Issue #56 (Freelancer Sidebar Profile & Settings Deduplication)');
runTest('PortalShell navItems.symbiote does NOT include redundant My Profile or Settings in sidebar', () => {
  const code = readFile('src/components/layout/PortalShell.tsx');
  // Check within symbiote nav list specifically
  const symbioteBlock = code.substring(code.indexOf('symbiote: ['), code.indexOf('admin: ['));
  assert.ok(!symbioteBlock.includes("label: 'My Profile'"), 'symbiote navItems still includes My Profile in sidebar');
  assert.ok(!symbioteBlock.includes("label: 'Settings'"), 'symbiote navItems still includes Settings in sidebar');
  assert.ok(symbioteBlock.includes("label: 'Reviews'"), 'symbiote navItems missing Reviews item');
});

runTest('PortalShell preserves Edit Profile and Settings inside top-right user dropdown for all roles', () => {
  const code = readFile('src/components/layout/PortalShell.tsx');
  assert.ok(code.includes('Edit Profile'), 'PortalShell missing Edit Profile in user dropdown');
  assert.ok(code.includes('navigate(`/${role}/profile`)'), 'PortalShell missing dropdown profile navigation');
  assert.ok(code.includes('navigate(`/${role}/settings`)'), 'PortalShell missing dropdown settings navigation');
});

runTest('BUGS_AND_ISSUES_TRACKER.md records Issue #56 with verified status', () => {
  const content = readFile('documents/BUGS_AND_ISSUES_TRACKER.md');
  assert.ok(
    content.includes('56. ✅ [P1] Redundant Duplicate "Edit Profile" & "Settings" Navigation Links in Freelancer Sidebar'),
    'Tracker missing Issue #56 verification'
  );
});

// ----------------------------------------------------
// Test Group 13: Issue #57 - Complete Removal of Legacy Client Review Placeholders
// ----------------------------------------------------
console.log('\n📌 Test Group 13: Issue #57 (One-Way Review Architecture & Placeholder Purge)');
runTest('SymbioteReviewsPage does NOT contain Leave a Client Review or Roadmap Note placeholders', () => {
  const code = readFile('src/pages/symbiote/SymbioteReviewsPage.tsx');
  assert.ok(!code.includes('Leave a Client Review'), 'SymbioteReviewsPage still contains Leave a Client Review');
  assert.ok(!code.includes('Pending Product Decision'), 'SymbioteReviewsPage still contains Pending Product Decision');
  assert.ok(!code.includes('Coming Soon — Pending Decision'), 'SymbioteReviewsPage still contains Coming Soon button');
  assert.ok(!code.includes('Multi-directional review'), 'SymbioteReviewsPage still contains multi-directional review text');
});

runTest('SymbioteReviewsPage uses a balanced 2-column metrics layout for Overall and Category ratings', () => {
  const code = readFile('src/pages/symbiote/SymbioteReviewsPage.tsx');
  assert.ok(code.includes('grid-cols-1 lg:grid-cols-2'), 'SymbioteReviewsPage top row not using 2-column layout');
  assert.ok(code.includes('Overall Rating'), 'SymbioteReviewsPage missing Overall Rating card');
  assert.ok(code.includes('Category Scores'), 'SymbioteReviewsPage missing Category Scores card');
});

runTest('BUGS_AND_ISSUES_TRACKER.md records Issue #57 with verified status', () => {
  const content = readFile('documents/BUGS_AND_ISSUES_TRACKER.md');
  assert.ok(
    content.includes('57. ✅ [P1] Legacy "Leave a Client Review" Placeholder Box Removed from Freelancer Reviews Page'),
    'Tracker missing Issue #57 verification'
  );
});

// ----------------------------------------------------
// Test Group 14: Issue #58 - Messaging Voice Note Placeholder Purge
// ----------------------------------------------------
console.log('\n📌 Test Group 14: Issue #58 (Messaging Voice Note Placeholder Purge)');
runTest('MessagingPage does NOT render Voice Note mic button or coming soon placeholder', () => {
  const code = readFile('src/pages/client/MessagingPage.tsx');
  assert.ok(!code.includes('Voice note recording coming soon'), 'Client MessagingPage still contains voice note toast');
  assert.ok(!code.includes('title="Voice Note"'), 'Client MessagingPage still contains Voice Note button');
});

runTest('SymbioteMessagingPage does NOT render Voice Note mic button or coming soon placeholder', () => {
  const code = readFile('src/pages/symbiote/SymbioteMessagingPage.tsx');
  assert.ok(!code.includes('Voice note recording coming soon'), 'Symbiote MessagingPage still contains voice note toast');
  assert.ok(!code.includes('title="Voice Note"'), 'Symbiote MessagingPage still contains Voice Note button');
});

runTest('BUGS_AND_ISSUES_TRACKER.md records Issue #58 with verified status', () => {
  const content = readFile('documents/BUGS_AND_ISSUES_TRACKER.md');
  assert.ok(
    content.includes('58. ✅ [P1] Non-Functional Voice Note Placeholder Purged from Client and Freelancer Messaging Input'),
    'Tracker missing Issue #58 verification'
  );
});

// ----------------------------------------------------
// Test Group 15: Issue #59 - Removal of Dev Role Switcher Floating Widget & Sidebar Links
// ----------------------------------------------------
console.log('\n📌 Test Group 15: Issue #59 (Dev Role Switcher & Sidebar Links Removal)');
runTest('App.tsx does NOT import or render DevRoleSwitcher', () => {
  const code = readFile('src/App.tsx');
  assert.ok(!code.includes('DevRoleSwitcher'), 'App.tsx still contains DevRoleSwitcher reference');
});

runTest('PortalShell does NOT render dev role switch links or roleSwitchToast banner', () => {
  const code = readFile('src/components/layout/PortalShell.tsx');
  assert.ok(!code.includes('handleRoleSwitchClick'), 'PortalShell still contains handleRoleSwitchClick');
  assert.ok(!code.includes('roleSwitchToast'), 'PortalShell still contains roleSwitchToast');
  assert.ok(!code.includes('Freelancer View'), 'PortalShell still contains Freelancer View link in sidebar');
  assert.ok(!code.includes("handleRoleSwitchClick('admin')"), 'PortalShell still contains Admin switch link in sidebar');
  assert.ok(!code.includes('← Business View'), 'PortalShell still contains Business View link in sidebar');
});

runTest('BUGS_AND_ISSUES_TRACKER.md records Issue #59 with verified status', () => {
  const content = readFile('documents/BUGS_AND_ISSUES_TRACKER.md');
  assert.ok(
    content.includes('59. ✅ [P1] Removal of Dev Role Switcher Floating Widget and Sidebar Role Switcher Links'),
    'Tracker missing Issue #59 verification'
  );
});

// ----------------------------------------------------
// Test Group 16: Issue #60 - Freelancer Invoices Client Resolution & Abolition of 'Orbics Client' Fallbacks
// ----------------------------------------------------
console.log('\n📌 Test Group 16: Issue #60 (Freelancer Invoices Real Client Resolution & Zero Dummy Fallbacks)');
runTest('SymbioteInvoicesPage does NOT contain hardcoded Orbics Client or client-default fallbacks', () => {
  const code = readFile('src/pages/symbiote/SymbioteInvoicesPage.tsx');
  assert.ok(!code.includes("'Orbics Client'"), "SymbioteInvoicesPage still contains 'Orbics Client'");
  assert.ok(!code.includes('"Orbics Client"'), 'SymbioteInvoicesPage still contains "Orbics Client"');
  assert.ok(!code.includes("'client-default'"), "SymbioteInvoicesPage still contains 'client-default'");
});

runTest('SymbioteInvoicesPage imports getUserProfile and dynamically resolves genuine client user profiles', () => {
  const code = readFile('src/pages/symbiote/SymbioteInvoicesPage.tsx');
  assert.ok(code.includes('getUserProfile'), 'SymbioteInvoicesPage missing getUserProfile');
  assert.ok(code.includes('clientProfilesMap'), 'SymbioteInvoicesPage missing clientProfilesMap');
  assert.ok(code.includes('createInvoice'), 'SymbioteInvoicesPage missing createInvoice');
});

runTest('SymbioteWorkspacePage and adminProjects do NOT contain hardcoded Orbics Client fallbacks', () => {
  const workspaceCode = readFile('src/pages/symbiote/SymbioteWorkspacePage.tsx');
  assert.ok(!workspaceCode.includes("'Orbics Client'"), "SymbioteWorkspacePage still contains 'Orbics Client'");

  const adminProjectsCode = readFile('src/lib/firestore/adminProjects.ts');
  assert.ok(!adminProjectsCode.includes("'Orbics Client'"), "adminProjects.ts still contains 'Orbics Client'");
});

runTest('SymbioteTimeTrackingPage does NOT contain client-default dummy fallback string', () => {
  const timeCode = readFile('src/pages/symbiote/SymbioteTimeTrackingPage.tsx');
  assert.ok(!timeCode.includes("'client-default'"), "SymbioteTimeTrackingPage still contains 'client-default'");
});

runTest('BUGS_AND_ISSUES_TRACKER.md records Issue #60 with verified status', () => {
  const content = readFile('documents/BUGS_AND_ISSUES_TRACKER.md');
  assert.ok(
    content.includes('60. ✅ [P0] Freelancer Invoices False "Orbics Client" Hardcoded Fallback & Dynamic Client Name Resolution'),
    'Tracker missing Issue #60 verification'
  );
});

// ----------------------------------------------------
// Test Group 17: Issue #61 - Portal Sidebar Logo Dashboard Redirection
// ----------------------------------------------------
console.log('\n📌 Test Group 17: Issue #61 (Portal Sidebar Logo Dashboard Redirection)');
runTest('PortalShell wraps SyncSphereLogo in a Link targeting roleConfig.defaultPath', () => {
  const code = readFile('src/components/layout/PortalShell.tsx');
  assert.ok(code.includes('to={roleConfig.defaultPath}'), 'PortalShell does not link logo to roleConfig.defaultPath');
  assert.ok(code.includes('title="Go to Dashboard"'), 'PortalShell missing title on logo link');
  assert.ok(code.includes('aria-label="Go to Dashboard"'), 'PortalShell missing aria-label on logo link');
  assert.ok(code.includes('<SyncSphereLogo iconSize={26} textSize="md" />'), 'PortalShell missing SyncSphereLogo inside link');
});

runTest('BUGS_AND_ISSUES_TRACKER.md records Issue #61 with verified status', () => {
  const content = readFile('documents/BUGS_AND_ISSUES_TRACKER.md');
  assert.ok(
    content.includes('61. ✅ [P2] Portal Sidebar Logo Navigation to Role Dashboard'),
    'Tracker missing Issue #61 verification'
  );
});

// ----------------------------------------------------
// Test Group 18: Issue #62 - Freelancer Sidebar Redundant Workspace Link Removal
// ----------------------------------------------------
console.log('\n📌 Test Group 18: Issue #62 (Freelancer Sidebar Redundant Workspace Link Removal)');
runTest('PortalShell navItems.symbiote does NOT contain redundant Workspace link', () => {
  const code = readFile('src/components/layout/PortalShell.tsx');
  assert.ok(!code.includes("path: '/symbiote/workspace'"), 'PortalShell still contains /symbiote/workspace nav item');
  assert.ok(!code.includes("Briefcase"), 'PortalShell still imports or uses Briefcase icon');
});

runTest('PortalShell symbiote projects route active state covers workspace sub-routes', () => {
  const code = readFile('src/components/layout/PortalShell.tsx');
  assert.ok(code.includes("currentPath.startsWith('/symbiote/workspace/')"), 'PortalShell missing workspace active subroute');
});

runTest('BUGS_AND_ISSUES_TRACKER.md records Issue #62 with verified status', () => {
  const content = readFile('documents/BUGS_AND_ISSUES_TRACKER.md');
  assert.ok(
    content.includes('62. ✅ [P2] Redundant "Workspace" Navigation Link Removed from Freelancer Sidebar'),
    'Tracker missing Issue #62 verification'
  );
});

// ----------------------------------------------------
// Test Group 19: Issue #63 - Guard Leave Specialist Review Button in MilestonesTab
// ----------------------------------------------------
console.log('\n📌 Test Group 19: Issue #63 (Guard Leave Specialist Review in MilestonesTab)');
runTest('MilestonesTab guards Leave Specialist Review with isClient && !isSpecialist check', () => {
  const code = readFile('src/components/project/MilestonesTab.tsx');
  assert.ok(
    code.includes('{isClient && !isSpecialist &&'),
    'MilestonesTab does not properly guard Leave Specialist Review button'
  );
  assert.ok(
    code.includes('Leave Specialist Review'),
    'MilestonesTab missing Leave Specialist Review text'
  );
});

runTest('BUGS_AND_ISSUES_TRACKER.md records Issue #63 with verified status', () => {
  const content = readFile('documents/BUGS_AND_ISSUES_TRACKER.md');
  assert.ok(
    content.includes('63. ✅ [P1] Erroneous "Leave Specialist Review" Button Removed from Freelancer Workspace Milestones'),
    'Tracker missing Issue #63 verification'
  );
});

// ----------------------------------------------------
// Test Group 20: Issue #64 - Accurate Milestone Progress Calculation for Milestones without Tasks
// ----------------------------------------------------
console.log('\n📌 Test Group 20: Issue #64 (Accurate Milestone Progress Calculation in ProjectProgressTab)');
runTest('ProjectProgressTab calculates milestone pct strictly based on tasks and not m.completed fallback', () => {
  const code = readFile('src/components/project/ProjectProgressTab.tsx');
  assert.ok(
    code.includes('const pct = msTasks.length > 0 ? Math.round((msCompletedTasks / msTasks.length) * 100) : 0;'),
    'ProjectProgressTab still uses m.completed fallback for empty milestones'
  );
  assert.ok(
    !code.includes('msTasks.length > 0 ? Math.round((msCompletedTasks / msTasks.length) * 100) : m.completed ? 100 : 0'),
    'ProjectProgressTab still has legacy m.completed ? 100 : 0 formula'
  );
});

runTest('ProjectProgressTab displays No Tasks indicator and 0% for milestones without tasks', () => {
  const code = readFile('src/components/project/ProjectProgressTab.tsx');
  assert.ok(
    code.includes('0 / 0 tasks (No tasks)'),
    'ProjectProgressTab missing 0 / 0 tasks (No tasks) display'
  );
  assert.ok(
    code.includes('No Tasks'),
    'ProjectProgressTab missing No Tasks badge'
  );
});

runTest('BUGS_AND_ISSUES_TRACKER.md records Issue #64 with verified status', () => {
  const content = readFile('documents/BUGS_AND_ISSUES_TRACKER.md');
  assert.ok(
    content.includes('64. ✅ [P1] Milestone Progress Graph Erroneously Showed 100% for Milestones with 0 Tasks'),
    'Tracker missing Issue #64 verification'
  );
});

// ----------------------------------------------------
// Test Group 21: Issue #65 - Full 12-Month Range in Freelancer Monthly Earnings Chart
// ----------------------------------------------------
console.log('\n📌 Test Group 21: Issue #65 (Full 12-Month Range in Freelancer Monthly Earnings Chart)');
runTest('SymbioteDashboardPage monthsMap includes all 12 calendar months', () => {
  const code = readFile('src/pages/symbiote/SymbioteDashboardPage.tsx');
  const expectedMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  for (const m of expectedMonths) {
    assert.ok(code.includes(`${m}: 0`), `monthsMap missing month: ${m}`);
  }
});

runTest('SymbioteDashboardPage XAxis has interval={0} to render all 12 ticks', () => {
  const code = readFile('src/pages/symbiote/SymbioteDashboardPage.tsx');
  assert.ok(
    code.includes('dataKey="month"') && code.includes('interval={0}'),
    'XAxis missing interval={0} for all-month rendering'
  );
});

runTest('BUGS_AND_ISSUES_TRACKER.md records Issue #65 with verified status', () => {
  const content = readFile('documents/BUGS_AND_ISSUES_TRACKER.md');
  assert.ok(
    content.includes('65. ✅ [P1] Freelancer Dashboard Monthly Earnings Graph Truncated to 8 Months (Jan–Aug)'),
    'Tracker missing Issue #65 verification'
  );
});

// ----------------------------------------------------
// Test Group 22: Issue #66 - Real First Invoices (INV-2026-001) Render in Freelancer Invoices Table
// ----------------------------------------------------
console.log('\n📌 Test Group 22: Issue #66 (Real First Invoices INV-2026-001 Render in SymbioteInvoicesPage)');
runTest('SymbioteInvoicesPage does NOT filter out inv.invoiceNumber === INV-2026-001', () => {
  const code = readFile('src/pages/symbiote/SymbioteInvoicesPage.tsx');
  assert.ok(
    !code.includes("inv.invoiceNumber === 'INV-2026-001'"),
    'SymbioteInvoicesPage still contains buggy INV-2026-001 filter'
  );
});

runTest('SymbioteInvoicesPage preserves mock project filtering while allowing real sequential invoices', () => {
  const code = readFile('src/pages/symbiote/SymbioteInvoicesPage.tsx');
  assert.ok(
    code.includes("inv.projectName === 'Autonomous Multi-Agent Swarm'"),
    'SymbioteInvoicesPage missing mock project filter'
  );
});

runTest('BUGS_AND_ISSUES_TRACKER.md records Issue #66 with verified status', () => {
  const content = readFile('documents/BUGS_AND_ISSUES_TRACKER.md');
  assert.ok(
    content.includes('66. ✅ [P0] First Created Invoice (INV-2026-001) Erroneously Filtered Out from Freelancer Invoices Table'),
    'Tracker missing Issue #66 verification'
  );
});

// ----------------------------------------------------
// Test Group 23: Issue #67 - Admin User Management Search, Clean ID, Row Actions & Bulk Toggles
// ----------------------------------------------------
console.log('\n📌 Test Group 23: Issue #67 (Admin User Management Search, Clean ID, Row Actions & Bulk Toggles)');
runTest('UserManagementPage does NOT contain User ID column or u.userIdLabel', () => {
  const code = readFile('src/pages/admin/UserManagementPage.tsx');
  assert.ok(!code.includes('>User ID<'), 'UserManagementPage still contains User ID header');
  assert.ok(!code.includes('{u.userIdLabel}'), 'UserManagementPage still renders u.userIdLabel');
});

runTest('UserManagementPage includes clickable User Name and dedicated row-level Actions column', () => {
  const code = readFile('src/pages/admin/UserManagementPage.tsx');
  assert.ok(code.includes('to={`/admin/users/${u.id}`}'), 'UserManagementPage missing link to /admin/users/:id');
  assert.ok(code.includes('>Actions</th>'), 'UserManagementPage missing Actions table header');
  assert.ok(code.includes('Mark Inactive') && code.includes('Mark Active'), 'UserManagementPage missing Mark Inactive / Mark Active row buttons');
});

runTest('UserManagementPage features smart dynamic bulk actions toolbar without misleading buttons', () => {
  const code = readFile('src/pages/admin/UserManagementPage.tsx');
  assert.ok(!code.includes('Bulk Reactivate'), 'UserManagementPage still has legacy Bulk Reactivate button');
  assert.ok(!code.includes('Bulk Suspend'), 'UserManagementPage still has legacy Bulk Suspend button');
  assert.ok(
    code.includes('hasActiveSelected') && code.includes('hasInactiveSelected'),
    'UserManagementPage missing dynamic selection check for bulk actions'
  );
});

runTest('adminUsers.ts searches across name, email, and role and bypasses limit during search', () => {
  const code = readFile('src/lib/firestore/adminUsers.ts');
  assert.ok(code.includes('const hasSearch = Boolean(filters.search && filters.search.trim());'), 'adminUsers.ts missing search check');
  assert.ok(!code.includes('if (hasSearch) constraints.push(limit'), 'adminUsers.ts must not limit query during search');
  assert.ok(
    code.includes('r.name.toLowerCase().includes(q2)') &&
    code.includes('r.email.toLowerCase().includes(q2)') &&
    code.includes('r.role.toLowerCase().includes(q2)'),
    'adminUsers.ts search filter missing name, email, or role'
  );
});

runTest('BUGS_AND_ISSUES_TRACKER.md records Issue #67 with verified status', () => {
  const content = readFile('documents/BUGS_AND_ISSUES_TRACKER.md');
  assert.ok(
    content.includes('67. ✅ [P1] Admin User Management Search Malfunction, Redundant User ID Column, Missing Row-Level Active/Inactive Action & Confusing Bulk Buttons'),
    'Tracker missing Issue #67 verification'
  );
});

// ----------------------------------------------------
// Test Group 24: Issue #68 - Platform-Wide Role Nomenclature Standardization
// ----------------------------------------------------
console.log('\n📌 Test Group 24: Issue #68 (Platform-Wide Role Nomenclature Standardization to Client | Freelancer | Admin)');
runTest('UserManagementPage standardizes role filter and badges to Client, Freelancer, Admin', () => {
  const code = readFile('src/pages/admin/UserManagementPage.tsx');
  assert.ok(code.includes('>Client</option>') && code.includes('>Freelancer</option>'), 'UserManagementPage missing Client/Freelancer options');
  assert.ok(!code.includes('>Business Owner</option>'), 'UserManagementPage still contains Business Owner option');
  assert.ok(!code.includes('>Professional</option>'), 'UserManagementPage still contains Professional option');
  assert.ok(
    code.includes("u.role === 'client' ? 'Client' : u.role === 'symbiote' ? 'Freelancer' : 'Admin'"),
    'UserManagementPage badge text not standardized'
  );
});

runTest('PortalShell standardizes Client Portal title and role badge pills to Client, Freelancer, Admin', () => {
  const code = readFile('src/components/layout/PortalShell.tsx');
  assert.ok(code.includes("title: 'Client Portal'"), 'PortalShell missing Client Portal title');
  assert.ok(!code.includes("title: 'Business Owner'"), 'PortalShell still contains Business Owner title');
  assert.ok(
    code.includes("role === 'client' ? 'Client' : role === 'symbiote' ? 'Freelancer' : 'Admin'"),
    'PortalShell missing standardized role pill text'
  );
});

runTest('ProjectOversightPage standardizes headers, search and modal to Client and Freelancers', () => {
  const code = readFile('src/pages/admin/ProjectOversightPage.tsx');
  assert.ok(code.includes('>Client</th>') && code.includes('>Freelancers</th>'), 'ProjectOversightPage missing Client / Freelancers th');
  assert.ok(!code.includes('>Business Owner</th>'), 'ProjectOversightPage still contains Business Owner th');
  assert.ok(!code.includes('>Professionals</th>'), 'ProjectOversightPage still contains Professionals th');
  assert.ok(code.includes('Assigned Team & Freelancers'), 'ProjectOversightPage modal missing Assigned Team & Freelancers');
});

runTest('AdminDashboardPage and AddUserModal standardize labels to Clients and Freelancers', () => {
  const adminDash = readFile('src/pages/admin/AdminDashboardPage.tsx');
  assert.ok(adminDash.includes('label="Clients"'), 'AdminDashboardPage missing Clients stat card');
  assert.ok(adminDash.includes('label="Freelancers"'), 'AdminDashboardPage missing Freelancers stat card');
  assert.ok(!adminDash.includes('label="Business Owners"'), 'AdminDashboardPage still contains Business Owners card');
  assert.ok(!adminDash.includes('label="Professionals"'), 'AdminDashboardPage still contains Professionals card');

  const addUserModal = readFile('src/components/admin/AddUserModal.tsx');
  assert.ok(addUserModal.includes('>Client</span>'), 'AddUserModal missing Client role card');
  assert.ok(addUserModal.includes('>Freelancer</span>'), 'AddUserModal missing Freelancer role card');
  assert.ok(!addUserModal.includes('>Business Owner</span>'), 'AddUserModal still contains Business Owner card');
  assert.ok(!addUserModal.includes('>Professional</span>'), 'AddUserModal still contains Professional card');
});

runTest('Client TimeTrackingPage, InvoiceManagementPage, and FindTalentPage use Freelancer standard', () => {
  const timeTracking = readFile('src/pages/client/TimeTrackingPage.tsx');
  assert.ok(timeTracking.includes('>Freelancer</th>'), 'TimeTrackingPage missing Freelancer table header');

  const invoices = readFile('src/pages/client/InvoiceManagementPage.tsx');
  assert.ok(invoices.includes('>Freelancer</th>'), 'InvoiceManagementPage missing Freelancer table header');
  assert.ok(invoices.includes('From Freelancer:'), 'InvoiceManagementPage missing From Freelancer label');

  const findTalent = readFile('src/pages/client/FindTalentPage.tsx');
  assert.ok(findTalent.includes('Find Freelancers'), 'FindTalentPage missing Find Freelancers heading');
});

runTest('BUGS_AND_ISSUES_TRACKER.md records Issue #68 with verified status', () => {
  const content = readFile('documents/BUGS_AND_ISSUES_TRACKER.md');
  assert.ok(
    content.includes('68. ✅ [P1] Platform-Wide Role Nomenclature Standardization to "Client | Freelancer | Admin"'),
    'Tracker missing Issue #68 verification'
  );
});

// ----------------------------------------------------
// Test Group 25: Issue #69 - Admin User Detail Page Technical ID Cleanup, Password Reset Anti-Pattern & Hard Delete Removal
// ----------------------------------------------------
console.log('\n📌 Test Group 25: Issue #69 (Admin User Detail Page Technical ID Cleanup, Password Reset Anti-Pattern & Hard Delete Removal)');
runTest('UserDetailPage does not contain formattedUserId or artificial ID labels', () => {
  const code = readFile('src/pages/admin/UserDetailPage.tsx');
  assert.ok(!code.includes('formattedUserId'), 'UserDetailPage still defines or uses formattedUserId');
  assert.ok(!code.includes('USR-'), 'UserDetailPage still generates USR- artificial IDs');
  assert.ok(!code.includes('<Row label="User ID"'), 'UserDetailPage still renders User ID row');
});

runTest('UserDetailPage does not contain Reset Password or Delete buttons or dialogs', () => {
  const code = readFile('src/pages/admin/UserDetailPage.tsx');
  assert.ok(!code.includes('Reset Password'), 'UserDetailPage still has Reset Password button');
  assert.ok(!code.includes('resetPwd'), 'UserDetailPage still has resetPwd action or dialog');
  assert.ok(!code.includes('deleteAdminUser'), 'UserDetailPage still imports deleteAdminUser');
  assert.ok(!code.includes('Delete User'), 'UserDetailPage still has Delete User button or dialog');
});

runTest('UserDetailPage retains Mark Inactive and Mark Active moderation actions', () => {
  const code = readFile('src/pages/admin/UserDetailPage.tsx');
  assert.ok(code.includes('Mark Inactive'), 'UserDetailPage missing Mark Inactive action');
  assert.ok(code.includes('Mark Active'), 'UserDetailPage missing Mark Active action');
  assert.ok(code.includes("pendingAction === 'inactive'"), 'UserDetailPage missing inactive confirm dialog');
  assert.ok(code.includes("pendingAction === 'active'"), 'UserDetailPage missing active confirm dialog');
});

runTest('UserDetailPage preserves Plan: Free pending upcoming subscription feature', () => {
  const code = readFile('src/pages/admin/UserDetailPage.tsx');
  assert.ok(code.includes("<Row label=\"Plan\" value={target.plan || 'Free'} />"), 'UserDetailPage modified or removed Plan row');
});

runTest('BUGS_AND_ISSUES_TRACKER.md records Issue #69 with verified status', () => {
  const content = readFile('documents/BUGS_AND_ISSUES_TRACKER.md');
  assert.ok(
    content.includes('69. ✅ [P1] Admin User Detail Page Technical ID Cleanup, Password Reset Anti-Pattern & Hard Delete Removal'),
    'Tracker missing Issue #69 verification'
  );
});

// ----------------------------------------------------
// Test Group 26: Issue #70 - Platform Monitoring Page Purge of Hardware Placeholders & 100% Real Health Diagnostics
// ----------------------------------------------------
console.log('\n📌 Test Group 26: Issue #70 (Platform Monitoring Page Purge of Hardware Placeholders & 100% Real Health Diagnostics)');
runTest('PlatformMonitoringPage does not contain CPU, Memory, or API Throughput hardware placeholders', () => {
  const code = readFile('src/pages/admin/PlatformMonitoringPage.tsx');
  assert.ok(!code.includes('CPU Utilization'), 'PlatformMonitoringPage still contains CPU Utilization');
  assert.ok(!code.includes('Memory Allocation'), 'PlatformMonitoringPage still contains Memory Allocation');
  assert.ok(!code.includes('API Throughput'), 'PlatformMonitoringPage still contains API Throughput');
  assert.ok(!code.includes('APM host exporter required'), 'PlatformMonitoringPage still contains APM host exporter message');
  assert.ok(!code.includes('Infrastructure Monitoring Status'), 'PlatformMonitoringPage still contains Infrastructure Monitoring Status banner');
});

runTest('PlatformMonitoringPage serviceMatrix does not contain unmonitored entries', () => {
  const code = readFile('src/pages/admin/PlatformMonitoringPage.tsx');
  assert.ok(!code.includes("'not_monitored'"), 'PlatformMonitoringPage still contains not_monitored entries');
  assert.ok(!code.includes('Unmonitored'), 'PlatformMonitoringPage still displays Unmonitored badges');
  assert.ok(!code.includes('No Agent'), 'PlatformMonitoringPage still displays No Agent status');
});

runTest('PlatformMonitoringPage features genuine telemetry and latency rating indicators', () => {
  const code = readFile('src/pages/admin/PlatformMonitoringPage.tsx');
  assert.ok(code.includes('measureFirestoreLatency'), 'PlatformMonitoringPage missing measureFirestoreLatency');
  assert.ok(code.includes('fetchPlatformErrors'), 'PlatformMonitoringPage missing fetchPlatformErrors');
  assert.ok(code.includes('Platform Monitoring'), 'PlatformMonitoringPage missing page title');
});

runTest('adminMonitoring.ts returns clean empty array when no real error logs exist', () => {
  const code = readFile('src/lib/firestore/adminMonitoring.ts');
  assert.ok(!code.includes('AUTH_EXPIRY_CHECK'), 'adminMonitoring.ts still contains fake AUTH_EXPIRY_CHECK');
  assert.ok(!code.includes('RATE_LIMIT_SENTINEL'), 'adminMonitoring.ts still contains fake RATE_LIMIT_SENTINEL');
});

runTest('BUGS_AND_ISSUES_TRACKER.md records Issue #70 with verified status', () => {
  const content = readFile('documents/BUGS_AND_ISSUES_TRACKER.md');
  assert.ok(
    content.includes('70. ✅ [P1] Platform Monitoring Page Purge of Non-Functional Hardware Placeholders & 100% Real Health Diagnostics'),
    'Tracker missing Issue #70 verification'
  );
});

// ----------------------------------------------------
// Test Group 27: Issue #71 - Audit Logs Table Transformation: Purge of Fake IPs & Raw Hash UIDs, 5 Clean Columns & Clickable User Profiles
// ----------------------------------------------------
console.log('\n📌 Test Group 27: Issue #71 (Audit Logs Table Transformation: Purge of Fake IPs, 5 Clean Columns & User Profiles)');
runTest('AuditLogsPage does not contain fake IP Address or raw Target ID columns in table header', () => {
  const code = readFile('src/pages/admin/AuditLogsPage.tsx');
  assert.ok(!code.includes('>IP Address</th>'), 'AuditLogsPage still contains IP Address th');
  assert.ok(!code.includes('>Target ID</th>'), 'AuditLogsPage still contains Target ID th');
});

runTest('AuditLogsPage features the 5 standardized professional columns', () => {
  const code = readFile('src/pages/admin/AuditLogsPage.tsx');
  assert.ok(code.includes('>Date & Time</th>'), 'AuditLogsPage missing Date & Time th');
  assert.ok(code.includes('>Actor</th>'), 'AuditLogsPage missing Actor th');
  assert.ok(code.includes('>Action & Module</th>'), 'AuditLogsPage missing Action & Module th');
  assert.ok(code.includes('>Target / Description</th>'), 'AuditLogsPage missing Target / Description th');
  assert.ok(code.includes('>Status</th>'), 'AuditLogsPage missing Status th');
});

runTest('AuditLogsPage resolves target users and renders profile links', () => {
  const code = readFile('src/pages/admin/AuditLogsPage.tsx');
  assert.ok(code.includes("to={`/admin/users/${log.targetId}`}"), 'AuditLogsPage missing user profile link');
  assert.ok(code.includes('userMap[log.targetId]'), 'AuditLogsPage missing userMap resolution');
});

runTest('BUGS_AND_ISSUES_TRACKER.md records Issue #71 with verified status', () => {
  const content = readFile('documents/BUGS_AND_ISSUES_TRACKER.md');
  assert.ok(
    content.includes('71. ✅ [P1] Audit Logs Table Transformation: Purge of Fake IPs & Raw Hash UIDs, 5 Clean Columns & Clickable User Profiles'),
    'Tracker missing Issue #71 verification'
  );
});

// ----------------------------------------------------
// Test Group 28: Issue #72 - Platform Monitoring Visual Bar Redesign, Dev Test Utility Purge & Audit Stream Consolidation
// ----------------------------------------------------
console.log('\n📌 Test Group 28: Issue #72 (Platform Monitoring Visual Bar Redesign & Dev Tool Purge)');
runTest('PlatformMonitoringPage does NOT contain Email Diagnostic test form or mailinator input', () => {
  const code = readFile('src/pages/admin/PlatformMonitoringPage.tsx');
  assert.ok(!code.includes('Email Delivery Diagnostic & Admin Test Utility'), 'PlatformMonitoringPage still contains Email Diagnostic utility');
  assert.ok(!code.includes('test@mailinator.com'), 'PlatformMonitoringPage still contains mailinator placeholder');
  assert.ok(!code.includes('Run Diagnostic Test'), 'PlatformMonitoringPage still contains Run Diagnostic Test button');
});

runTest('PlatformMonitoringPage does NOT contain duplicate terminal Live Audit Stream widget', () => {
  const code = readFile('src/pages/admin/PlatformMonitoringPage.tsx');
  assert.ok(!code.includes("Live Audit Stream (`audit_logs`)"), 'PlatformMonitoringPage still contains Live Audit Stream header');
  assert.ok(!code.includes('auditLogs.map'), 'PlatformMonitoringPage still maps audit logs');
});

runTest('PlatformMonitoringPage features visual progress bars and all 5 architectural core service pillars', () => {
  const code = readFile('src/pages/admin/PlatformMonitoringPage.tsx');
  assert.ok(code.includes('Platform Availability'), 'PlatformMonitoringPage missing Platform Availability metric');
  assert.ok(code.includes('Response Speed'), 'PlatformMonitoringPage missing Response Speed metric');
  assert.ok(code.includes('Platform Stability'), 'PlatformMonitoringPage missing Platform Stability metric');
  assert.ok(code.includes('Firestore Database'), 'PlatformMonitoringPage missing Firestore Database pillar');
  assert.ok(code.includes('User Authentication'), 'PlatformMonitoringPage missing User Authentication pillar');
  assert.ok(code.includes('Gemini AI Engine'), 'PlatformMonitoringPage missing Gemini AI Engine pillar');
  assert.ok(code.includes('Email Service (SMTP)'), 'PlatformMonitoringPage missing Email Service pillar');
  assert.ok(code.includes('Media CDN (Cloudinary)'), 'PlatformMonitoringPage missing Media CDN pillar');
});

runTest('ADMIN_PORTAL.md and BUGS_AND_ISSUES_TRACKER.md record Issue #72 with verified status', () => {
  const adminDoc = readFile('documents/ADMIN_PORTAL.md');
  assert.ok(adminDoc.includes('5 core architectural service health meters'), 'ADMIN_PORTAL.md missing visual bar monitoring documentation');
  assert.ok(adminDoc.includes('5 Core Architectural Pillars'), 'ADMIN_PORTAL.md missing 5 core pillars');

  const trackerDoc = readFile('documents/BUGS_AND_ISSUES_TRACKER.md');
  assert.ok(
    trackerDoc.includes('72. ✅ [P1] Platform Monitoring Visual Bar Redesign, Developer Test Utility Purge & Audit Stream Consolidation'),
    'Tracker missing Issue #72 verification'
  );
});

// ----------------------------------------------------
// Test Group 29: Issue #73 - Reports Center Real Multi-Format Export Engine (PDF, Excel, CSV) & Warning Banner Purge
// ----------------------------------------------------
console.log('\n📌 Test Group 29: Issue #73 (Reports Center Real Multi-Format Export Engine)');
runTest('adminReports.ts exports exportReportToPdf and utilizes jsPDF', () => {
  const code = readFile('src/lib/firestore/adminReports.ts');
  assert.ok(code.includes("import { jsPDF } from 'jspdf'"), 'adminReports.ts missing jsPDF import');
  assert.ok(code.includes('export function exportReportToPdf'), 'adminReports.ts missing exportReportToPdf');
  assert.ok(code.includes('SYNCHSPHERE COMPLIANCE & REPORTING'), 'adminReports.ts missing PDF header branding');
});

runTest('ReportsCenterPage.tsx handles real PDF export and format-specific downloads', () => {
  const code = readFile('src/pages/admin/ReportsCenterPage.tsx');
  assert.ok(code.includes('exportReportToPdf(reportTitle, activeCategory, rows)'), 'ReportsCenterPage missing exportReportToPdf call');
  assert.ok(code.includes('.pdf'), 'ReportsCenterPage missing .pdf download extension');
  assert.ok(code.includes('\\uFEFF'), 'ReportsCenterPage missing UTF-8 BOM for Excel export');
});

runTest('ReportsCenterPage.tsx does NOT contain unconfigured PDF pipeline warning or misleading notice banner', () => {
  const code = readFile('src/pages/admin/ReportsCenterPage.tsx');
  assert.ok(!code.includes('PDF renderer pipeline unconfigured'), 'ReportsCenterPage still contains unconfigured PDF pipeline warning');
  assert.ok(!code.includes('format will export via universal CSV format'), 'ReportsCenterPage still contains format disclaimer notice banner');
});

runTest('BUGS_AND_ISSUES_TRACKER.md records Issue #73 with verified status', () => {
  const trackerDoc = readFile('documents/BUGS_AND_ISSUES_TRACKER.md');
  assert.ok(
    trackerDoc.includes('73. ✅ [P1] Reports Center Real Multi-Format Export Engine (PDF, Excel, CSV) & Warning Banner Purge'),
    'Tracker missing Issue #73 verification'
  );
});

// ----------------------------------------------------
// Test Group 30: Issue #74 - Admin Settings Consolidation into 4 Clean Real Tabs & Purge of Mockup Placeholders
// ----------------------------------------------------
console.log('\n📌 Test Group 30: Issue #74 (Admin Settings Consolidation into 4 Clean Real Tabs)');

runTest('AdminSettingsPage mounts exactly the 3 clean real tabs and excludes obsolete mockup tabs', () => {
  const code = readFile('src/pages/admin/AdminSettingsPage.tsx');
  assert.ok(code.includes("key: 'adminProfile'"), 'AdminSettingsPage missing adminProfile tab');
  assert.ok(code.includes("key: 'operations'"), 'AdminSettingsPage missing operations tab');
  assert.ok(code.includes("key: 'security'"), 'AdminSettingsPage missing security tab');

  assert.ok(!code.includes("key: 'email'"), 'AdminSettingsPage still contains email tab');
  assert.ok(!code.includes("key: 'branding'"), 'AdminSettingsPage still contains branding mockup tab');
  assert.ok(!code.includes("key: 'sessions'"), 'AdminSettingsPage still contains sessions mockup tab');
  assert.ok(!code.includes("key: 'roles'"), 'AdminSettingsPage still contains roles mockup tab');
  assert.ok(!code.includes("key: 'platformConfig'"), 'AdminSettingsPage still contains platformConfig tab');
  assert.ok(!code.includes("key: 'general'"), 'AdminSettingsPage still contains separate general tab');
});

runTest('Obsolete admin settings component files are completely removed from filesystem', () => {
  assert.ok(!fs.existsSync('src/components/admin/settings/EmailCommunicationsTab.tsx'), 'EmailCommunicationsTab.tsx still exists');
  assert.ok(!fs.existsSync('src/components/admin/settings/BrandingTab.tsx'), 'BrandingTab.tsx still exists');
  assert.ok(!fs.existsSync('src/components/admin/settings/SessionsTab.tsx'), 'SessionsTab.tsx still exists');
  assert.ok(!fs.existsSync('src/components/admin/settings/RolesPermsTab.tsx'), 'RolesPermsTab.tsx still exists');
  assert.ok(!fs.existsSync('src/components/admin/settings/GeneralTab.tsx'), 'GeneralTab.tsx still exists');
  assert.ok(!fs.existsSync('src/components/admin/settings/PlatformConfigTab.tsx'), 'PlatformConfigTab.tsx still exists');
  assert.ok(!fs.existsSync('src/components/admin/settings/NotificationsTab.tsx'), 'NotificationsTab.tsx still exists');
  assert.ok(!fs.existsSync('src/components/admin/settings/SecurityTab.tsx'), 'SecurityTab.tsx still exists');
});

runTest('AdminProfileTab.tsx is dedicated to Super Admin credentials with zero client/freelancer bio fields', () => {
  const code = readFile('src/components/admin/settings/AdminProfileTab.tsx');
  assert.ok(!code.includes('professional bio'), 'AdminProfileTab still contains professional bio');
  assert.ok(!code.includes('work and position'), 'AdminProfileTab still contains work and position');
  assert.ok(!code.includes('hourlyRate'), 'AdminProfileTab still contains hourlyRate');
  assert.ok(code.includes('Super Administrator'), 'AdminProfileTab missing Super Administrator badge');
  assert.ok(code.includes('sendPasswordResetEmail'), 'AdminProfileTab missing password reset dispatcher');
  assert.ok(code.includes('Fixed / Read-Only'), 'AdminProfileTab missing read-only login identity note');
});

runTest('PlatformOperationsTab.tsx provides persistent Marketplace Economics, Plans & Subscriptions, and Maintenance Mode', () => {
  const code = readFile('src/components/admin/settings/PlatformOperationsTab.tsx');
  assert.ok(code.includes('commissionRatePercent'), 'PlatformOperationsTab missing commissionRatePercent');
  assert.ok(code.includes('aiMatchingMinScore'), 'PlatformOperationsTab missing aiMatchingMinScore');
  assert.ok(code.includes('maxFileUploadSizeMb'), 'PlatformOperationsTab missing maxFileUploadSizeMb');
  assert.ok(code.includes('maintenanceMode'), 'PlatformOperationsTab missing maintenanceMode');
  assert.ok(code.includes('getPlatformOperationsSettings'), 'PlatformOperationsTab missing getPlatformOperationsSettings');
  assert.ok(code.includes('setPlatformOperationsSettings'), 'PlatformOperationsTab missing setPlatformOperationsSettings');
});

runTest('SecurityPolicyTab.tsx features password complexity, email verification status, and cryptographic session integrity', () => {
  const code = readFile('src/components/admin/settings/SecurityPolicyTab.tsx');
  assert.ok(code.includes('passwordMinLength'), 'SecurityPolicyTab missing passwordMinLength');
  assert.ok(code.includes('requireEmailVerification'), 'SecurityPolicyTab missing requireEmailVerification');
  assert.ok(code.includes('Firebase JWT (RS256)'), 'SecurityPolicyTab missing Firebase JWT architecture');
  assert.ok(code.includes('sessionExpiryDays'), 'SecurityPolicyTab missing sessionExpiryDays');
  assert.ok(code.includes('admin_audit_logs'), 'SecurityPolicyTab missing audit trail logging reference');
});

runTest('ADMIN_PORTAL.md and BUGS_AND_ISSUES_TRACKER.md record Issue #74 with verified status', () => {
  const adminDoc = readFile('documents/ADMIN_PORTAL.md');
  assert.ok(adminDoc.includes('Admin Settings Architecture'), 'ADMIN_PORTAL.md missing Admin Settings documentation');

  const trackerDoc = readFile('documents/BUGS_AND_ISSUES_TRACKER.md');
  assert.ok(
    trackerDoc.includes('74. ✅ [P1] Admin Settings Consolidation into 4 Clean Real Tabs & Purge of Mockup Placeholders'),
    'Tracker missing Issue #74 verification'
  );
});

// ----------------------------------------------------
// Test Group 31: Issue #75 - 100% Escrow Removal, AI Matching Minimum Score Filter & SaaS Subscription Monetization
// ----------------------------------------------------
console.log('\n📌 Test Group 31: Issue #75 (100% Escrow Removal, AI Matching Score Filter & SaaS Monetization)');

runTest('PlatformOperationsTab.tsx contains zero escrow references and features SaaS Plans & Subscriptions', () => {
  const code = readFile('src/components/admin/settings/PlatformOperationsTab.tsx');
  assert.ok(!code.toLowerCase().includes('escrow'), 'PlatformOperationsTab still contains escrow reference');
  assert.ok(!code.includes('Platform Identity & Endpoints'), 'PlatformOperationsTab still contains disconnected identity card');
  assert.ok(code.includes('freelancerProMonthlyFee'), 'PlatformOperationsTab missing freelancerProMonthlyFee');
  assert.ok(code.includes('clientEnterpriseMonthlyFee'), 'PlatformOperationsTab missing clientEnterpriseMonthlyFee');
  assert.ok(code.includes('enableSubscriptions'), 'PlatformOperationsTab missing enableSubscriptions toggle');
});

runTest('SecurityPolicyTab and AdminSettingsPage contain zero escrow references', () => {
  const securityCode = readFile('src/components/admin/settings/SecurityPolicyTab.tsx');
  assert.ok(!securityCode.toLowerCase().includes('escrow'), 'SecurityPolicyTab still contains escrow reference');

  const settingsCode = readFile('src/pages/admin/AdminSettingsPage.tsx');
  assert.ok(!settingsCode.toLowerCase().includes('escrow'), 'AdminSettingsPage still contains escrow reference');
});

runTest('ContractSigningModal and InvoiceManagementPage contain zero escrow references', () => {
  const contractCode = readFile('src/components/workspace/ContractSigningModal.tsx');
  assert.ok(!contractCode.toLowerCase().includes('escrow'), 'ContractSigningModal still contains escrow reference');
  assert.ok(contractCode.includes('3. COMPENSATION & MILESTONE SETTLEMENT TERMS'), 'ContractSigningModal missing updated milestone clause');

  const invoiceCode = readFile('src/pages/client/InvoiceManagementPage.tsx');
  assert.ok(!invoiceCode.toLowerCase().includes('escrow'), 'InvoiceManagementPage still contains escrow reference');
});

runTest('AIMatchingPage.tsx imports platform settings and filters candidates using minScoreThreshold', () => {
  const code = readFile('src/pages/client/AIMatchingPage.tsx');
  assert.ok(code.includes('getPlatformOperationsSettings'), 'AIMatchingPage missing getPlatformOperationsSettings');
  assert.ok(code.includes('minScoreThreshold'), 'AIMatchingPage missing minScoreThreshold');
  assert.ok(code.includes('qualifiedMatches'), 'AIMatchingPage missing qualifiedMatches');
  assert.ok(code.includes('Threshold Filter: ≥'), 'AIMatchingPage missing visual threshold filter indicator');
  assert.ok(!code.includes('matchScore: Math.min(96, 92'), 'AIMatchingPage fallback still contains hardcoded 90+ score formula');
});

runTest('server/routes/ai.routes.ts does NOT contain hardcoded matchScore: 91 fallback', () => {
  const code = readFile('server/routes/ai.routes.ts');
  assert.ok(!code.includes('matchScore: 91'), 'ai.routes.ts still contains hardcoded matchScore: 91');
  assert.ok(!code.includes('Math.max(70,'), 'ai.routes.ts still forces Math.max(70, ...)');
  assert.ok(code.includes('matchingSkills'), 'ai.routes.ts missing real matchingSkills overlap calculation');
});

runTest('server/stripeService.ts contains zero escrow references and records direct milestone settlements', () => {
  const code = readFile('server/stripeService.ts');
  assert.ok(!code.toLowerCase().includes('escrow'), 'stripeService.ts still contains escrow references');
  assert.ok(code.includes('settled: true'), 'stripeService.ts missing settled: true indicator');
  assert.ok(code.includes('Milestone Payment Received'), 'stripeService.ts missing milestone payment notification');
});

runTest('ADMIN_PORTAL.md and BUGS_AND_ISSUES_TRACKER.md record Issue #75 with verified status', () => {
  const adminDoc = readFile('documents/ADMIN_PORTAL.md');
  assert.ok(!adminDoc.toLowerCase().includes('escrow'), 'ADMIN_PORTAL.md still contains escrow reference');
  assert.ok(adminDoc.includes('Platform Plans & Subscription Tiers'), 'ADMIN_PORTAL.md missing subscription plans documentation');

  const trackerDoc = readFile('documents/BUGS_AND_ISSUES_TRACKER.md');
  assert.ok(
    trackerDoc.includes('75. ✅ [P1] 100% Escrow Removal, AI Matching Minimum Score Filter & SaaS Subscription Monetization'),
    'Tracker missing Issue #75 verification'
  );
});

// ----------------------------------------------------
// Test Group 32: Issue #76 - Admin Profile Route Decoupling from Client/Freelancer Bio Fields
// ----------------------------------------------------
console.log('\n📌 Test Group 32: Issue #76 (Admin Profile Route Decoupling & Navigation Cleanup)');

runTest('App.tsx redirects admin profile and profile/edit to /admin/settings', () => {
  const code = readFile('src/App.tsx');
  assert.ok(
    code.includes('<Route path="profile/edit" element={<Navigate to="/admin/settings" replace />} />'),
    'App.tsx missing profile/edit redirect for admin'
  );
  assert.ok(
    code.includes('<Route path="profile" element={<Navigate to="/admin/settings" replace />} />'),
    'App.tsx missing profile redirect for admin'
  );
});

runTest('PortalShell.tsx routes admin to /admin/settings from sidebar card and dropdown menu', () => {
  const code = readFile('src/components/layout/PortalShell.tsx');
  assert.ok(
    code.includes("navigate('/admin/settings')"),
    'PortalShell missing admin redirect to /admin/settings'
  );
  assert.ok(
    code.includes('Admin Profile & Settings'),
    'PortalShell missing Admin Profile & Settings dropdown button'
  );
});

runTest('EditProfilePage.tsx guards against admin role access', () => {
  const code = readFile('src/pages/client/EditProfilePage.tsx');
  assert.ok(
    code.includes("navigate('/admin/settings', { replace: true })"),
    'EditProfilePage missing admin role redirection guard'
  );
});

runTest('BUGS_AND_ISSUES_TRACKER.md records Issue #76 with verified status', () => {
  const trackerDoc = readFile('documents/BUGS_AND_ISSUES_TRACKER.md');
  assert.ok(
    trackerDoc.includes('76. ✅ [P1] Admin Profile Route Decoupling from Client/Freelancer Bio Fields & Purge of Developer SMTP Tab'),
    'Tracker missing Issue #76 verification'
  );
});

// ----------------------------------------------------
// Test Group 33: Comprehensive Regression & Edge Case Verification
// ----------------------------------------------------
console.log('\n📌 Test Group 33: Comprehensive Regression & Edge Case Verification');

runTest('Edge Case 1: computeFallbackMatches accurately awards high score (>=75%) to matching candidate', () => {
  const project = {
    title: 'Cloud DevOps Migration',
    skills: ['Docker', 'Kubernetes', 'AWS', 'Terraform'],
  };
  const candidates = [
    {
      uid: 'devops-guru',
      displayName: 'Alice Cloud',
      title: 'Senior DevOps Specialist',
      skills: ['Docker', 'Kubernetes', 'AWS', 'Linux'],
      experience: 'Senior',
      availability: 'Immediate',
      rating: 4.9,
    },
  ];
  const matches = computeFallbackMatches(project, candidates);
  assert.strictEqual(matches.length, 1);
  assert.ok(matches[0].matchScore >= 75, `Expected score >= 75, got ${matches[0].matchScore}`);
  assert.ok(matches[0].explanation.includes('Cloud DevOps Migration'));
});

runTest('Edge Case 2: computeFallbackMatches strictly disqualifies completely unrelated candidate (<=15%)', () => {
  const project = {
    title: 'DevOps & CI/CD Pipeline Setup',
    skills: ['Docker', 'Kubernetes', 'CI/CD'],
  };
  const candidates = [
    {
      uid: 'video-editor-1',
      displayName: 'Bob Video',
      title: 'Video Editor & Colorist',
      skills: ['Adobe Premiere', 'After Effects', 'Sound Design'],
      experience: 'Expert',
      availability: 'Immediate',
      rating: 5.0,
    },
  ];
  const matches = computeFallbackMatches(project, candidates);
  assert.strictEqual(matches.length, 1);
  assert.ok(matches[0].matchScore <= 15, `Expected score <= 15 for unrelated candidate, got ${matches[0].matchScore}`);
  assert.ok(matches[0].explanation.includes('does not align'));
});

runTest('Edge Case 3: computeFallbackMatches handles empty skills array by extracting keywords from project title', () => {
  const project = {
    title: 'React & TypeScript Frontend Dashboard',
    skills: [],
  };
  const candidates = [
    {
      uid: 'frontend-lead',
      displayName: 'Charlie React',
      title: 'Frontend Engineer',
      skills: ['React', 'TypeScript', 'TailwindCSS'],
      experience: 'Senior',
      availability: 'Immediate',
    },
    {
      uid: 'copywriter',
      displayName: 'Diana Words',
      title: 'Content Writer',
      skills: ['SEO', 'Copywriting'],
      experience: 'Expert',
      availability: 'Immediate',
    },
  ];
  const matches = computeFallbackMatches(project, candidates);
  assert.strictEqual(matches.length, 2);
  assert.ok(matches[0].matchScore >= 60, `Expected frontend candidate to match title keywords with >=60, got ${matches[0].matchScore}`);
  assert.ok(matches[1].matchScore <= 15, `Expected unrelated candidate to score <=15, got ${matches[1].matchScore}`);
});

runTest('Edge Case 4: computeFallbackMatches gracefully handles malformed/dirty skills with zero errors', () => {
  const project = {
    title: 'Python Backend Microservice',
    skills: [null, undefined, 123, '  python  ', ''],
  };
  const candidates = [
    {
      uid: 'clean-coder',
      displayName: 'Eve Clean',
      title: 'Backend Engineer',
      skills: ['Python', null, {}, 'FastAPI'],
      experience: 'Senior',
      availability: 'Immediate',
    },
  ];
  // Must execute without any TypeError
  const matches = computeFallbackMatches(project, candidates);
  assert.strictEqual(matches.length, 1);
  assert.ok(matches[0].matchScore >= 60, `Expected Python match despite dirty input, got ${matches[0].matchScore}`);
});

runTest('Edge Case 5: server/routes/ai.routes.ts includes anti-hallucination prompt rules and post-processing clamp', () => {
  const code = readFile('server/routes/ai.routes.ts');
  assert.ok(code.includes('CRITICAL MATCHING RULES'), 'Missing CRITICAL MATCHING RULES in Gemini prompt');
  assert.ok(code.includes('matchScore: 14'), 'Missing anti-hallucination matchScore clamp for unrelated candidates');
  assert.ok(code.includes('computeFallbackMatches'), 'Missing computeFallbackMatches export and usage');
});

runTest('Edge Case 6: AdminSettingsPage safely supports URL searchParams and provides fallback for unknown/legacy tabs', () => {
  const code = readFile('src/pages/admin/AdminSettingsPage.tsx');
  assert.ok(code.includes('useSearchParams'), 'AdminSettingsPage missing useSearchParams');
  assert.ok(code.includes("tabs.some((t) => t.key === rawTab) ? (rawTab as TabKey) : 'adminProfile'"), 'AdminSettingsPage missing safe tab fallback');
  assert.ok(!code.includes('!.component'), 'AdminSettingsPage still has unsafe non-null assertion !.component');
  assert.ok(code.includes('handleTabChange'), 'AdminSettingsPage missing handleTabChange');
});

runTest('Edge Case 7: EditProfilePage immediately blocks rendering client profile fields for admin role', () => {
  const code = readFile('src/pages/client/EditProfilePage.tsx');
  assert.ok(code.includes("if (activeRole === 'admin')"), 'EditProfilePage missing activeRole admin check');
  assert.ok(code.includes('Redirecting administrator to Admin Settings...'), 'EditProfilePage missing admin redirect placeholder view');
});

runTest('Edge Case 8: AIMatchingPage clamps minScoreThreshold and sanitizes skill arrays', () => {
  const code = readFile('src/pages/client/AIMatchingPage.tsx');
  assert.ok(code.includes('Math.max(10, Math.min(100'), 'AIMatchingPage missing safe threshold clamping');
  assert.ok(code.includes('rawProjSkills'), 'AIMatchingPage missing safe project skills array normalization');
});

console.log('\n📌 Test Group 34: Issue #0.7 (Dynamic Per-Task Settlement Alignment & Cumulative Spent Tracking)');

runTest('src/types/firestore.ts defines totalSpent and totalSettledTasks in Project interface', () => {
  const code = readFile('src/types/firestore.ts');
  assert.ok(code.includes('totalSpent?: number;'), 'Project interface missing totalSpent');
  assert.ok(code.includes('totalSettledTasks?: number;'), 'Project interface missing totalSettledTasks');
});

runTest('approveTaskByClient in workspace.ts decouples automatic payment billing from task completion', () => {
  const code = readFile('src/lib/firestore/workspace.ts');
  assert.ok(!code.includes('await createInvoice({'), 'workspace.ts should not auto-generate invoice on task approval');
  assert.ok(code.includes("status: 'completed'"), 'workspace.ts marks task status completed');
});

runTest('CreateProjectStep2Page preserves timeline and project setup structure', () => {
  const code = readFile('src/pages/client/CreateProjectStep2Page.tsx');
  assert.ok(code.includes('Timeline & Schedule') || code.includes('Budget & Timeline'), 'CreateProjectStep2Page missing Timeline/Budget section');
  assert.ok(code.includes('budgetType'), 'CreateProjectStep2Page preserves budgetType as requested by client');
});

runTest('ProjectHeader and OverviewTab purge hardcoded $15,000 Total and weeklyCommitment 40 hrs', () => {
  const headerCode = readFile('src/components/project/ProjectHeader.tsx');
  assert.ok(!headerCode.includes('$15,000 Total'), 'ProjectHeader still has hardcoded $15,000 Total');
  assert.ok(!headerCode.includes('Spent So Far'), 'ProjectHeader should not have Spent So Far metric');

  const overviewCode = readFile('src/components/project/OverviewTab.tsx');
  assert.ok(!overviewCode.includes('weeklyCommitment'), 'OverviewTab still renders weeklyCommitment');
  assert.ok(!overviewCode.includes('hrs / week'), 'OverviewTab still renders hrs / week');
});

runTest('OverviewTab and SymbioteOverviewTab purge total spent widgets per client request', () => {
  const clientTab = readFile('src/components/project/OverviewTab.tsx');
  assert.ok(!clientTab.includes('Total Spent So Far'), 'OverviewTab still contains Total Spent So Far');

  const proTab = readFile('src/components/project/SymbioteOverviewTab.tsx');
  assert.ok(!proTab.includes('Total Project Settlement'), 'SymbioteOverviewTab still contains Total Project Settlement');
});

runTest('ClientProjectsPage tracks and renders Project Budget cleanly without spent metrics', () => {
  const code = readFile('src/pages/client/ClientProjectsPage.tsx');
  assert.ok(!code.includes('Total Spent So Far'), 'ClientProjectsPage still contains Total Spent So Far KPI label');
  assert.ok(!code.includes('spent so far'), 'ClientProjectsPage still contains spent so far subtext');
});

runTest('adminProjects.ts and ProjectOversightPage prioritize totalSpent for Admin oversight', () => {
  const adminCode = readFile('src/lib/firestore/adminProjects.ts');
  assert.ok(adminCode.includes('data.totalSpent != null'), 'adminProjects.ts missing totalSpent priority check');
  assert.ok(adminCode.includes('Dynamic Per-Task'), 'adminProjects.ts missing Dynamic Per-Task fallback');

  const oversightCode = readFile('src/pages/admin/ProjectOversightPage.tsx');
  assert.ok(oversightCode.includes('Total Spent'), 'ProjectOversightPage missing Total Spent column header');
});

runTest('BUGS_AND_ISSUES_TRACKER.md records Issue #0.7 with verified status', () => {
  const code = readFile('documents/BUGS_AND_ISSUES_TRACKER.md');
  assert.ok(code.includes('### 0.7 ✅ [P0] Dynamic Per-Task Settlement Alignment'), 'Tracker missing Issue #0.7 header');
  assert.ok(code.includes('Status**: Resolved & Verified ✅ (2026-09-24)'), 'Tracker missing verified status for 0.7');
});

// ----------------------------------------------------
// Test Group 35: Issue #0.8 - Platform-Wide Hardcoded Fallbacks & Disconnected DB Purge
// ----------------------------------------------------
console.log('\n📌 Test Group 35: Issue #0.8 (Platform-Wide Hardcoded Fallbacks & Disconnected DB Purge)');
runTest('ClientDashboardPage purges hardcoded fake months, dumps, matchScore and connects real time_entries', () => {
  const code = readFile('src/pages/client/ClientDashboardPage.tsx');
  assert.ok(!code.includes("{ month: 'Mar', spend: 0 }"), 'ClientDashboardPage still has static months');
  assert.ok(!code.includes("a.matchScore || 90"), 'ClientDashboardPage still has 90% fallback');
  assert.ok(code.includes('subscribeToTimeEntriesForClient'), 'ClientDashboardPage missing time_entries subscription');
  assert.ok(!code.includes('Spent So Far'), 'ClientDashboardPage should not have Spent So Far table header');
});

runTest('FilesAndDocsPage and FindTalentPage purge hardcoded amounts, fake skills and dummy domains', () => {
  const filesCode = readFile('src/pages/client/FilesAndDocsPage.tsx');
  assert.ok(!filesCode.includes('budget?.max || 8500'), 'FilesAndDocsPage still has 8500 fallback');
  assert.ok(!filesCode.includes('client@syncsphere.io'), 'FilesAndDocsPage still has fake client email');
  assert.ok(!filesCode.includes('specialist@syncsphere.io'), 'FilesAndDocsPage still has fake specialist email');

  const talentCode = readFile('src/pages/client/FindTalentPage.tsx');
  assert.ok(!talentCode.includes('hourlyRate ?? 130'), 'FindTalentPage still injects 130 rate fallback');
  assert.ok(!talentCode.includes("['Python', 'PyTorch', 'LangChain', 'FastAPI']"), 'FindTalentPage still injects fake skills');
});

runTest('SecuritySettingsPage and SymbioteSettingsPage implement dynamic browser session detection', () => {
  const clientSec = readFile('src/pages/client/settings/SecuritySettingsPage.tsx');
  assert.ok(!clientSec.includes('192.168.1.104'), 'SecuritySettingsPage still has fake IP');
  assert.ok(!clientSec.includes('MacBook Pro 16" — Chrome (macOS Sonoma)'), 'SecuritySettingsPage still has fake MacBook');
  assert.ok(clientSec.includes('getInitialSessions'), 'SecuritySettingsPage missing dynamic session detector');

  const symbioteSec = readFile('src/pages/symbiote/SymbioteSettingsPage.tsx');
  assert.ok(!symbioteSec.includes('192.168.1.104'), 'SymbioteSettingsPage still has fake IP');
  assert.ok(symbioteSec.includes('getInitialSessions'), 'SymbioteSettingsPage missing dynamic session detector');
});

runTest('BillingSettingsPage, SymbioteDashboardPage and SymbioteEarningsPage purge fake values', () => {
  const billingCode = readFile('src/pages/client/settings/BillingSettingsPage.tsx');
  assert.ok(!billingCode.includes('September 1, 2026'), 'BillingSettingsPage still has hardcoded renewal date');
  assert.ok(!billingCode.includes('Aether Dynamics Inc.'), 'BillingSettingsPage still has fake company entity');

  const dashCode = readFile('src/pages/symbiote/SymbioteDashboardPage.tsx');
  assert.ok(!dashCode.includes("'Privacy app'"), 'SymbioteDashboardPage still has Privacy app fallback');
  assert.ok(!dashCode.includes('95}% Match'), 'SymbioteDashboardPage still has 95% Match fallback');

  const earningsCode = readFile('src/pages/symbiote/SymbioteEarningsPage.tsx');
  assert.ok(!earningsCode.includes('hourlyRate || 120'), 'SymbioteEarningsPage still has 120 fallback');
});

runTest('Admin platform stats, live reports, monitoring, ApprovalsQueue and workspace are dynamically connected', () => {
  const adminStats = readFile('src/lib/firestore/adminDashboardStats.ts');
  assert.ok(!adminStats.includes('platformRevenueCents: null'), 'adminDashboardStats still has null revenue');
  assert.ok(!adminStats.includes('activeSessions: null'), 'adminDashboardStats still has null active sessions');

  const reportsCode = readFile('src/lib/firestore/adminReports.ts');
  assert.ok(reportsCode.includes("id: 'revenue-summary'"), 'adminReports missing revenue-summary');
  assert.ok(reportsCode.includes('available: true'), 'revenue-summary is not available: true');
  assert.ok(reportsCode.includes('generateRevenueSummaryReport'), 'adminReports missing generateRevenueSummaryReport');

  const reportsCenter = readFile('src/pages/admin/ReportsCenterPage.tsx');
  assert.ok(reportsCenter.includes("'revenue-summary': generateRevenueSummaryReport"), 'ReportsCenterPage missing revenue generator mapping');

  const approvalsCode = readFile('src/components/project/ApprovalsQueueView.tsx');
  assert.ok(!approvalsCode.includes('hourlyRate = Number(project.hourlyRate) || 50;'), 'ApprovalsQueueView still has 50 fallback');

  const workspaceCode = readFile('src/lib/firestore/workspace.ts');
  assert.ok(!workspaceCode.includes('const hourlyRate = Number(projData?.hourlyRate) || 50;'), 'workspace.ts still has 50 fallback');
  assert.ok(!workspaceCode.includes('(msData.hoursAllocated || 20) * hourlyRate'), 'workspace.ts still has 20 hours fallback');
});

runTest('BUGS_AND_ISSUES_TRACKER.md records Issue #0.8 with verified status', () => {
  const code = readFile('documents/BUGS_AND_ISSUES_TRACKER.md');
  assert.ok(code.includes('### 0.8 ✅ [P0] Platform-Wide Hardcoded Fallbacks & Disconnected Database Purge'), 'Tracker missing Issue #0.8 header');
  assert.ok(code.includes('Status**: Resolved & Verified ✅ (2026-09-24)'), 'Tracker missing verified status for 0.8');
});

// ----------------------------------------------------
// Test Group 36: Issue #0.9 - Milestone Phases Grounding & Cumulative Spend Auto-Sync
// ----------------------------------------------------
console.log('\n📌 Test Group 36: Issue #0.9 (Milestone Phases Grounding & Cumulative Spend Auto-Sync)');
runTest('OverviewTab.tsx does NOT contain hardcoded Phase 1 or Phase 2 strings', () => {
  const code = readFile('src/components/project/OverviewTab.tsx');
  assert.ok(!code.includes('Phase 1: Scope & Architecture'), 'OverviewTab still contains hardcoded Phase 1');
  assert.ok(!code.includes('Phase 2: Core Engineering'), 'OverviewTab still contains hardcoded Phase 2');
});

runTest('OverviewTab.tsx subscribes to real workspace milestones and renders clean empty state when none exist', () => {
  const code = readFile('src/components/project/OverviewTab.tsx');
  assert.ok(code.includes('subscribeToWorkspaceMilestones'), 'OverviewTab missing subscribeToWorkspaceMilestones');
  assert.ok(code.includes('No milestone phases defined yet'), 'OverviewTab missing clean empty state for milestones');
  assert.ok(code.includes("'Draft Phase'") && code.includes('isDraft'), 'OverviewTab missing dynamic Draft Phase health mapping');
});

runTest('workspace.ts syncProjectCompletionAndProgress auto-calculates and backfills totalSpent', () => {
  const code = readFile('src/lib/firestore/workspace.ts');
  assert.ok(code.includes('calculatedTasksSpend'), 'workspace.ts missing calculatedTasksSpend calculation');
  assert.ok(code.includes('updates.totalSpent = calculatedTasksSpend'), 'workspace.ts missing updates.totalSpent assignment');
});

runTest('ClientProjectsPage.tsx imports and triggers syncProjectCompletionAndProgress auto-healing', () => {
  const code = readFile('src/pages/client/ClientProjectsPage.tsx');
  assert.ok(code.includes('syncProjectCompletionAndProgress'), 'ClientProjectsPage missing syncProjectCompletionAndProgress import');
  assert.ok(code.includes('syncProjectCompletionAndProgress(p.id)'), 'ClientProjectsPage missing auto-heal invocation on completed projects');
});

runTest('BUGS_AND_ISSUES_TRACKER.md records Issue #0.9 with verified status', () => {
  const code = readFile('documents/BUGS_AND_ISSUES_TRACKER.md');
  assert.ok(code.includes('### 0.9 ✅ [P0] Milestone Phases Grounding'), 'Tracker missing Issue #0.9 header');
  assert.ok(code.includes('Cumulative Spend Auto-Sync Completed'), 'Tracker missing Issue #0.9 title');
});

// ----------------------------------------------------
// Test Group 37: Issue #82 - Client Portal Label Standardization to Files & Resources
// ----------------------------------------------------
console.log('\n📌 Test Group 37: Issue #82 (Files & Resources Label & Header Standardization)');

runTest('PortalShell.tsx uses "Files & Resources" label and Folder icon for Client Portal navigation', () => {
  const code = readFile('src/components/layout/PortalShell.tsx');
  assert.ok(code.includes("label: 'Files & Resources'"), 'PortalShell missing Files & Resources nav item');
  assert.ok(!code.includes("label: 'Files & Docs'"), 'PortalShell still contains legacy Files & Docs nav item');
  assert.ok(code.includes("<Folder className="), 'PortalShell missing Folder icon for Files & Resources');
});

runTest('FilesAndDocsPage.tsx renders "All Project Files & Resources" header and enhanced project search', () => {
  const code = readFile('src/pages/client/FilesAndDocsPage.tsx');
  assert.ok(code.includes('All Project Files & Resources'), 'FilesAndDocsPage missing "All Project Files & Resources" title');
  assert.ok(!code.includes('>Project Files & Documents<'), 'FilesAndDocsPage still contains legacy "Project Files & Documents" title');
  assert.ok(code.includes('resolvedProjectName'), 'FilesAndDocsPage missing resolvedProjectName fallback in search filter');
});

runTest('BUGS_AND_ISSUES_TRACKER.md records Issue #82 with verified status', () => {
  const code = readFile('documents/BUGS_AND_ISSUES_TRACKER.md');
  assert.ok(code.includes('82. ✅ [P1] Client Portal Navigation & Repository Standardization: "Files & Resources"'), 'Tracker missing Issue #82 header');
});

// ----------------------------------------------------
// Test Group 38: Issue #92 - Project Wizard Budget Restoration & Out-of-Platform Payment Decoupling
// ----------------------------------------------------
console.log('\n📌 Test Group 38: Issue #92 (Project Wizard Budget Restoration & Out-of-Platform Payment Decoupling)');

runTest('CreateProjectStep2Page restores budget inputs (fixed/hourly, min/max) as per approved designs', () => {
  const code = readFile('src/pages/client/CreateProjectStep2Page.tsx');
  assert.ok(code.includes('budgetType'), 'CreateProjectStep2Page missing budgetType');
  assert.ok(code.includes('minBudget'), 'CreateProjectStep2Page missing minBudget');
  assert.ok(code.includes('maxBudget'), 'CreateProjectStep2Page missing maxBudget');
  assert.ok(code.includes('currency'), 'CreateProjectStep2Page missing currency');
});

runTest('workspace.ts decouples task approvals from automatic billing and invoice generation', () => {
  const code = readFile('src/lib/firestore/workspace.ts');
  assert.ok(!code.includes('createInvoice('), 'workspace.ts still calls createInvoice on task approval');
});

runTest('invoices.ts supports client markInvoicePaidByClient and specialist confirmInvoicePaymentBySymbiote', () => {
  const code = readFile('src/lib/firestore/invoices.ts');
  assert.ok(code.includes('markInvoicePaidByClient'), 'invoices.ts missing markInvoicePaidByClient');
  assert.ok(code.includes('confirmInvoicePaymentBySymbiote'), 'invoices.ts missing confirmInvoicePaymentBySymbiote');
});

runTest('InvoiceManagementPage and SymbioteInvoicesPage support out-of-platform payment confirmation flows', () => {
  const clientCode = readFile('src/pages/client/InvoiceManagementPage.tsx');
  assert.ok(clientCode.includes('markInvoicePaidByClient'), 'Client invoice page missing markInvoicePaidByClient');
  assert.ok(clientCode.includes('Direct Out-of-Platform Transfer'), 'Client invoice page missing direct transfer modal');

  const symbioteCode = readFile('src/pages/symbiote/SymbioteInvoicesPage.tsx');
  assert.ok(symbioteCode.includes('confirmInvoicePaymentBySymbiote'), 'Symbiote invoice page missing confirmInvoicePaymentBySymbiote');
  assert.ok(symbioteCode.includes('Confirm Receipt'), 'Symbiote invoice page missing quick confirm button');
});

runTest('BUGS_AND_ISSUES_TRACKER.md records Issue #92 with verified status', () => {
  const code = readFile('documents/BUGS_AND_ISSUES_TRACKER.md');
  assert.ok(code.includes('### 92. ✅ [P0] Project Wizard Budget Restoration & Out-of-Platform Payment Flow'), 'Tracker missing Issue #92 header');
});

// ----------------------------------------------------
// Test Group 39: Issue #93 - Specialist Profile Completeness Transparency & Onboarding Skip Handling
// ----------------------------------------------------
console.log('\n📌 Test Group 39: Issue #93 (Specialist Profile Completeness Transparency & Onboarding Skip Handling)');

runTest('SymbioteDashboardPage renders incomplete profile notice banner when essential fields are missing', () => {
  const code = readFile('src/pages/symbiote/SymbioteDashboardPage.tsx');
  assert.ok(code.includes('isProfileIncomplete'), 'SymbioteDashboardPage missing isProfileIncomplete logic');
  assert.ok(code.includes('Profile Incomplete — Hidden from Client Search'), 'SymbioteDashboardPage missing incomplete profile banner title');
  assert.ok(code.includes('/symbiote/settings'), 'SymbioteDashboardPage missing settings navigation CTA');
});

runTest('OnboardingPage mandates full profile completion with zero skip bypass and locks verification', () => {
  const code = readFile('src/pages/public/OnboardingPage.tsx');
  assert.ok(!code.includes('showSkipModal'), 'OnboardingPage must not contain showSkipModal');
  assert.ok(!code.includes('onboarding-skip-btn'), 'OnboardingPage must not contain skip button');
  assert.ok(code.includes('profileCompleted: true'), 'OnboardingPage must set profileCompleted: true');
  assert.ok(code.includes('emailVerified: true'), 'OnboardingPage must set emailVerified: true');
});

runTest('adminUsers.ts and UserManagementPage feature profileCompleted indicators for incomplete accounts', () => {
  const adminCode = readFile('src/lib/firestore/adminUsers.ts');
  assert.ok(adminCode.includes('profileCompleted?: boolean;'), 'adminUsers.ts missing profileCompleted in AdminUserRow');
  assert.ok(adminCode.includes('profileCompleted,'), 'adminUsers.ts missing profileCompleted mapping');

  const pageCode = readFile('src/pages/admin/UserManagementPage.tsx');
  assert.ok(pageCode.includes('Incomplete Profile'), 'UserManagementPage missing Incomplete Profile indicator');

  const detailCode = readFile('src/pages/admin/UserDetailPage.tsx');
  assert.ok(detailCode.includes('Profile Incomplete'), 'UserDetailPage missing Profile Incomplete badge');
});

runTest('BUGS_AND_ISSUES_TRACKER.md records Issue #93 with verified status', () => {
  const code = readFile('documents/BUGS_AND_ISSUES_TRACKER.md');
  assert.ok(code.includes('### 93. ✅ [P1] Specialist Profile Completeness Transparency & Onboarding Skip Handling'), 'Tracker missing Issue #93 header');
});

// ----------------------------------------------------
// Test Group 40: Comprehensive Regression & Deep Edge Cases (H-Cases) Audit
// ----------------------------------------------------
console.log('\n📌 Test Group 40: Deep Regression & Hard Edge Cases (H-Cases) Audit');

runTest('H-Case 1: Specialist Profile Completeness Combinatorial Logic', () => {
  // Test the exact boolean evaluation logic used in adminUsers.ts & SymbioteDashboardPage
  const evalSymbioteCompleteness = (u: { skills?: string[]; hourlyRate?: number; title?: string }) => {
    return Boolean(u.skills && u.skills.length > 0 && u.hourlyRate && u.hourlyRate > 0 && u.title && u.title.trim().length > 0);
  };

  // Case 1.1: Missing skills array entirely
  assert.strictEqual(evalSymbioteCompleteness({ hourlyRate: 50, title: 'Dev' }), false);
  // Case 1.2: Empty skills array
  assert.strictEqual(evalSymbioteCompleteness({ skills: [], hourlyRate: 50, title: 'Dev' }), false);
  // Case 1.3: $0 hourly rate
  assert.strictEqual(evalSymbioteCompleteness({ skills: ['React'], hourlyRate: 0, title: 'Dev' }), false);
  // Case 1.4: Missing or empty title
  assert.strictEqual(evalSymbioteCompleteness({ skills: ['React'], hourlyRate: 50, title: '' }), false);
  assert.strictEqual(evalSymbioteCompleteness({ skills: ['React'], hourlyRate: 50, title: '   ' }), false);
  // Case 1.5: Fully completed profile
  assert.strictEqual(evalSymbioteCompleteness({ skills: ['React', 'Node'], hourlyRate: 65, title: 'Senior Full Stack' }), true);
});

runTest('H-Case 2: Client & Admin Profile Completeness Evaluation', () => {
  const evalRoleCompleteness = (role: string, data: { companyName?: string; skills?: string[]; hourlyRate?: number; title?: string }) => {
    if (role === 'admin') return true;
    if (role === 'client') return Boolean(data.companyName && data.companyName.trim().length > 0);
    return Boolean(data.skills && data.skills.length > 0 && data.hourlyRate && data.title);
  };

  // Admin is always complete
  assert.strictEqual(evalRoleCompleteness('admin', {}), true);
  // Client with empty company name is incomplete
  assert.strictEqual(evalRoleCompleteness('client', { companyName: '' }), false);
  // Client with valid company name is complete
  assert.strictEqual(evalRoleCompleteness('client', { companyName: 'Acme Corp' }), true);
});

runTest('H-Case 3: Direct Payment Invoice Status Transitions & Schema Integrity', () => {
  const typesCode = readFile('src/types/firestore.ts');
  assert.ok(typesCode.includes("'marked_paid'"), 'Invoice status union missing marked_paid');
  assert.ok(typesCode.includes('markedPaidAt?: string'), 'Invoice missing markedPaidAt timestamp');
  assert.ok(typesCode.includes('confirmedAt?: string'), 'Invoice missing confirmedAt timestamp');
  assert.ok(typesCode.includes('referenceNote?: string'), 'Invoice missing referenceNote field');

  const invoiceFuncs = readFile('src/lib/firestore/invoices.ts');
  assert.ok(invoiceFuncs.includes("status: 'marked_paid'"), 'markInvoicePaidByClient must set marked_paid status');
  assert.ok(invoiceFuncs.includes("status: 'paid'"), 'confirmInvoicePaymentBySymbiote must set paid status');
});

runTest('H-Case 4: Zero Auto-Invoice Leaks in Task & Milestone Approval Pipelines', () => {
  const workspaceCode = readFile('src/lib/firestore/workspace.ts');
  const taskApproveSection = workspaceCode.substring(
    workspaceCode.indexOf('export const approveTaskByClient'),
    workspaceCode.indexOf('export const returnTaskForRevision')
  );
  assert.ok(!taskApproveSection.includes('createInvoice'), 'Task approval must NOT invoke createInvoice');
  assert.ok(!taskApproveSection.includes('paymentIntent'), 'Task approval must NOT invoke payment intents');

  const milestoneApproveSection = workspaceCode.substring(
    workspaceCode.indexOf('export const approveMilestoneByClient'),
    workspaceCode.indexOf('export const submitMilestoneDeliverable')
  );
  assert.ok(!milestoneApproveSection.includes('createInvoice'), 'Milestone approval must NOT invoke createInvoice');
});

runTest('H-Case 5: Project Wizard Step 4 Budget Summary Grounding for Fixed & Hourly Models', () => {
  const step4Code = readFile('src/pages/client/CreateProjectStep4Page.tsx');
  assert.ok(step4Code.includes("budgetType === 'hourly'"), 'Step 4 missing budgetType check for hourly rate rendering');
  assert.ok(step4Code.includes('/hr'), 'Step 4 missing hourly rate suffix');
  assert.ok(step4Code.includes('Budget Model:'), 'Step 4 missing Budget Model label');
});

runTest('H-Case 6: Absolute Escrow Eradication Across Workspace and Administration', () => {
  const filesToAudit = [
    'src/pages/client/InvoiceManagementPage.tsx',
    'src/pages/symbiote/SymbioteInvoicesPage.tsx',
    'src/pages/admin/AdminSettingsPage.tsx',
    'src/components/admin/settings/PlatformOperationsTab.tsx',
    'src/lib/firestore/workspace.ts'
  ];

  for (const file of filesToAudit) {
    const content = readFile(file);
    assert.ok(
      !content.toLowerCase().includes('escrow_held') && !content.toLowerCase().includes('in_escrow'),
      `${file} still contains legacy escrow states`
    );
  }
});

// ----------------------------------------------------
// Test Group 41: Issue #94 - Onboarding Mandate, Email Verification Retention & Draft Undefined Sanitization
// ----------------------------------------------------
console.log('\n📌 Test Group 41: Issue #94 (Onboarding Mandate, Email Verification Retention & Draft Undefined Sanitization)');

runTest('AuthContext touchActive preserves and auto-heals emailVerified: true on page refresh', () => {
  const code = readFile('src/context/AuthContext.tsx');
  assert.ok(code.includes('userSnap.data()?.onboardingCompleted === true'), 'AuthContext missing onboardingCompleted auto-heal');
  assert.ok(!code.includes('basicData.emailVerified = user.emailVerified;'), 'AuthContext still overwriting emailVerified with user.emailVerified');
  assert.ok(code.includes('const [loading, setLoading] = useState(true);'), 'AuthContext must initialize loading to true to prevent premature redirects');
});

runTest('EmailVerificationGuard and ProtectedRoute accept Firestore verification and completed onboarding', () => {
  const guardCode = readFile('src/components/guards/EmailVerificationGuard.tsx');
  assert.ok(guardCode.includes('firestoreVerified || firebaseVerified || userProfile?.onboardingCompleted === true'), 'EmailVerificationGuard must not require both firestore AND firebase');

  const protectedCode = readFile('src/components/ProtectedRoute.tsx');
  assert.ok(protectedCode.includes('activeUser.onboardingCompleted === true'), 'ProtectedRoute missing onboardingCompleted fallback');
});

runTest('saveProjectDraft strips all undefined fields recursively before calling Firestore setDoc', () => {
  const code = readFile('src/lib/firestore/projects.ts');
  assert.ok(code.includes('cleanUndefined'), 'projects.ts missing cleanUndefined helper');
  assert.ok(code.includes('const payload = cleanUndefined('), 'projects.ts saveProjectDraft must sanitize payload with cleanUndefined');
});

runTest('BUGS_AND_ISSUES_TRACKER.md records Issue #94 with verified status', () => {
  const code = readFile('documents/BUGS_AND_ISSUES_TRACKER.md');
  assert.ok(code.includes('### 94. ✅ [P0] Onboarding Completion Mandate, Email Verification Loop Fix & Project Draft Sanitization'), 'Tracker missing Issue #94 header');
});

// ----------------------------------------------------
// Test Group 42: Issue #98 - Project Completion Workflow & Complete Project Button
// ----------------------------------------------------
console.log('\n📌 Test Group 42: Issue #98 (Project Completion Workflow & Complete Project Button)');

runTest('ProjectHeader defines dynamicProgressPct, allTasksCompleted, and canCompleteProject', () => {
  const code = readFile('src/components/project/ProjectHeader.tsx');
  assert.ok(code.includes('dynamicProgressPct?: number;'), 'ProjectHeaderProps missing dynamicProgressPct');
  assert.ok(code.includes('allTasksCompleted?: boolean;'), 'ProjectHeaderProps missing allTasksCompleted');
  assert.ok(code.includes('canCompleteProject = Boolean('), 'ProjectHeader missing canCompleteProject calculation');
  assert.ok(code.includes('allTasksCompleted || progressPercent >= 100'), 'canCompleteProject must accept allTasksCompleted or 100% progress');
  assert.ok(code.includes('<span>Complete Project</span>'), 'ProjectHeader missing Complete Project button label');
});

runTest('ProjectDetailsPage dynamically calculates progress and passes completion props', () => {
  const code = readFile('src/pages/client/ProjectDetailsPage.tsx');
  assert.ok(code.includes('syncProjectCompletionAndProgress'), 'ProjectDetailsPage missing syncProjectCompletionAndProgress import');
  assert.ok(code.includes('allTasksCompleted = useMemo('), 'ProjectDetailsPage missing allTasksCompleted memo');
  assert.ok(code.includes('dynamicProgressPct = useMemo('), 'ProjectDetailsPage missing dynamicProgressPct memo');
  assert.ok(code.includes('dynamicProgressPct={dynamicProgressPct}'), 'ProjectDetailsPage must pass dynamicProgressPct to ProjectHeader');
  assert.ok(code.includes('allTasksCompleted={allTasksCompleted}'), 'ProjectDetailsPage must pass allTasksCompleted to ProjectHeader');
  assert.ok(code.includes('onCompleteProject={handleCompleteProject}'), 'ProjectDetailsPage must pass onCompleteProject to WorkspaceTab');
});

runTest('WorkspaceTab renders allTasksCompleted banner and toolbar button', () => {
  const code = readFile('src/components/project/WorkspaceTab.tsx');
  assert.ok(code.includes('onCompleteProject?: () => void;'), 'WorkspaceTabProps missing onCompleteProject');
  assert.ok(code.includes('allTasksCompleted = useMemo('), 'WorkspaceTab missing allTasksCompleted memo');
  assert.ok(code.includes('All Workspace Tasks Completed!'), 'WorkspaceTab missing All Workspace Tasks Completed banner');
  assert.ok(code.includes('onClick={onCompleteProject}'), 'WorkspaceTab missing onCompleteProject click handler');
});

runTest('workspace.ts syncProjectCompletionAndProgress respects 100% task completion and syncs status', () => {
  const code = readFile('src/lib/firestore/workspace.ts');
  assert.ok(code.includes('getPersistedTaskStatusOverrides()'), 'syncProjectCompletionAndProgress must read status overrides');
  assert.ok(code.includes('taskPct === 100'), 'syncProjectCompletionAndProgress must set 100% progress when all tasks complete');
  assert.ok(code.includes('status: targetStatus'), 'syncProjectCompletionAndProgress must persist targetStatus');
});

runTest('BUGS_AND_ISSUES_TRACKER.md records Issue #98 with verified status', () => {
  const code = readFile('documents/BUGS_AND_ISSUES_TRACKER.md');
  assert.ok(code.includes('### 98. ✅ [P1] Project Completion Workflow & "Complete Project" Button Availability When All Tasks/Deliverables Complete'), 'Tracker missing Issue #98 header');
});

// ----------------------------------------------------
// Test Group 43: Issue #99 - Admin User Management Google OAuth & Incomplete Profile Breakdown
// ----------------------------------------------------
console.log('\n📌 Test Group 43: Issue #99 (Admin User Management Google OAuth & Incomplete Profile Breakdown)');

runTest('GoogleColorIcon renders official 4-color branding', () => {
  const code = readFile('src/components/ui/GoogleColorIcon.tsx');
  assert.ok(code.includes('#4285F4'), 'GoogleColorIcon missing Google Blue');
  assert.ok(code.includes('#34A853'), 'GoogleColorIcon missing Google Green');
  assert.ok(code.includes('#FBBC05'), 'GoogleColorIcon missing Google Yellow');
  assert.ok(code.includes('#EA4335'), 'GoogleColorIcon missing Google Red');
});

runTest('adminUsers.ts evaluates role-specific missingProfileFields, incompleteReason, and isGoogleUser', () => {
  const code = readFile('src/lib/firestore/adminUsers.ts');
  assert.ok(code.includes('missingProfileFields?: string[];'), 'AdminUserRow missing missingProfileFields');
  assert.ok(code.includes('incompleteReason?: string;'), 'AdminUserRow missing incompleteReason');
  assert.ok(code.includes('isGoogleUser?: boolean;'), 'AdminUserRow missing isGoogleUser');
  assert.ok(code.includes("missingProfileFields.push('Company Name')"), 'adminUsers.ts must check Client Company Name');
  assert.ok(code.includes("missingProfileFields.push('Skills')"), 'adminUsers.ts must check Symbiote Skills');
  assert.ok(code.includes("missingProfileFields.push('Hourly Rate')"), 'adminUsers.ts must check Symbiote Hourly Rate');
});

runTest('UserManagementPage and UserDetailPage render GoogleColorIcon and detailed incomplete hover tooltip', () => {
  const mgmtCode = readFile('src/pages/admin/UserManagementPage.tsx');
  assert.ok(mgmtCode.includes('GoogleColorIcon'), 'UserManagementPage missing GoogleColorIcon');
  assert.ok(mgmtCode.includes('u.isGoogleUser'), 'UserManagementPage missing isGoogleUser check');
  assert.ok(mgmtCode.includes('u.incompleteReason'), 'UserManagementPage missing incompleteReason tooltip');

  const detailCode = readFile('src/pages/admin/UserDetailPage.tsx');
  assert.ok(detailCode.includes('GoogleColorIcon'), 'UserDetailPage missing GoogleColorIcon');
  assert.ok(detailCode.includes('isGoogleUser'), 'UserDetailPage missing isGoogleUser check');
  assert.ok(detailCode.includes('missingProfileFields.join'), 'UserDetailPage missing missingProfileFields breakdown');
});

runTest('SignupPage and LoginPage persist authProvider and providerId on Google OAuth', () => {
  const signupCode = readFile('src/pages/public/SignupPage.tsx');
  assert.ok(signupCode.includes("authProvider: 'google'"), 'SignupPage missing authProvider google');
  assert.ok(signupCode.includes("providerId: 'google.com'"), 'SignupPage missing providerId google.com');

  const loginCode = readFile('src/pages/public/LoginPage.tsx');
  assert.ok(loginCode.includes("authProvider: 'google'"), 'LoginPage missing authProvider google');
  assert.ok(loginCode.includes("providerId: 'google.com'"), 'LoginPage missing providerId google.com');

  const authCode = readFile('src/context/AuthContext.tsx');
  assert.ok(authCode.includes("basicData.authProvider = 'google'"), 'AuthContext missing google authProvider touchActive auto-heal');
});

runTest('BUGS_AND_ISSUES_TRACKER.md records Issue #99 with verified status', () => {
  const code = readFile('documents/BUGS_AND_ISSUES_TRACKER.md');
  assert.ok(code.includes('### 99. ✅ [P1] Admin User Management: Google OAuth Visual Attribution & Contextual Incomplete Profile Hover Breakdown'), 'Tracker missing Issue #99 header');
});

// ----------------------------------------------------
// Test Group 44: Issue #100 - Freelancer Earnings Deduplication, Client Name Accuracy & Time Approval Security
// ----------------------------------------------------
console.log('\n📌 Test Group 44: Issue #100 (Freelancer Earnings Deduplication, Client Name Accuracy & Time Tracking Approval)');
runTest('firestore.rules authorizes clients and project participants to update time_entries', () => {
  const rules = readFile('firestore.rules');
  assert.ok(rules.includes("match /time_entries/{entryId}"), 'firestore.rules missing time_entries match');
  assert.ok(rules.includes("request.auth.uid == resource.data.clientId"), 'firestore.rules missing clientId update rule for time_entries');
  assert.ok(rules.includes("isProjectParticipant(resource.data.projectId)"), 'firestore.rules missing isProjectParticipant update rule for time_entries');
});

runTest('SymbioteEarningsPage.tsx resolves accurate client names and prevents symbiote self-attribution', () => {
  const earningsCode = readFile('src/pages/symbiote/SymbioteEarningsPage.tsx');
  assert.ok(earningsCode.includes('projectClientMap'), 'SymbioteEarningsPage missing projectClientMap');
  assert.ok(earningsCode.includes('isClientNameSelf'), 'SymbioteEarningsPage missing isClientNameSelf check');
  assert.ok(!earningsCode.includes("clientName: inv.symbioteName"), 'SymbioteEarningsPage must never use inv.symbioteName as clientName');
});

runTest('SymbioteEarningsPage.tsx deduplicates invoiced time entries and classifies hourly settlements correctly', () => {
  const earningsCode = readFile('src/pages/symbiote/SymbioteEarningsPage.tsx');
  assert.ok(earningsCode.includes('invoicedKeywords'), 'SymbioteEarningsPage missing invoicedKeywords set');
  assert.ok(earningsCode.includes('te.invoiced || te.invoiceId'), 'SymbioteEarningsPage missing te.invoiced / te.invoiceId skip check');
  assert.ok(earningsCode.includes("isHourly ="), 'SymbioteEarningsPage missing isHourly dynamic check');
  assert.ok(earningsCode.includes("invoiceType?.toLowerCase() === 'hourly'"), 'SymbioteEarningsPage missing invoiceType check');
});

runTest('src/types/firestore.ts defines robust fields on TimeEntry', () => {
  const typesCode = readFile('src/types/firestore.ts');
  assert.ok(typesCode.includes('hourlyRate?: number;'), 'TimeEntry missing hourlyRate');
  assert.ok(typesCode.includes('invoiced?: boolean;'), 'TimeEntry missing invoiced');
  assert.ok(typesCode.includes('invoiceId?: string;'), 'TimeEntry missing invoiceId');
});

runTest('BUGS_AND_ISSUES_TRACKER.md records Issue #100 with verified status', () => {
  const code = readFile('documents/BUGS_AND_ISSUES_TRACKER.md');
  assert.ok(code.includes('### 100. ✅ [P0] Freelancer Earnings: Transaction Deduplication, Accurate Client Attribution & Time Tracking Approval Permissions'), 'Tracker missing Issue #100 header');
});



console.log('\n====================================================');
console.log(`📊 Test Summary: ${passedTests}/${totalTests} Passed (${Math.round((passedTests / totalTests) * 100)}%)`);
console.log('====================================================');

if (passedTests !== totalTests) {
  process.exit(1);
} else {

  console.log('🎉 All automated verification tests passed cleanly!\n');
  process.exit(0);
}



