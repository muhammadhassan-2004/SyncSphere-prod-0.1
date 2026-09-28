import { addComment, moveCard } from './trello_sync';

async function main() {
  const cardId = '6ab7065815948a74cb36e765';
  const resolvedListId = '6abaa04654e2fbe5a35932b2';

  const comment = `✅ **Issue Resolved: Client Portal Navigation & Repository Nomenclature Standardization ("Files & Resources")**

1. **Client Portal Navigation**:
   - Updated \`src/components/layout/PortalShell.tsx\` to rename the client navigation item from legacy \`"Files & Docs"\` to \`"Files & Resources"\`.
   - Updated the icon to \`Folder\` to provide unified consistency with project workspace tabs.

2. **Repository Header & E-Sign Contract**:
   - Updated \`src/pages/client/FilesAndDocsPage.tsx\` header to \`"All Project Files & Resources"\` with updated subtitle.
   - Hardened \`"Generate & Sign Contract"\` button to dynamically select the active project or first available project.
   - Enhanced \`filteredFiles\` to support searching by project title even when files do not store a dedicated \`projectName\` field directly in Firestore by resolving through \`projectMap[f.projectId]\`.

3. **Verification**:
   - \`tsc --noEmit\`: Exit code 0 (0 errors).
   - \`npm run build\`: Exit code 0 (Production build verified).
   - \`npm test\`: 144/144 tests passed (100% clean).
   - Documented in \`documents/BUGS_AND_ISSUES_TRACKER.md\` under Issue #82.`;

  console.log(`Posting comment to card ${cardId}...`);
  await addComment(cardId, comment);
  console.log(`Moving card ${cardId} to Resolved list (${resolvedListId})...`);
  await moveCard(cardId, resolvedListId);
  console.log('Card #9 successfully moved to Resolved! 🎉');
}

main().catch(console.error);
