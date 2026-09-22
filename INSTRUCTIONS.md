# SyncSphere — AI Agent Instructions, Development Rules & Anti-Hallucination Protocols

This document serves as the **Single Source of Truth** for all AI agents working on SyncSphere. Every AI assistant MUST read, internalize, and strictly follow these rules before inspecting code or performing any action.

---

## 🛑 1. Anti-Hallucination & Documentation Grounding (Strict Zero-Guess Policy)

1. **No Inventing, Assuming, or Guessing**:
   - Never assume, invent, or guess any APIs, database schemas, credentials, ports, business rules, or component behaviors.
   - If something is unclear or unspecified, inspect the codebase and project documentation directly (`documents/`, `src/`, `types/`, `.env.example`).
   - If an answer cannot be grounded in existing code or documentation, state clearly what is missing and ask the user rather than fabricating facts.

2. **Strict Grounding in Existing Documentation**:
   - Always reference official project documents:
     - `documents/MASTER_PROJECT_BLUEPRINT.md` (Architecture, routes, RBAC, data schemas)
     - `documents/BUGS_AND_ISSUES_TRACKER.md` (Live issue tracking, resolved fixes)
     - `documents/APPLICATION_COMPONENTS_MAP.md` (UI hierarchy and component catalog)
     - `documents/SYNC_ARCHITECTURE_MATRIX.md` (Firestore sync pathways)
   - Never create features or code patterns that contradict documented project architecture.

3. **Verify File Contents Before Editing**:
   - Never edit a file from memory or training weights. Always use read tools (`view_file`, `grep_search`) to inspect the exact current line numbers and real content before proposing or executing changes.

---

## 📌 2. Core Workflow & Development Discipline

1. **Step-by-Step Execution Only**:
   - Never fix multiple unrelated issues or modify unrelated components in a single pass.
   - Work strictly on one problem at a time in a disciplined, sequential manner.

2. **Diagnose & Explain in Simple Roman Urdu First**:
   - Before touching any code, clearly explain:
     1. **Masla Kya Hai?** (Root cause identified with exact file and line references).
     2. **Ye Kaise Fix Hoga?** (Proposed minimal, safe fix).
     3. **Zero Side-Effects Guarantee** (Explicitly confirm that unrelated features will not be touched or broken).
   - Always communicate explanations, questions, and summaries in clear, simple Roman Urdu as preferred by the user.

3. **User Approval ("allow") is Strictly Mandatory**:
   - **NEVER** edit files, run modifying commands, or make changes without the user's explicit permission (e.g., user saying **"allow"**).
   - Present the diagnosis and plan, then STOP and wait for user approval.

4. **Surgical, Minimal Edits (Zero Collateral Damage)**:
   - Edit ONLY the specific lines and files directly responsible for the targeted issue.
   - Never perform unnecessary refactoring, re-formatting, styling overhauls, or structural rewrites of unrelated files.
   - **DO NOT TOUCH CRITICAL MODULES** unless explicitly instructed:
     - Authentication, Login, Signup, Password Reset, Registration (`src/context/AuthContext.tsx`, `src/pages/public/`).
     - Core Firebase configuration (`src/lib/firebase.ts`).
     - Stripe payment gateways, Escrow logic, and Security Rules.
   - Never fix one issue at the cost of breaking another (e.g., breaking signup or login while fixing another issue).

5. **No Auto-Seeding or Fake Dummy Injections**:
   - Never inject hardcoded mock arrays, fake seed tasks, synthetic status updates, or dummy time entries into clean database states.
   - Always maintain clean empty states with intuitive user CTAs (e.g., "Create First Task", "Start Live Timer").

6. **Rigorous Post-Fix Verification (No Speculation)**:
   - After every single code modification, you MUST run:
     - `npm run lint` (`tsc --noEmit`): Verify 0 TypeScript errors.
     - `npm run build`: Verify that Vite production bundling succeeds with Exit Code 0.
   - Never tell the user an issue is fixed until both verification commands succeed without errors.

7. **Documentation Alignment**:
   - Whenever an issue is resolved and verified, immediately update `documents/BUGS_AND_ISSUES_TRACKER.md` with the verified resolution and date.
   - Never mark an issue as resolved in documentation without real test verification.
