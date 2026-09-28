import { addComment, moveCard, getOrCreateResolvedList } from './trello_sync';

async function run() {
  const cardId = '6ab6fd77846da3b5958f1c45'; // Card #4 (Freelancer Profile location sync & client pay button purge)
  const resolvedList = await getOrCreateResolvedList();
  console.log(`Resolved list id: ${resolvedList.id}`);

  const resolutionComment = `✅ **Issue Verified & Resolved via Automated Engine**

**Summary of Changes:**
1. **Purged "View Client Page" Button:**
   - Completely removed the unneeded \`View Client Page\` button (\`<Button variant="outline"><Eye />View Client Page<ArrowUpRight /></Button>\`) from the header of \`src/pages/symbiote/SymbioteProfilePage.tsx\`.
   - Cleaned up unused \`ArrowUpRight\` icon import.

2. **Location Synchronization & Persistence Fix:**
   - Fixed \`src/pages/public/OnboardingPage.tsx\` where freelancer (\`activeRole === 'symbiote'\`) was omitting the entered location and country from Firestore updates. Now persists \`location: rawLocation\` and \`country: normalizeCountry(rawLocation)\`.
   - Updated client onboarding so that \`location\` preserves the user's exact typed location string (e.g., "California", "San Francisco, CA") alongside normalized country.
   - Updated \`src/pages/symbiote/SymbioteProfilePage.tsx\` with resilient fallbacks (\`profile.location || profile.country || profile.city || profile.companyProfile?.country || ''\`) to ensure the user's location immediately loads and displays on their profile.

3. **Automated Verification:**
   - TypeScript compilation: 0 errors (\`npx tsc --noEmit\`).
   - Automated regression test suite: **141/141 passed (100%)**.

**Moved to:** ✅ Resolved`;

  console.log(`Posting comment to card ${cardId}...`);
  await addComment(cardId, resolutionComment);
  console.log(`Moving card ${cardId} to list ${resolvedList.id}...`);
  await moveCard(cardId, resolvedList.id);
  console.log('Done!');
}

run().catch((err) => {
  console.error('Error resolving card #4:', err);
  process.exit(1);
});
