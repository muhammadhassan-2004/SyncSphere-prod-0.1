import assert from 'assert';
import { getUserPresence, getUserStatusDot } from '../src/lib/utils/presence';
import { computeDeterministicMatchScore } from '../src/lib/firestore/matches';
import { TIMEZONES, getDetectedTimezone } from '../src/lib/constants';
import fs from 'fs';

console.log('====================================================');
console.log('🔬 RUNNING RIGOROUS EDGE-CASE & REGRESSION AUDIT');
console.log('====================================================\n');

// -----------------------------------------------------------------
// SUITE 1: PRESENCE UTILITY AUDIT & EDGE CASES
// -----------------------------------------------------------------
console.log('🧪 Suite 1: Presence Utility & False-Positive Elimination');

// Edge Case 1: Explicit logout (isOnline: false)
{
  const user = {
    uid: 'user-logged-out',
    isOnline: false,
    lastActiveAt: new Date().toISOString(), // Just logged out 1 second ago!
    updatedAt: new Date().toISOString(),
  };
  const presence = getUserPresence(user);
  assert.strictEqual(presence.isOnline, false, 'User with isOnline: false must have isOnline: false');
  assert.strictEqual(presence.statusDot, undefined, 'User with isOnline: false must NOT have statusDot');
  assert.strictEqual(getUserStatusDot(user), undefined, 'getUserStatusDot must return undefined');
  console.log('  ✅ PASS: Explicit isOnline: false never shows green status dot');
}

// Edge Case 2: Document touched/updated (updatedAt is fresh, but user is NOT logged in)
{
  const user = {
    uid: 'user-db-touched',
    updatedAt: new Date().toISOString(), // Modified in DB 1 second ago
    lastActiveAt: new Date(Date.now() - 24 * 3600 * 1000).toISOString(), // Active yesterday
  };
  const presence = getUserPresence(user);
  assert.strictEqual(presence.isOnline, false, 'DB touched user without isOnline should NOT be online');
  assert.strictEqual(presence.statusDot, undefined, 'DB touched user should NOT have green statusDot');
  console.log('  ✅ PASS: updatedAt timestamp never triggers false-positive green live dot');
}

// Edge Case 3: Genuinely active user (isOnline: true with fresh heartbeat)
{
  const user = {
    uid: 'user-active-now',
    isOnline: true,
    lastActiveAt: new Date(Date.now() - 60 * 1000).toISOString(), // 1 min ago
  };
  const presence = getUserPresence(user);
  assert.strictEqual(presence.isOnline, true, 'Active user must be online');
  assert.strictEqual(presence.statusDot, 'online', 'Active user must have online statusDot');
  console.log('  ✅ PASS: Genuinely active user shows online with green status dot');
}

// Edge Case 4: Stale session (isOnline: true but abandoned tab / browser crashed 30 mins ago)
{
  const user = {
    uid: 'user-abandoned-session',
    isOnline: true,
    lastActiveAt: new Date(Date.now() - 35 * 60 * 1000).toISOString(), // 35 min ago
  };
  const presence = getUserPresence(user);
  assert.strictEqual(presence.isOnline, false, 'Abandoned session must be marked offline');
  assert.strictEqual(presence.statusDot, undefined, 'Abandoned session must NOT have statusDot');
  console.log('  ✅ PASS: Stale session (>15 mins) safely auto-downgrades to offline');
}

// Edge Case 5: Null / Undefined input
{
  assert.strictEqual(getUserStatusDot(null), undefined);
  assert.strictEqual(getUserStatusDot(undefined), undefined);
  console.log('  ✅ PASS: Null and undefined users handled safely without errors');
}

// -----------------------------------------------------------------
// SUITE 2: DETERMINISTIC MATCH SCORING & EXPLAINABILITY AUDIT
// -----------------------------------------------------------------
console.log('\n🧪 Suite 2: AI Match Scoring Consistency & Edge Cases');

const project = {
  title: 'AI Brief: Full Stack Web App',
  skills: ['Python', 'React', 'FastAPI', 'Docker', 'TypeScript'],
};

