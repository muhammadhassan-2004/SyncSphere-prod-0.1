# SyncSphere Technical & Operational Documentation

Welcome to the complete, exhaustive documentation for **SyncSphere** — an enterprise-grade, AI-orchestrated, multi-role collaborative freelance marketplace and project management platform.

---

## 📑 Complete Document Directory

| Document | Scope & Contents |
| :--- | :--- |
| **[⭐ Master Project Blueprint & Dossier](./MASTER_PROJECT_BLUEPRINT.md)** | **The authoritative end-to-end architectural dossier: Inception vision, full system architecture, changelog of critical breakthroughs & bug fixes, and complete role-by-role operational guides.** |
| **[1. Architecture & Design System](./ARCHITECTURE.md)** | Full-stack architecture, runtime environment, state management (`AuthContext`), design tokens, CSS theme variables, typography, and layout hierarchies. |
| **[2. Database Schema & Data Dictionary](./DATABASE_SCHEMA.md)** | Every Firestore collection, subcollection, field specification, types, relationships, indexes, and real-time listeners. |
| **[3. Authentication & Security Framework](./AUTHENTICATION_AND_SECURITY.md)** | Firebase Auth integration, role guards (`ProtectedRoute`, `PublicOnlyRoute`, `RequireAdmin`), password anti-reuse verification, OTP email flow, and `firestore.rules`. |
| **[4. Backend APIs & Microservices](./BACKEND_API_AND_SERVICES.md)** | Express API endpoints, Gemini AI prompt pipelines (`@google/genai`), Cloudinary CDN uploads, Nodemailer SMTP service, and Firebase Admin SDK. |
| **[5. Client Portal Specification](./CLIENT_PORTAL.md)** | Every client page, 4-step project posting wizard, AI matching engine, proposal evaluation, team workspace, time approvals, and invoice payments. |
| **[6. Symbiote (Freelancer) Portal Specification](./SYMBIOTE_PORTAL.md)** | Every freelancer view, project search engine, AI proposal generator, contract workspaces, time-tracker widget, milestone billing, and portfolio manager. |
| **[7. Admin Portal & Governance](./ADMIN_PORTAL.md)** | Real-time system monitoring, user status management, project dispute oversight, audit trail filters, financial reports, and platform settings. |
| **[8. Public Pages & Marketing Workflows](./PUBLIC_PAGES_AND_MARKETING.md)** | Landing page sections, interactive mockups, role selection gateway, onboarding stepper, email action handlers, and legal pages. |
| **[9. UI Component Library & Design Tokens](./COMPONENTS_AND_UI_KIT.md)** | Complete breakdown of `/components/ui`, `/components/widgets`, `/components/layout`, `/components/project`, and `/components/talent`. |
| **[10. Environment, Build & Deployment](./ENVIRONMENT_AND_DEPLOYMENT.md)** | Environment variable dictionary (`.env.example`), Vite/Express build pipeline, container startup, and deployment instructions. |
| **[🐛 Bugs, Issues & Roadmap Tracker](./BUGS_AND_ISSUES_TRACKER.md)** | Centralized registry of technical debt, missing third-party integrations, UI quirks, and active issue logging. |

---

## 🌟 Platform Highlights

* **Three-Tier Role Model**: Purpose-built experiences for **Clients**, **Symbiotes** (Freelancers), and **Administrators**.
* **Gemini AI Intelligence**: Real-time semantic talent matching, automated project brief synthesis, AI-generated proposals, and automated contract drafting.
* **Live WebSockets & Collaboration**: Real-time Firestore sync for messaging, workspace kanban cards, milestone progress, and time logs.
* **Enterprise Security**: Old-password verification against reuse, role verification guards, and strict document-level Firestore security rules.
