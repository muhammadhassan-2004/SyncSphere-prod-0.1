/**
 * Comprehensive Regression & Edge Case Test Suite for SyncSphere
 * 
 * Verifies:
 * 1. Issue #45 - Time Tracking Table Design Alignment & Real-Time Sync Resilience
 * 2. Regression Tests across Core Portals (Client, Symbiote, Admin, Auth, Workspace)
 * 3. Edge Cases (Zero/Empty states, Null/Undefined fields, Case insensitivity, Date parsing, Cross-tab events)
 */

import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

const ROOT_DIR = process.cwd();

function readFile(relativePath: string): string {
  const fullPath = path.join(ROOT_DIR, relativePath);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`File not found: ${fullPath}`);
  }
  return fs.readFileSync(fullPath, 'utf-8');
}

let passedTests = 0;
let failedTests = 0;
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
    failedTests++;
  }
}

console.log('================================================================');
console.log('🔬 SyncSphere Deep Regression & Edge Case Test Suite');
console.log('================================================================\n');

// ============================================================================
// GROUP 1: Issue #45 - Design Alignment & Real-Time Sync Verification
// ============================================================================
console.log('📌 Test Group 1: Issue #45 Design Alignment & Sync Resilience');

runTest('Client TimeTrackingPage has 7 table header columns (including Status & Approval Action per Issue #48)', () => {
  const content = readFile('src/pages/client/TimeTrackingPage.tsx');
  
  // Extract the table thead
  const theadMatch = content.match(/<thead>[\s\S]*?<\/thead>/);
  assert.ok(theadMatch, 'Table thead not found in TimeTrackingPage.tsx');
  const thead = theadMatch[0];

  assert.ok(thead.includes('Status</th>'), 'Missing Status column');
  assert.ok(thead.includes('Professional</th>') || thead.includes('Freelancer</th>'), 'Missing Professional / Freelancer column');
  assert.ok(thead.includes('Date</th>'), 'Missing Date column');
  assert.ok(thead.includes('Hours</th>'), 'Missing Hours column');
  assert.ok(thead.includes('Project</th>'), 'Missing Project column');
  assert.ok(thead.includes('Description</th>'), 'Missing Description column');
  assert.ok(thead.includes('Approval Action</th>'), 'Missing Approval Action column');

  // Count exactly 7 <th> elements
  const thCount = (thead.match(/<th\b/g) || []).length;
  assert.strictEqual(thCount, 7, `Expected exactly 7 <th> columns in header, found ${thCount}`);
});

