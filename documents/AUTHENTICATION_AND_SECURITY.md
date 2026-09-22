# Authentication, Authorization & Security Architecture

SyncSphere implements a multi-layer security architecture ensuring zero-trust isolation between Clients, Symbiotes (Freelancers), and Platform Administrators.

---

## 1. Authentication Lifecycle

```
[Public Login / Signup]
        │
        ▼
[Firebase Authentication Client SDK] ───► Firebase ID Token (JWT)
        │
        ▼
[Firestore /users/{uid} Listener] ──────► Fetches Profile & Role
        │
        ▼
[AuthContext.tsx Memoized State] ───────► Initializes { userProfile, currentRole, authenticatedUser }
        │
        ▼
[React Router Guard Evaluation]
   ├── <PublicOnlyRoute />  ──► Redirects authenticated users to designated portal
   ├── <ProtectedRoute />    ──► Enforces role-level access matching
   └── <RequireAdmin />      ──► Enforces admin role clearance
```

---

## 2. Route Protection Mechanics

### 2.1 `ProtectedRoute.tsx`
* **Purpose**: Guards role-restricted zones (`/client/*`, `/symbiote/*`, `/admin/*`).
* **Behavior**:
  1. Checks `loading` state from `AuthContext`. Displays a sleek full-page loading skeleton while state resolves.
  2. If no user is authenticated, captures the intended path and redirects to `/login` with `state: { from: location }`.
  3. Verifies `userRole === requiredRole` (with backwards compatibility for legacy `'freelancer'` mapping to `'symbiote'`). If a role mismatch occurs, navigates the user to their own role's dashboard.

### 2.2 `PublicOnlyRoute.tsx`
* **Purpose**: Prevents already-logged-in users from seeing authentication forms (`/login`, `/signup`, `/portal-select`).
* **Behavior**: If an active session is detected, immediately performs a client-side redirect (`replace: true`) to `/${role}/dashboard`.

### 2.3 `RequireAdmin.tsx`
* **Purpose**: High-privilege access guard for administrative tooling.
* **Behavior**: Confirms that `userProfile.role === 'admin'`. Unauthorized visitors receive an access denied card with a direct button to return to the public portal.

---

## 3. Password Lifecycle & Anti-Reuse Security

SyncSphere implements protection against password reuse and unauthorized changes:

```
[User Submits New Password]
             │
             ▼
[POST /api/auth/update-password]
             │
   ┌─────────┴─────────────────────────────────────────┐
   ▼                                                   ▼
[Validate Old Password]                      [Check Against History]
  Uses Firebase REST Identity API              Prevents re-entering identical
  (verifyPassword with oldPassword)            or recent historical passwords
   │                                                   │
   └─────────────────────────┬─────────────────────────┘
                             │ Validated
                             ▼
     [Firebase Admin SDK: updateUser(uid, { password })]
                             │
                             ▼
     [Return Success 200 + Invalidate Old Sessions]
```

### Password Complexity Requirements
Enforced by `<PasswordRequirementChecklist />` and backend validators:
* At least 8 characters in length
* At least one uppercase letter (`A-Z`)
* At least one lowercase letter (`a-z`)
* At least one number (`0-9`)
* At least one special symbol (`!@#$%^&*()_+...`)

---

## 4. One-Time Password (OTP) & Email Verification

* **Endpoint**: `POST /api/auth/verify-code`
* **Generation**: Generates cryptographic 6-digit numeric codes with 15-minute expiration windows.
* **Email Dispatch**: Dispatched via Nodemailer SMTP with HTML branded templates matching the SyncSphere color scheme.
* **Rate Limiting & Cooldown**: Enforces a 60-second resend cooldown on the client side (`VerifyEmailPage.tsx`) and limits verification attempts to prevent brute-force attacks.

---

## 5. Firestore Database Security Rules (`firestore.rules`)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Helper Functions
    function isAuthenticated() {
      return request.auth != null;
    }
    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }
    function isAdmin() {
      return isAuthenticated() && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }

    // Users Collection
    match /users/{userId} {
      allow read: if isAuthenticated();
      allow write: if isOwner(userId) || isAdmin();
    }

    // Projects Collection
    match /projects/{projectId} {
      allow read: if true; // Public marketplace browsing
      allow create: if isAuthenticated();
      allow update, delete: if isOwner(resource.data.clientId) || isAdmin();

      match /milestones/{milestoneId} {
        allow read, write: if isAuthenticated();
      }
      match /tasks/{taskId} {
        allow read, write: if isAuthenticated();
      }
      match /files/{fileId} {
        allow read, write: if isAuthenticated();
      }
      match /updates/{updateId} {
        allow read, write: if isAuthenticated();
      }
    }

    // Applications Collection
    match /applications/{appId} {
      allow read: if isAuthenticated();
      allow create: if isAuthenticated();
      allow update: if isOwner(resource.data.symbioteId) || 
                      isOwner(get(/databases/$(database)/documents/projects/$(resource.data.projectId)).data.clientId) || 
                      isAdmin();
    }

    // Invoices Collection
    match /invoices/{invoiceId} {
      allow read: if isAuthenticated() && 
        (request.auth.uid == resource.data.clientId || request.auth.uid == resource.data.symbioteId || isAdmin());
      allow create, update: if isAuthenticated();
    }

    // Conversations Collection
    match /conversations/{convId} {
      allow read, write: if isAuthenticated() && (request.auth.uid in resource.data.participants);

      match /messages/{messageId} {
        allow read, write: if isAuthenticated();
      }
    }

    // Audit Logs Collection
    match /auditLogs/{logId} {
      allow read: if isAdmin();
      allow create: if isAuthenticated();
      allow update, delete: if false; // Immutable audit trail
    }
  }
}
```
