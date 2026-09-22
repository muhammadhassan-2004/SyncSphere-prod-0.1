# Public Pages & Marketing Workflows

SyncSphere features a complete suite of public-facing marketing, onboarding, and authentication pages designed with high-conversion layouts, dark aesthetic styling, and accessible responsive controls.

---

## 1. Page Inventory

| Route | Component | Purpose & Features |
| :--- | :--- | :--- |
| `/` | `LandingPage.tsx` | Main marketing homepage: Hero section with dynamic CTAs, Live talent/project statistics, Interactive AI Dashboard Mockup, Feature cards, Step-by-step workflow, Live testimonials, and FAQ Accordion. |
| `/login` | `LoginPage.tsx` | Role-aware login portal: Email & password credentials, demo role fast-login switcher, remember me token, and links to registration. |
| `/signup` | `SignupPage.tsx` | Account registration: Name, email, password with live strength verification (`PasswordRequirementChecklist`), role assignment, and terms agreement. |
| `/portal-select` | `PortalSelectPage.tsx` | Visual onboarding role selector: Interactive cards distinguishing **Client** ("I want to hire talent and post projects") and **Symbiote** ("I want to work on AI and tech projects"). |
| `/onboarding` | `OnboardingPage.tsx` | First-time profile configuration stepper tailored to the chosen role: Bio, Headline, Skills, Hourly Rate, Company details, and Avatar upload. |
| `/verify-email` | `VerifyEmailPage.tsx` | 6-digit OTP code entry screen with auto-focus inputs (`OTPInput`), resend cooldown timer, and email confirmation. |
| `/forgot-password` | `ForgotPasswordPage.tsx` | Password reset request form: Enter registered email to receive a secure password reset link or OTP. |
| `/reset/verify` | `ResetVerifyPage.tsx` | Reset OTP verification step before granting password change authorization. |
| `/reset/new-password`| `ResetNewPasswordPage.tsx`| Password update screen enforcing old-password rejection and new password complexity rules. |
| `/auth/action` | `AuthActionPage.tsx` | Firebase Auth oobCode router: Handles native Firebase action URLs (e.g. `mode=resetPassword`, `mode=verifyEmail`). |
| `/about` | `AboutPage.tsx` | Company mission, founding story, core principles, and executive leadership details. |
| `/contact` | `ContactUsPage.tsx` | Interactive contact form, direct support emails, office locations, and live inquiry submission. |
| `/help` | `HelpCenterPage.tsx` | Searchable knowledge base, categorized FAQs, step-by-step tutorials, and ticket submission. |
| `/terms` | `TermsOfServicePage.tsx` | Legally binding terms of service, platform fee schedules, escrow policies, and dispute resolution guidelines. |
| `/privacy` | `PrivacyPolicyPage.tsx` | Data privacy guidelines, GDPR/CCPA compliance notices, cookie policies, and data deletion request instructions. |

---

## 2. Dynamic Landing Page Modules (`/src/components/landing/*`)

* **Hero & Interactive Dashboard Mockup (`DashboardMockup.tsx`)**: An interactive preview showcasing AI matching metrics, live milestone velocity, and revenue gauges that dynamically respond to hover and click interactions.
* **Feature Cards (`FeatureCard.tsx`)**: Highlighting AI Semantic Search, Real-Time Collaboration Workspaces, Escrow Protection, and Instant Direct Messaging.
* **Numbered Steps (`NumberedStepCard.tsx`)**: 3-step walkthrough for clients (Post -> Match -> Hire) and symbiotes (Browse -> Propose -> Deliver).
* **Live Testimonials (`LiveTestimonialsSection.tsx`)**: Verified client and freelancer testimonials with ratings and portfolio tags.
* **Interactive FAQ (`FaqAccordion.tsx`)**: Animated expandable FAQ entries covering billing, AI security, platform commissions, and escrow guarantees.

---

## 3. Email & Auth Action Routing (`AuthActionPage.tsx`)

When users click links sent by Firebase Authentication or custom SMTP emails:
1. `AuthActionPage` parses URL search parameters: `mode` (`resetPassword` / `verifyEmail`) and `oobCode`.
2. For password resets: verifies the one-time code and passes state to `/reset/new-password`.
3. For email verification: invokes Firebase Auth's `applyActionCode(auth, oobCode)` and redirects to `/verify-email` with a verified success badge.
