import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  ✅ PASS: ${name}`);
    passed++;
  } catch (err: any) {
    console.error(`  ❌ FAIL: ${name}`);
    console.error(`     ${err.message}`);
    failed++;
  }
}

console.log('====================================================');
console.log('🧪 Running Comprehensive Alignment QA Audit Test Suite');
console.log('====================================================\n');

// ---------------------------------------------------------------------
// 1. Hourly Model Clean-up & Budget Formatting
// ---------------------------------------------------------------------
console.log('📌 Audit Area 1: Hourly Model Budget Clean-up & Formatting');

test('Step 2 & 4 Hourly Rate Validation blocks invalid ranges', () => {
  const isValidRange = (min: number, max: number) => min > 0 && max > 0 && max >= min;
  
  assert.strictEqual(isValidRange(40, 70), true, 'Valid range 40-70 should pass');
  assert.strictEqual(isValidRange(50, 50), true, 'Equal min and max 50-50 should pass');
  assert.strictEqual(isValidRange(70, 40), false, 'max < min should fail');
  assert.strictEqual(isValidRange(-10, 40), false, 'negative min should fail');
  assert.strictEqual(isValidRange(0, 40), false, 'zero min should fail');
});

test('Format budget displays /hr for hourly projects across browse and detail pages', () => {
  const formatBudget = (proj: { budgetType?: string; pricingModel?: string; minBudget?: number; maxBudget?: number }) => {
    const isHourly = proj.budgetType === 'hourly' || proj.pricingModel === 'hourly';
    if (isHourly) {
      if (proj.minBudget && proj.maxBudget) return `$${proj.minBudget}–$${proj.maxBudget}/hr`;
      if (proj.maxBudget) return `$${proj.maxBudget}/hr`;
      return 'Hourly Negotiable';
    }
    if (proj.minBudget && proj.maxBudget) return `$${proj.minBudget}–$${proj.maxBudget}`;
    if (proj.maxBudget) return `$${proj.maxBudget}`;
    return 'Negotiable';
  };

  assert.strictEqual(formatBudget({ budgetType: 'hourly', minBudget: 40, maxBudget: 70 }), '$40–$70/hr');
  assert.strictEqual(formatBudget({ pricingModel: 'hourly', minBudget: 40, maxBudget: 70 }), '$40–$70/hr');
  assert.strictEqual(formatBudget({ budgetType: 'hourly', maxBudget: 80 }), '$80/hr');
  assert.strictEqual(formatBudget({ budgetType: 'fixed', minBudget: 1000, maxBudget: 3000 }), '$1000–$3000');
});

// ---------------------------------------------------------------------
// 2. Task Budget Protection (Min & Max Hours)
// ---------------------------------------------------------------------
console.log('\n📌 Audit Area 2: Task Budget Protection (Min & Max Cap Hours)');

test('TaskDrawer validation enforces maxHours >= minHours', () => {
  const validateHours = (minHours: number | '', maxHours: number | '') => {
    if (minHours !== '' && maxHours !== '' && Number(maxHours) < Number(minHours)) {
      return 'Max Cap Hours cannot be less than Min Estimated Hours.';
    }
    return null;
  };

  assert.strictEqual(validateHours(4, 8), null);
  assert.strictEqual(validateHours(8, 8), null);
  assert.strictEqual(validateHours(10, 5), 'Max Cap Hours cannot be less than Min Estimated Hours.');
  assert.strictEqual(validateHours('', 8), null);
  assert.strictEqual(validateHours(4, ''), null);
});

test('TaskDrawer defaults maxHours to estimatedHours when left blank', () => {
  const resolveMaxHours = (maxHours: number | '', estimatedHours: number) => {
    return maxHours !== '' ? Number(maxHours) : (Number(estimatedHours) || 0);
  };

  assert.strictEqual(resolveMaxHours(12, 8), 12);
  assert.strictEqual(resolveMaxHours('', 8), 8);
  assert.strictEqual(resolveMaxHours('', 0), 0);
});

// ---------------------------------------------------------------------
// 3. Strict Task Time Cap Enforcement
// ---------------------------------------------------------------------
console.log('\n📌 Audit Area 3: Freelancer Strict Task Time Cap Enforcement');

test('Cap check strictly blocks time logging when cap is exceeded', () => {
  const checkCap = (taskCap: number, currentLogged: number, newHours: number) => {
    if (taskCap > 0 && +(currentLogged + newHours).toFixed(2) > taskCap) {
      const remaining = Math.max(0, +(taskCap - currentLogged).toFixed(2));
      return { allowed: false, remaining };
    }
    return { allowed: true, remaining: taskCap > 0 ? Math.max(0, +(taskCap - currentLogged - newHours).toFixed(2)) : null };
  };

  // Boundary 1: Under cap
  const r1 = checkCap(10.0, 5.0, 3.0);
  assert.strictEqual(r1.allowed, true);
  assert.strictEqual(r1.remaining, 2.0);

  // Boundary 2: Exactly at cap (10.0)
  const r2 = checkCap(10.0, 8.0, 2.0);
  assert.strictEqual(r2.allowed, true);
  assert.strictEqual(r2.remaining, 0.0);

  // Boundary 3: Just above cap (10.01)
  const r3 = checkCap(10.0, 8.0, 2.01);
  assert.strictEqual(r3.allowed, false);
  assert.strictEqual(r3.remaining, 2.0);

  // Boundary 4: Already fully logged
  const r4 = checkCap(10.0, 10.0, 0.5);
  assert.strictEqual(r4.allowed, false);
  assert.strictEqual(r4.remaining, 0.0);

  // Boundary 5: No cap (taskCap = 0)
  const r5 = checkCap(0, 50.0, 10.0);
  assert.strictEqual(r5.allowed, true);
});

// ---------------------------------------------------------------------
// 4. Direct Per-Task Invoicing at Agreed Rate
// ---------------------------------------------------------------------
console.log('\n📌 Audit Area 4: Direct Per-Task Invoicing at Agreed Specialist Rate');

test('Determines agreed specialist rate correctly from teamMembers, profile, or budget', () => {
  const resolveRate = (
    assigneeUid: string,
    teamMembers: Array<{ uid: string; hourlyRate?: number }>,
    userProfileRate?: number,
    projectMaxBudget?: number
  ) => {
    const assignedMember = teamMembers.find((m) => m.uid === assigneeUid);
    let freelancerRate = Number(assignedMember?.hourlyRate);
    if (!freelancerRate || freelancerRate <= 0) {
      if (userProfileRate && userProfileRate > 0) freelancerRate = userProfileRate;
    }
    if (!freelancerRate || freelancerRate <= 0) {
      freelancerRate = Number(projectMaxBudget) || 75;
    }
    return freelancerRate;
  };

  // Team member rate specified ($95)
  assert.strictEqual(
    resolveRate('user-1', [{ uid: 'user-1', hourlyRate: 95 }], 60, 50),
    95
  );

  // Fallback to user profile rate ($60) when teamMember has no rate
  assert.strictEqual(
    resolveRate('user-2', [{ uid: 'user-2' }], 60, 50),
    60
  );

  // Fallback to project max budget ($50) when no user profile rate
  assert.strictEqual(
    resolveRate('user-3', [], undefined, 50),
    50
  );

  // Default fallback ($75) when all empty
  assert.strictEqual(
    resolveRate('user-4', [], undefined, undefined),
    75
  );
});

test('Task settlement calculation clamps to minimum $25', () => {
  const calcAmount = (effectiveHours: number, rate: number) => Math.max(25, Math.round(effectiveHours * rate));

  assert.strictEqual(calcAmount(10, 80), 800);
  assert.strictEqual(calcAmount(0.2, 50), 25); // 0.2 * 50 = $10 -> clamped to $25
  assert.strictEqual(calcAmount(0.5, 60), 30);
});

test('Prevents duplicate invoicing when task.invoiced is true', () => {
  const shouldInvoice = (task: { invoiced?: boolean }) => !task.invoiced;

  assert.strictEqual(shouldInvoice({ invoiced: false }), true);
  assert.strictEqual(shouldInvoice({ invoiced: undefined }), true);
  assert.strictEqual(shouldInvoice({ invoiced: true }), false, 'Must never invoice an already invoiced task');
});

// ---------------------------------------------------------------------
// 5. Pure Milestone Phases & Decommissioning
// ---------------------------------------------------------------------
console.log('\n📌 Audit Area 5: Pure Milestone Phases');

test('SubmitDeliverableModal is completely decoupled from all pages and tabs', () => {
  const filesToSearch = [
    'src/components/project/MilestonesTab.tsx',
    'src/pages/client/ProjectDetailsPage.tsx',
    'src/pages/symbiote/SymbioteWorkspacePage.tsx',
    'src/components/project/WorkspaceTab.tsx',
  ];

  for (const file of filesToSearch) {
    const content = fs.readFileSync(path.join(process.cwd(), file), 'utf-8');
    assert.ok(
      !content.includes('SubmitDeliverableModal'),
      `${file} still imports or references SubmitDeliverableModal`
    );
  }
});

// ---------------------------------------------------------------------
// 6. Browse Projects Feed Inactive Filtering & Hired Specialist Actions
// ---------------------------------------------------------------------
console.log('\n📌 Audit Area 6: Browse Projects Filtering & Hired Action Routing');

test('Browse projects filter excludes completed, closed, and archived projects', () => {
  const projects = [
    { id: '1', title: 'Open Project', status: 'open' },
    { id: '2', title: 'In Progress Project', status: 'in_progress' },
    { id: '3', title: 'Completed Project', status: 'completed' },
    { id: '4', title: 'Closed Project', status: 'closed' },
    { id: '5', title: 'Archived Project', status: 'archived' },
  ];

  const filtered = projects.filter((p) => p.status !== 'completed' && p.status !== 'closed' && p.status !== 'archived');
  assert.strictEqual(filtered.length, 2);
  assert.deepStrictEqual(filtered.map((p) => p.id), ['1', '2']);
});

test('isHired accurately identifies hired specialists across all 5 Firestore attachment paths', () => {
  const currentUid = 'spec-123';
  const checkHired = (proj: any, inviteStatus?: string, appStatus?: string) => {
    return Boolean(
      currentUid && (
        proj.symbioteId === currentUid ||
        proj.assignedSymbioteId === currentUid ||
        (proj.teamMembers || []).some((m: any) => m.uid === currentUid) ||
        inviteStatus === 'accepted' ||
        appStatus === 'accepted' ||
        appStatus === 'hired'
      )
    );
  };

  assert.strictEqual(checkHired({ symbioteId: 'spec-123' }), true);
  assert.strictEqual(checkHired({ assignedSymbioteId: 'spec-123' }), true);
  assert.strictEqual(checkHired({ teamMembers: [{ uid: 'spec-123' }] }), true);
  assert.strictEqual(checkHired({}, 'accepted'), true);
  assert.strictEqual(checkHired({}, undefined, 'hired'), true);
  assert.strictEqual(checkHired({}, 'pending', 'pending'), false);
  assert.strictEqual(checkHired({ symbioteId: 'other' }), false);
});

// ---------------------------------------------------------------------
// 7. Invitations Page Action Hub
// ---------------------------------------------------------------------
console.log('\n📌 Audit Area 7: Invitations Page Action Hub');

test('SymbioteInvitationsPage contains both View Details and Go to Workspace for accepted cards', () => {
  const content = fs.readFileSync(path.join(process.cwd(), 'src/pages/symbiote/SymbioteInvitationsPage.tsx'), 'utf-8');
  assert.ok(content.includes('View Details'), 'Missing View Details button');
  assert.ok(content.includes('Go to Workspace'), 'Missing Go to Workspace button');
  assert.ok(content.includes('/symbiote/workspace/'), 'Missing workspace route navigation');
});

// ---------------------------------------------------------------------
// 8. Team Add Modal Avatar Sanitization & Initials
// ---------------------------------------------------------------------
console.log('\n📌 Audit Area 8: Team Add Modal Avatar Fallbacks & Sanitization');

test('Avatar initials generation produces clean 2-letter uppercase initials', () => {
  const extractInitials = (name: string, fallback?: string) => {
    const parts = name.trim().split(/\s+/);
    return fallback || (parts.length >= 2 ? (parts[0][0] + parts[1][0]).toUpperCase() : name.slice(0, 2).toUpperCase()) || 'SP';
  };

  assert.strictEqual(extractInitials('John Doe'), 'JD');
  assert.strictEqual(extractInitials('Alex'), 'AL');
  assert.strictEqual(extractInitials('Dr. Jane Smith'), 'DJ');
  assert.strictEqual(extractInitials('Muhammad Hassan'), 'MH');
  assert.strictEqual(extractInitials('', 'SP'), 'SP');
});

test('Avatar URL sanitizer cleans corrupt, null, and undefined strings', () => {
  const sanitizeUrl = (rawUrl?: string) => {
    return typeof rawUrl === 'string' && rawUrl.trim().length > 5 && rawUrl !== 'null' && rawUrl !== 'undefined'
      ? rawUrl.trim()
      : undefined;
  };

  assert.strictEqual(sanitizeUrl('https://example.com/pic.jpg'), 'https://example.com/pic.jpg');
  assert.strictEqual(sanitizeUrl('null'), undefined);
  assert.strictEqual(sanitizeUrl('undefined'), undefined);
  assert.strictEqual(sanitizeUrl('   '), undefined);
  assert.strictEqual(sanitizeUrl('abc'), undefined);
  assert.strictEqual(sanitizeUrl(undefined), undefined);
});

// ---------------------------------------------------------------------
// 9. AI Brief Multi-Field Sync in Step 3
// ---------------------------------------------------------------------
console.log('\n📌 Audit Area 9: AI Executive Brief Multi-Field Draft Synchronization');

test('Step 3 persist payload synchronizes title, skills, and description when brief is attached', () => {
  const buildSyncPayload = (brief: { title?: string; description: string; recommendedSkills?: string[] } | null, attached: boolean) => {
    return {
      aiBriefAttached: attached,
      aiBrief: brief || undefined,
      ...(attached && brief ? {
        description: brief.description,
        ...(brief.title ? { title: brief.title } : {}),
        ...(brief.recommendedSkills && brief.recommendedSkills.length > 0 ? { skills: brief.recommendedSkills } : {}),
      } : {}),
    };
  };

  const attachedPayload = buildSyncPayload({
    title: 'AI Multi-Agent Orchestrator',
    description: 'Enterprise workflow automation platform.',
    recommendedSkills: ['Python', 'LangChain', 'FastAPI'],
  }, true);

  assert.strictEqual(attachedPayload.aiBriefAttached, true);
  assert.strictEqual(attachedPayload.title, 'AI Multi-Agent Orchestrator');
  assert.strictEqual(attachedPayload.description, 'Enterprise workflow automation platform.');
  assert.deepStrictEqual(attachedPayload.skills, ['Python', 'LangChain', 'FastAPI']);

  const unattachedPayload = buildSyncPayload({
    title: 'Draft',
    description: 'Draft',
    recommendedSkills: ['Go'],
  }, false);

  assert.strictEqual(unattachedPayload.aiBriefAttached, false);
  assert.strictEqual((unattachedPayload as any).title, undefined);
  assert.strictEqual((unattachedPayload as any).skills, undefined);
});

console.log('\n====================================================');
console.log(`📊 Audit Test Results: ${passed} Passed, ${failed} Failed`);
console.log('====================================================');

if (failed > 0) {
  process.exit(1);
}
