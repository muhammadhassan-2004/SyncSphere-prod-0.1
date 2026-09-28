import { addComment, moveCard, getOrCreateResolvedList } from './trello_sync';

async function resolveCard1() {
  const cardId = '6ab6f0f3495122b6f71faf31';
  const resolvedList = await getOrCreateResolvedList();

  const comment = `✅ **Issue Resolved by Antigravity AI:**

1. **Root Cause**: 
   - \`VerifyEmailPage.tsx\` header contained a \`Home\` link (\`to="/"\`) next to "Back to sign in", which allowed users to escape the verification screen.
   - When reaching the home/landing page, the navbar showed "Dashboard" if an authenticated user session existed.
   - \`ProtectedRoute.tsx\` checked \`onboardingCompleted\` but had no guard for \`emailVerified\`, allowing direct URL navigation to any role dashboard (\`/client/*\`, \`/symbiote/*\`, \`/admin/*\`) without verifying the email address.

2. **Resolution Implemented**:
   - **Removed Home Link**: Removed \`Home\` bypass link completely from \`VerifyEmailPage.tsx\` header. "Back to sign in" now explicitly signs out the user session before redirecting to \`/login\`.
   - **Strict Route Guard**: Updated \`ProtectedRoute.tsx\` to enforce that any user with \`emailVerified === false\` is immediately blocked and redirected to \`/verify-email\` with their email and role pre-filled.
   - **Navbar Synchronization**: Updated \`PublicNavbar.tsx\` so that if an unverified user is on the landing page, the CTA button dynamically switches to **"Verify Email"** pointing directly to \`/verify-email\`, completely eliminating the dashboard bypass.

3. **Verification**:
   - Automated tests: **141/141 passed (100%)**
   - TypeScript checks: **0 errors**

Card moved to **✅ Resolved**.`;

  console.log('Posting comment to Trello Card #1...');
  await addComment(cardId, comment);
  console.log('Comment posted successfully!');

  console.log(`Moving Card #1 to "${resolvedList.name}" list (id: ${resolvedList.id})...`);
  await moveCard(cardId, resolvedList.id);
  console.log('Card #1 moved to Resolved successfully!');
}

resolveCard1().catch(console.error);
