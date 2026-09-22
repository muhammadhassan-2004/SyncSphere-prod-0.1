# UI Component Library & Design Tokens

SyncSphere is styled using custom Tailwind CSS utility classes and design tokens structured to prevent visual clutter, maintain high contrast, and deliver responsive interactions.

---

## 1. UI Primitives (`/src/components/ui/*`)

| Component | File | Description & Props |
| :--- | :--- | :--- |
| `Button` | `button.tsx` | Variants: `default`, `secondary`, `outline`, `ghost`, `destructive`, `cyan`. Sizes: `sm`, `md`, `lg`, `icon`. Supports loading spinner state. |
| `Card` / `CardHeader` / `CardTitle` / `CardContent` | `card.tsx` | Container primitives with dark border strokes (`--color-border`), subtle radius, and optional hover highlights. |
| `Input` / `Textarea` | `input.tsx` | Form inputs with focus rings (`--color-accent-cyan`), disabled states, and error borders. |
| `Badge` / `StatusPill` | `badge.tsx` | Color-coded status indicators (`open`, `in_progress`, `completed`, `paid`, `pending`, `danger`). |
| `Avatar` | `avatar.tsx` | User profile avatar with fallback initials generator and online status dot indicator. |
| `AvatarStack` | `AvatarStack.tsx` | Overlapping avatar list showing assigned team members or active project participants. |
| `PasswordInput` | `PasswordInput.tsx` | Secure password field with show/hide password toggle eye icon. |
| `OTPInput` | `OTPInput.tsx` | 6-box auto-advancing numeric OTP input with clipboard paste support and backspace handling. |
| `PasswordRequirementChecklist` | `PasswordRequirementChecklist.tsx` | Interactive checkmark list verifying length, uppercase, lowercase, numbers, and symbols in real time. |
| `EmptyState` | `EmptyState.tsx` | Standardized empty state card with icon illustration, title, description, and primary CTA button. |
| `Skeleton` | `Skeleton.tsx` | Animated pulse placeholder blocks used during async Firestore loading states. |
| `ConfirmDialog` | `ConfirmDialog.tsx` | Modal dialog for destructive actions (Delete, Suspend, Cancel Contract) with confirmation buttons. |
| `StatCard` / `ResponsiveStatValue` | `StatCard.tsx`, `ResponsiveStatValue.tsx` | Metric cards with trend arrows (+12% vs last month), icon accents, and responsive text sizing. |
| `SyncSphereLogo` / `SyncSphereLogoIcon` | `SyncSphereLogo.tsx`, `SyncSphereLogoIcon.tsx` | Official SVG vector branding logo with glowing gradient orbital nodes. |

---

## 2. Layout Shells & Navigation (`/src/components/layout/*`)

* **`PortalShell.tsx`**: Top-level wrapper for Client, Symbiote, and Admin portals.
  * Collapsible responsive sidebar with role-tailored navigation items.
  * Top navigation bar with Global Search trigger, unread notification bell, role switcher, and user avatar dropdown menu.
  * Smooth page transition wrapper with `ScrollToTop` resets.
* **`PublicNavbar.tsx`**: Header for public landing and marketing pages with navigation links, portal links, and Login/Signup buttons.
* **`PublicFooter.tsx`**: Multi-column footer with links to platform portals, legal documents, newsletter subscription, and copyright notice.
* **`GlobalSearchBar.tsx`**: Command-palette modal (`Cmd+K` / `Ctrl+K`) for instant keyboard navigation across projects, talent, invoices, and settings.

---

## 3. Specialized Domain Components

### 3.1 Talent & Profile Components (`/src/components/talent/*`)
* `ProfileHeader.tsx` - Avatar, name, verified badge, hourly rate pill, location, and hire button.
* `AboutTab.tsx` - Extended bio, languages spoken, and availability status card.
* `SkillsTab.tsx` - Skill badges categorized by proficiency level.
* `PortfolioTab.tsx` - Visual grid of completed projects with screenshots, client tags, and external demo links.
* `ExperienceTab.tsx` - Chronological career history and key achievements.
* `CertificationsTab.tsx` - Verified credentials, issuing organizations, and issue dates.
* `ReviewsTab.tsx` - Client reviews, star ratings, project links, and response notes.
* `InviteModal.tsx` - Pop-up modal allowing clients to invite a symbiote to one of their active projects.

### 3.2 Project & Workspace Components (`/src/components/project/*`)
* `ProjectHeader.tsx` - Project title, client metadata, budget pill, status badge, and action buttons.
* `OverviewTab.tsx` - High-level project summary, required skills, timeline, and deliverables list.
* `MilestonesTab.tsx` - Escrow milestone breakdown with status pills (Funded, In Progress, Review, Released).
* `WorkspaceTab.tsx` - Interactive Kanban board with drag-and-drop / click-to-move task cards.
* `TaskDrawer.tsx` - Slide-over drawer to inspect, edit, assign, or delete workspace tasks.
* `ProjectTeamTab.tsx` - List of active contributors, client managers, and role descriptions.
* `ProjectFilesTab.tsx` - Uploaded files list with preview links and download actions.
* `UploadProjectFileModal.tsx` - Drag-and-drop file upload dialog supporting PDF, images, code files, and archives.

---

## 4. Toast Notification System (`/src/lib/toast/*`)

Lightweight React Context providing toast banners:
* `toast.success(message)` - Emerald banner with checkmark icon.
* `toast.error(message)` - Crimson banner with alert triangle.
* `toast.info(message)` - Cyan banner with info circle.
* Auto-dismisses after 4 seconds with manual close buttons.