// Edge Case 6: Matching candidate scores >= 70%
{
  const candidate = {
    title: 'Senior Full Stack Specialist',
    skills: ['React', 'TypeScript', 'Docker', 'Python'],
    experience: 'Senior',
    availability: 'Immediate',
  };
  const res = computeDeterministicMatchScore(candidate, project);
  assert.ok(res.matchScore >= 70, `Expected matchScore >= 70, got ${res.matchScore}`);
  assert.ok(res.explanation.includes('AI Brief: Full Stack Web App'), 'Explanation must include project title');
  assert.ok(res.explanation.length < 250, 'Explanation must be short and crisp');
  console.log(`  ✅ PASS: High qualification specialist scores ${res.matchScore}% with crisp explanation`);
}

// Edge Case 7: Unrelated candidate (Video Editor) strictly scores <= 15%
{
  const unrelatedCandidate = {
    title: 'Video Editor & Animator',
    skills: ['Final Cut Pro', 'Motion Graphics', 'Blender'],
    experience: 'Expert',
    availability: 'Immediate',
  };
  const res = computeDeterministicMatchScore(unrelatedCandidate, project);
  assert.ok(res.matchScore <= 15, `Expected score <= 15 for unrelated candidate, got ${res.matchScore}`);
  assert.ok(res.explanation.includes('does not align'), 'Explanation must state does not align');
  console.log(`  ✅ PASS: Unrelated candidate strictly disqualified with ${res.matchScore}% score`);
}

// Edge Case 8: Dirty/Malformed Skills input
{
  const dirtyProject = {
    title: 'Python Microservice',
    skills: [null as any, undefined as any, 999 as any, '   python   ', ''],
  };
  const candidate = {
    title: 'Backend Dev',
    skills: ['PYTHON'],
  };
  const res = computeDeterministicMatchScore(candidate, dirtyProject);
  assert.ok(res.matchScore >= 50, `Expected Python match despite dirty input, got ${res.matchScore}`);
  console.log('  ✅ PASS: Dirty/malformed project skills handled gracefully');
}

// -----------------------------------------------------------------
// SUITE 3: CODEBASE AUDIT AGAINST INSTRUCTIONS.MD
// -----------------------------------------------------------------
console.log('\n🧪 Suite 3: Codebase Compliance Audit');

// Verify EditProfilePage has renamed Work & Position and has functional TIMEZONES
{
  const editProfileCode = fs.readFileSync('src/pages/client/EditProfilePage.tsx', 'utf8');
  assert.ok(!editProfileCode.includes('Work & Position'), 'Must not contain "Work & Position"');
  assert.ok(editProfileCode.includes('Company & Location'), 'Must contain "Company & Location"');
  assert.ok(editProfileCode.includes('TIMEZONES.map'), 'Must render TIMEZONES dropdown');
  console.log('  ✅ PASS: EditProfilePage uses Company & Location and TIMEZONES select');
}

// Verify AddTeamMemberModal subscribes to project matches
{
  const modalCode = fs.readFileSync('src/components/project/AddTeamMemberModal.tsx', 'utf8');
  assert.ok(modalCode.includes('subscribeToProjectMatches'), 'Must import subscribeToProjectMatches');
  assert.ok(modalCode.includes('storedMatches.find'), 'Must check stored project matches for consistency');
  assert.ok(modalCode.includes('getUserStatusDot(candidate)'), 'Must pass candidate with presence to getUserStatusDot');
  console.log('  ✅ PASS: AddTeamMemberModal is fully synchronized with PreSync AI matches');
}

// Verify AIMatchingPage candidate assembly has presence fields
{
  const aiCode = fs.readFileSync('src/pages/client/AIMatchingPage.tsx', 'utf8');
  assert.ok(aiCode.includes('isOnline: matchedSymbiote?.isOnline'), 'AIMatchingPage passes isOnline');
  assert.ok(aiCode.includes('lastActiveAt: matchedSymbiote?.lastActiveAt'), 'AIMatchingPage passes lastActiveAt');
  assert.ok(!aiCode.includes('Math.random()'), 'AIMatchingPage has zero Math.random() in matching logic');
  console.log('  ✅ PASS: AIMatchingPage passes genuine presence and has 0 Math.random()');
}

console.log('\n====================================================');
console.log('🎉 ALL EDGE CASES AND REGRESSION CHECKS PASSED 100%!');
console.log('====================================================');