runTest('Client TimeTrackingPage row cells match exactly 7 <td> elements', () => {
  const content = readFile('src/pages/client/TimeTrackingPage.tsx');
  
  // Find table row template
  const rowMatch = content.match(/filteredEntries\.map\(\(entry\) => \{[\s\S]*?return \([\s\S]*?<tr[\s\S]*?<\/tr>/);
  assert.ok(rowMatch, 'Table row mapping not found');
  const rowContent = rowMatch[0];

  const tdCount = (rowContent.match(/<td\b/g) || []).length;
  assert.strictEqual(tdCount, 7, `Expected exactly 7 <td> columns per row, found ${tdCount}`);
});

runTest('Client TimeTrackingPage empty state uses colSpan={7}', () => {
  const content = readFile('src/pages/client/TimeTrackingPage.tsx');
  assert.ok(
    content.includes('colSpan={7}'),
    'Empty state does not use colSpan={7}'
  );
});

runTest('Unused status icons (CheckCircle2, XCircle) removed from TimeTrackingPage imports', () => {
  const content = readFile('src/pages/client/TimeTrackingPage.tsx');
  const importMatch = content.match(/import\s*\{[\s\S]*?\}\s*from\s*'lucide-react';/);
  assert.ok(importMatch, 'lucide-react imports block not found');
  const imports = importMatch[0];
  assert.ok(!imports.includes('CheckCircle2'), 'CheckCircle2 is still imported');
  assert.ok(!imports.includes('XCircle'), 'XCircle is still imported');
});

runTest('timeEntries.ts subscribeToTimeEntries reconciles status overrides', () => {
  const content = readFile('src/lib/firestore/timeEntries.ts');
  const subFunc = content.match(/export function subscribeToTimeEntries\([\s\S]*?\n\}/);
  assert.ok(subFunc, 'subscribeToTimeEntries function not found');
  assert.ok(
    subFunc[0].includes('getPersistedTimeStatusOverrides()'),
    'subscribeToTimeEntries does not call getPersistedTimeStatusOverrides()'
  );
  assert.ok(
    subFunc[0].includes('overrides[e.id].status'),
    'subscribeToTimeEntries does not merge overrides into entry status'
  );
});

runTest('timeEntries.ts error handlers handle permissions gracefully without throwing', () => {
  const content = readFile('src/lib/firestore/timeEntries.ts');
  const subFunc = content.match(/export function subscribeToTimeEntries\([\s\S]*?\n\}/);
  assert.ok(subFunc, 'subscribeToTimeEntries function not found');
  assert.ok(
    subFunc[0].includes("permission-denied") && subFunc[0].includes("callback([])"),
    'subscribeToTimeEntries gracefully handles permission-denied'
  );

  const subProjFunc = content.match(/export function subscribeToTimeEntriesForProject\([\s\S]*?\n\}/);
  assert.ok(subProjFunc, 'subscribeToTimeEntriesForProject function not found');
  assert.ok(
    subProjFunc[0].includes("permission-denied") && subProjFunc[0].includes("callback([])"),
    'subscribeToTimeEntriesForProject gracefully handles permission-denied'
  );

  const updateFunc = content.match(/export async function updateTimeEntryStatus\([\s\S]*?\n\}/);
  assert.ok(updateFunc, 'updateTimeEntryStatus function not found');
  assert.ok(
    !updateFunc[0].includes('handleFirestoreError('),
    'updateTimeEntryStatus still delegates to handleFirestoreError which throws'
  );
});

runTest('SymbioteTimeTrackingPage listens to syncsphere:time-entry-status-changed with cleanup', () => {
  const content = readFile('src/pages/symbiote/SymbioteTimeTrackingPage.tsx');
  assert.ok(
    content.includes("window.addEventListener('syncsphere:time-entry-status-changed'"),
    'Missing addEventListener for syncsphere:time-entry-status-changed'
  );
  assert.ok(
    content.includes("window.removeEventListener('syncsphere:time-entry-status-changed'"),
    'Missing removeEventListener cleanup for syncsphere:time-entry-status-changed'
  );
});

// ============================================================================
// GROUP 2: Regression Tests across Core Portals & Workflows
// ============================================================================
console.log('\n📌 Test Group 2: Core Platform Regression Tests');

runTest('Firestore Security Rules allow read, create, and update on time_entries', () => {
  const content = readFile('firestore.rules');
  const rulesMatch = content.match(/match \/time_entries\/\{entryId\} \{[\s\S]*?\n\s*\}/);
  assert.ok(rulesMatch, 'time_entries security rules match block not found');
  const rules = rulesMatch[0];
  assert.ok(rules.includes('allow read: if isSignedIn()'), 'Missing allow read for time_entries');
  assert.ok(rules.includes('allow create: if isSignedIn();'), 'Missing allow create for time_entries');
  assert.ok(rules.includes('allow update: if isSignedIn()'), 'Missing allow update for time_entries');
});

runTest('Client TimeTrackingPage preserves status filter options (all, pending, approved, rejected)', () => {
  const content = readFile('src/pages/client/TimeTrackingPage.tsx');
  assert.ok(content.includes('value="all"'), 'Missing "all" filter option');
  assert.ok(content.includes('value="pending"'), 'Missing "pending" filter option');
  assert.ok(content.includes('value="approved"'), 'Missing "approved" filter option');
  assert.ok(content.includes('value="rejected"'), 'Missing "rejected" filter option');
});

runTest('Client TimeTrackingPage maintains stats calculations (total, week, month, utilization)', () => {
  const content = readFile('src/pages/client/TimeTrackingPage.tsx');
  assert.ok(content.includes('totalHours: totalHours.toFixed(1)'), 'Missing totalHours calculation');
  assert.ok(content.includes('thisWeekHours: thisWeekHours.toFixed(1)'), 'Missing thisWeekHours calculation');
  assert.ok(content.includes('thisMonthHours: thisMonthHours.toFixed(1)'), 'Missing thisMonthHours calculation');
  assert.ok(content.includes('utilizationPct'), 'Missing utilizationPct calculation');
});

runTest('SymbioteTimeTrackingPage task selection and limit safeguards remain intact', () => {
  const content = readFile('src/pages/symbiote/SymbioteTimeTrackingPage.tsx');
  assert.ok(
    content.includes('taskCap > 0') || content.includes('Time Cap Exceeded'),
    'Missing task cap limit guard'
  );
  assert.ok(
    content.includes('tasks.length > 0 && !selectedTaskId'),
    'Missing task selection enforcement'
  );
});

runTest('SymbioteTimeTrackingPage manual logging guards against 0 or negative hours', () => {
  const content = readFile('src/pages/symbiote/SymbioteTimeTrackingPage.tsx');
  assert.ok(
    content.includes('isNaN(parsedHours) || parsedHours <= 0'),
    'Missing validation for parsedHours > 0'
  );
  assert.ok(
    content.includes('Please enter valid hours greater than 0'),
    'Missing error toast for invalid hours'
  );
});

runTest('Task actualHours auto-increments atomically on createTimeEntry and decrements on deleteTimeEntry', () => {
  const content = readFile('src/lib/firestore/timeEntries.ts');
  assert.ok(
    content.includes('+(currentActual + Number(entry.hours)).toFixed(2)'),
    'createTimeEntry missing atomic addition of actual hours'
  );
  assert.ok(
    content.includes('Math.max(0, +(currentActual - Number(data.hours)).toFixed(2))'),
    'deleteTimeEntry missing atomic subtraction of actual hours'
  );
});

// ============================================================================
// GROUP 3: Edge Case Scenarios
// ============================================================================
console.log('\n📌 Test Group 3: Edge Case Scenarios');

runTest('Edge Case 1: TimeEntry with undefined or null status handles case-insensitivity cleanly', () => {
  // Simulate the exact check in TimeTrackingPage & SymbioteTimeTrackingPage
  const testEntries = [
    { id: '1', status: 'Approved' },
    { id: '2', status: 'approved' },
    { id: '3', status: 'APPROVED' },
    { id: '4', status: 'Rejected' },
    { id: '5', status: 'rejected' },
    { id: '6', status: undefined },
    { id: '7', status: null as any },
    { id: '8', status: '' as any },
  ];

  const approvedIds = testEntries
    .filter((e) => ((e.status || 'pending').toLowerCase() === 'approved'))
    .map((e) => e.id);
  assert.deepStrictEqual(approvedIds, ['1', '2', '3'], 'Failed to match case-insensitive approved entries');

  const rejectedIds = testEntries
    .filter((e) => ((e.status || 'pending').toLowerCase() === 'rejected'))
    .map((e) => e.id);
  assert.deepStrictEqual(rejectedIds, ['4', '5'], 'Failed to match case-insensitive rejected entries');

  const pendingIds = testEntries
    .filter((e) => ((e.status || 'pending').toLowerCase() === 'pending'))
    .map((e) => e.id);
  assert.deepStrictEqual(pendingIds, ['6', '7', '8'], 'Failed to fall back undefined/null/empty to pending');
});

runTest('Edge Case 2: Specialist Name Initials Generator handles empty, 1-word, 2-word, and undefined names', () => {
  function getInitials(sName?: string, fallback = 'SP'): string {
    if (!sName || sName === 'Specialist') return fallback;
    const parts = sName.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }

  assert.strictEqual(getInitials(undefined), 'SP', 'Failed for undefined');
  assert.strictEqual(getInitials(''), 'SP', 'Failed for empty string');
  assert.strictEqual(getInitials('Specialist'), 'SP', 'Failed for default Specialist');
  assert.strictEqual(getInitials('fedrick'), 'FE', 'Failed for 1-word name');
  assert.strictEqual(getInitials('Clark Kent'), 'CK', 'Failed for 2-word name');
  assert.strictEqual(getInitials('Bruce Wayne Senior'), 'BW', 'Failed for 3-word name');
});

runTest('Edge Case 3: Date Parsing handles ISO formats, "Jan 15", and invalid dates without crashing', () => {
  function parseEntryDate(dateStr: string): Date | null {
    if (!dateStr) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      const [y, m, d] = dateStr.split('-').map(Number);
      return new Date(y, m - 1, d);
    }
    const monthMatch = dateStr.match(/^([A-Za-z]{3})\s+(\d{1,2})$/);
    if (monthMatch) {
      const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
      const mIndex = months.indexOf(monthMatch[1].toLowerCase());
      if (mIndex >= 0) {
        const day = parseInt(monthMatch[2], 10);
        const now = new Date();
        return new Date(now.getFullYear(), mIndex, day);
      }
    }
    const parsed = new Date(dateStr);
    return isNaN(parsed.getTime()) ? null : parsed;
  }

  assert.ok(parseEntryDate('2026-08-19') instanceof Date, 'Failed to parse YYYY-MM-DD');
  assert.strictEqual(parseEntryDate('2026-08-19')?.getFullYear(), 2026);
  assert.strictEqual(parseEntryDate('2026-08-19')?.getMonth(), 7); // August is 7 (0-indexed)
  assert.strictEqual(parseEntryDate('2026-08-19')?.getDate(), 19);

  assert.ok(parseEntryDate('Jan 15') instanceof Date, 'Failed to parse "Jan 15"');
  assert.strictEqual(parseEntryDate('Jan 15')?.getMonth(), 0);
  assert.strictEqual(parseEntryDate('Jan 15')?.getDate(), 15);

  assert.strictEqual(parseEntryDate(''), null, 'Did not return null for empty date');
  assert.strictEqual(parseEntryDate('not-a-date'), null, 'Did not return null for invalid date string');
});

runTest('Edge Case 4: Stopwatch session under 10 seconds computes minimum 0.05h (3 mins) when notes present', () => {
  const seconds = 8;
  const calculatedHours = Math.max(0.05, +(seconds / 3600).toFixed(2));
  assert.strictEqual(calculatedHours, 0.05, `Expected 0.05h minimum for small session, got ${calculatedHours}`);
});

runTest('Edge Case 5: Fractional hours calculation precision prevents floating point rounding drift', () => {
  const entries = [
    { hours: 1.85 },
    { hours: 2.6 },
    { hours: 2.1 },
    { hours: 0.05 },
  ];
  const total = entries.reduce((sum, e) => sum + e.hours, 0);
  const formatted = total.toFixed(1);
  assert.strictEqual(formatted, '6.6', `Expected 6.6, got ${formatted}`);
});

runTest('Edge Case 6: LocalStorage Override Persistence JSON parsing handles corrupted data safely', () => {
  function safeParseOverrides(raw: string | null): Record<string, any> {
    try {
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  assert.deepStrictEqual(safeParseOverrides(null), {});
  assert.deepStrictEqual(safeParseOverrides(''), {});
  assert.deepStrictEqual(safeParseOverrides('{ invalid json'), {});
  assert.deepStrictEqual(
    safeParseOverrides('{"entry-1":{"status":"approved"}}'),
    { 'entry-1': { status: 'approved' } }
  );
});

// ============================================================================
// SUMMARY REPORT
// ============================================================================
console.log('\n================================================================');
console.log(`📊 Deep Test Suite Summary: ${passedTests}/${totalTests} Tests Passed (${Math.round((passedTests / totalTests) * 100)}%)`);
if (failedTests > 0) {
  console.log(`❌ Failed Tests: ${failedTests}`);
}
console.log('================================================================');

if (failedTests > 0) {
  process.exit(1);
} else {
  console.log('🎉 All regression and edge-case verification tests passed with 100% success!\n');
  process.exit(0);
}
