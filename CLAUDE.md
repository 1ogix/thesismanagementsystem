# ThesisHub — Thesis Management System
## AI Handoff Document — Last updated: March 2026

This file is the **single source of truth** for any AI agent or developer continuing work on this project. Read it fully before making any changes.

---

## Project Overview

ThesisHub is a SaaS web app that digitizes the academic thesis lifecycle — eliminating paper-based processes for proposals, oral defenses, and manuscript submissions. Built for a university setting with four user roles.

- **Build status**: Core scaffolding complete. All pages implemented and building cleanly (21 routes, 0 errors).
- **Stack**: Firebase Spark free plan (Auth + Firestore) + Supabase free tier (Storage only)
- **Deployed to**: Vercel

---

## Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| Framework | **Next.js 16.1.6** (App Router) + TypeScript | NOT Next.js 14 |
| Styling | Tailwind CSS + shadcn/ui | |
| Auth | Firebase Authentication | Email/password only |
| Database | **Firebase Firestore** | All data lives here |
| File Storage | **Supabase Storage** | PDFs only — NOT Supabase DB |
| State | Zustand + React Query (TanStack) | |
| Hosting | Vercel | |

---

## Environment Variables (`.env.local`)

```env
# Firebase
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=      # safe to expose (anon/public)
SUPABASE_SERVICE_ROLE_KEY=          # server-side only, never expose to client
```

- Firebase keys: Firebase Console → Project Settings → General → Your apps → Web app
- Supabase keys: Supabase Dashboard → Project Settings → API

---

## Project Structure

```
src/
├── app/
│   ├── auth/
│   │   ├── login/page.tsx           # Email/password login, sets tms-role cookie
│   │   └── register/page.tsx        # Register with role selection (student/adviser/panel)
│   ├── (dashboard)/
│   │   ├── layout.tsx               # Wraps all dashboard pages in DashboardShell
│   │   ├── student/
│   │   │   ├── page.tsx             # Student dashboard (thesis status + group info)
│   │   │   ├── group/page.tsx       # Create group, invite members by email
│   │   │   ├── thesis/page.tsx      # Create thesis, edit title/abstract
│   │   │   └── thesis/[thesisId]/
│   │   │       ├── page.tsx         # Thesis detail + submission history
│   │   │       └── submit/page.tsx  # Upload PDF to Supabase (versioned)
│   │   ├── adviser/
│   │   │   ├── page.tsx             # Adviser dashboard
│   │   │   ├── available/page.tsx   # Browse theses needing adviser, volunteer
│   │   │   ├── assigned/page.tsx    # Theses where this adviser is assigned
│   │   │   └── thesis/[thesisId]/page.tsx  # Review submissions, approve/revise
│   │   ├── panel/
│   │   │   ├── page.tsx             # Panel dashboard
│   │   │   ├── evaluations/page.tsx # List of assigned evaluations
│   │   │   └── thesis/[thesisId]/evaluate/page.tsx  # Grading form (sliders 0-100 per criterion)
│   │   └── admin/
│   │       ├── page.tsx             # System-wide stats dashboard
│   │       ├── users/page.tsx       # User management + role change
│   │       ├── theses/page.tsx      # All theses list with filters
│   │       ├── theses/[thesisId]/page.tsx  # Thesis detail: status controls, advance stage, complete, delete
│   │       ├── assign/page.tsx      # Assign advisers (approve volunteers + direct) + assign panel
│   │       └── schedules/page.tsx   # Schedule defense dates + venue
│   ├── page.tsx                     # Landing page (public)
│   └── layout.tsx                   # Root layout (QueryProvider, AuthProvider, Toaster)
├── components/
│   ├── ui/                          # shadcn/ui components
│   ├── providers/
│   │   ├── QueryProvider.tsx        # React Query client wrapper
│   │   └── AuthProvider.tsx         # Firebase auth listener wrapper
│   ├── shared/
│   │   └── DashboardShell.tsx       # Sidebar nav (role-aware) + topbar with notification bell
│   └── thesis/
│       ├── StatusBadge.tsx          # Color-coded status chip (all StageStatus values)
│       └── StageTimeline.tsx        # Visual 4-stage progress tracker
├── hooks/
│   ├── useAuth.ts                   # Returns { tmsUser, firebaseUser, loading, role }
│   └── useNotifications.ts          # Real-time Firestore notifications (onSnapshot)
├── lib/
│   ├── firebase.ts                  # Firebase init (Auth + Firestore)
│   ├── supabase.ts                  # Supabase client + all storage helpers
│   └── firestore/
│       ├── users.ts                 # getUser, createUser, updateUserRole, getAllUsers
│       ├── groups.ts                # createGroup, getGroup, addMember, updateGroupStatus, assignAdviser
│       ├── theses.ts                # createThesis, getThesis, updateThesisStatus, advanceThesisStage, completeThesis, deleteThesis
│       ├── submissions.ts           # createSubmission, getSubmissionsByThesis, updateSubmissionStatus
│       ├── adviser.ts               # applyAsAdviser, assignAdviserByAdmin, updateApplicationStatus
│       ├── panel.ts                 # assignPanelMember, getPanelByThesis, submitEvaluation, getEvaluationsByThesis
│       ├── notifications.ts         # createNotification, createNotificationsBulk, subscribeToNotifications, markAllRead
│       ├── schedules.ts             # createSchedule, getSchedulesByThesis, getAllSchedules
│       └── comments.ts              # addComment, getCommentsBySubmission
├── store/
│   └── authStore.ts                 # Zustand: { firebaseUser, tmsUser, loading, clear() }
├── types/
│   └── index.ts                     # ALL TypeScript types + STAGE_LABELS, STATUS_LABELS, EVALUATION_CRITERIA
└── proxy.ts                         # Role-based route protection (Next.js 16 middleware convention)
```

---

## User Roles

| Role | Dashboard Route | What They Can Do |
|---|---|---|
| `student` | `/student` | Create group, invite members, create thesis, upload PDFs, view submission history |
| `adviser` | `/adviser` | Volunteer for theses, get assigned by admin, review submissions, approve/revise |
| `panel` | `/panel` | View assigned defenses, submit structured evaluation with grades + comments |
| `admin` | `/admin` | Full access: manage users, assign advisers/panel, schedule defenses, advance/complete/delete theses |

> Admin accounts must be created manually — register as any role then change `role` to `"admin"` in Firestore, OR set it directly via Firebase Console.

---

## Thesis Lifecycle

### Stages (fixed order, cannot skip)
```
proposal → pre_oral → final_oral → manuscript
```

### Status per stage (state machine)
```
draft → submitted → under_review → scheduled → evaluated
                                 ↘ approved ─────────────→ (advance to next stage, or complete if manuscript)
                                 ↘ revision_required → (student resubmits)
                                 ↘ rejected

manuscript + approved → completed  (final state — admin clicks "Mark as Completed")
```

### Who does what per stage
1. Student uploads PDF → status becomes `submitted`
2. Adviser reviews → changes to `approved` / `revision_required`
3. Admin schedules defense → status becomes `scheduled`
4. Panel members evaluate → admin marks `evaluated`
5. Admin decides: `approved` → clicks "Advance to Next Stage" (or "Mark as Completed" if manuscript)

---

## Firestore Collections & Schema

### `users`
```ts
{ uid, email, displayName, role: UserRole, department, institutionalEmail, createdAt }
```

### `groups`
```ts
{ id, name, members: string[], leaderId, adviserId: string | null, status: "forming"|"active"|"completed", createdAt }
```

### `theses`
```ts
{ id, groupId, title, abstract, currentStage: ThesisStage, stageStatus: StageStatus, createdAt, updatedAt }
```

### `submissions`
```ts
{ id, thesisId, stage, fileUrl, fileName, version: number, submittedBy, submittedAt, status: "pending"|"reviewed"|"approved"|"revision_required", adviserFeedback: string | null }
```

### `adviserApplications`
```ts
{ id, thesisId, adviserId, type: "volunteer"|"assigned", status: "pending"|"approved"|"rejected", appliedAt }
```

### `panelAssignments`
```ts
{ id, thesisId, panelMemberId, stage, assignedAt, assignedBy }
```

### `evaluations`
```ts
{ id, thesisId, panelMemberId, stage, grades: { [criterion]: number }, overallScore: number, comments: string, submittedAt }
```

### `comments`
```ts
{ id, thesisId, submissionId, authorId, text, createdAt }
```

### `notifications`
```ts
{ id, userId, type: "submission"|"approval"|"assignment"|"evaluation"|"schedule"|"comment", message, read: boolean, relatedId, createdAt }
```

### `defenseSchedules`
```ts
{ id, thesisId, stage: "proposal"|"pre_oral"|"final_oral", scheduledAt, venue, panelIds: string[], createdAt }
```

---

## Supabase Storage

- **Bucket name**: `thesis-documents` (private — no public access)
- **Path format**: `{thesisId}/{stage}/v{version}_{sanitized_filename}.pdf`
- **Signed URL TTL**: **600 seconds (10 minutes)** — regenerated on each "open" click
- Signed URLs are time-limited JWTs — not permanent. This is intentional and secure.

### Key storage helpers (`src/lib/supabase.ts`)
```ts
uploadThesisDocument(thesisId, stage, version, file)   // upload PDF
getSignedUrl(path)                                      // get 10-min view URL
deleteDocument(path)                                    // delete single file
deleteThesisDocuments(thesisId)                        // bulk delete ALL files for a thesis
```

---

## TypeScript Types (`src/types/index.ts`)

```ts
type UserRole = "student" | "adviser" | "panel" | "admin"
type ThesisStage = "proposal" | "pre_oral" | "final_oral" | "manuscript"
type StageStatus = "draft" | "submitted" | "under_review" | "scheduled" | "evaluated" | "approved" | "revision_required" | "rejected" | "completed"
```

Constants exported from `types/index.ts`:
- `STAGE_LABELS` — human-readable stage names
- `STATUS_LABELS` — human-readable status names
- `EVALUATION_CRITERIA` — grading criteria per stage (used in panel evaluation form)

---

## Auth Flow

1. User registers → Firebase Auth creates account → `users` Firestore doc created with selected role
2. User logs in → Firebase Auth verifies → `tms-role` cookie set with role string
3. `src/proxy.ts` reads `tms-role` cookie and redirects to correct dashboard or blocks access
4. `useAuth()` hook subscribes to `onAuthStateChanged` and loads `tmsUser` from Firestore

---

## ⚠️ Critical Gotchas — Read Before Editing

These are real issues that were hit and fixed. Ignoring them will cause the same bugs.

### 1. Next.js 16 Middleware Convention
Next.js 16 uses `src/proxy.ts` (NOT `middleware.ts`) and exports `proxy()` (NOT `middleware()`).
**Do not rename this file or the export.**

### 2. shadcn/ui — `DropdownMenuTrigger` has no `asChild`
In this version of shadcn/ui, `DropdownMenuTrigger` does **not** support the `asChild` prop.
**Fix**: Apply `className` directly on the `<DropdownMenuTrigger>` element instead of wrapping a `<Button>`.

### 3. shadcn/ui — `AlertDialogTrigger` has no `asChild`
Same issue. `AlertDialogTrigger asChild` will throw a TypeScript error.
**Fix**: Apply Tailwind button styles directly on `<AlertDialogTrigger className="...">`.

### 4. shadcn/ui — `Select.onValueChange` is `string | null`
`onValueChange` passes `string | null`, not just `string`. TypeScript will error if you pass it directly to a `string` setter.
**Fix**: `onValueChange={(v) => setState(v ?? "")}`

### 5. Supabase RLS Policies — Must Use Custom SQL
Supabase's built-in storage policy templates use `auth.role()` which only works with Supabase Auth — **not Firebase Auth**.
**Fix**: Run custom SQL in Supabase → SQL Editor:
```sql
-- Allow all operations on thesis-documents bucket for all users
CREATE POLICY "allow_all_thesis_docs" ON storage.objects
FOR ALL USING (bucket_id = 'thesis-documents')
WITH CHECK (bucket_id = 'thesis-documents');
```
If that's not permissive enough, create separate INSERT/SELECT/UPDATE/DELETE policies for `anon` and `authenticated` roles.

### 6. Firestore Composite Indexes — Manual Creation Required
Queries combining `where()` + `orderBy()` on different fields need composite indexes.
**Fix**: When you see a Firestore index error in the browser console, click the auto-generated link — it opens Firebase Console pre-filled with the correct index. Click "Create".

Required indexes (already created, but recreate if project changes):
- `notifications`: `userId ASC` + `createdAt DESC`
- `submissions`: `thesisId ASC` + `submittedAt DESC`
- `submissions`: `thesisId ASC` + `stage ASC` + `submittedAt DESC`
- `comments`: `submissionId ASC` + `createdAt ASC`

### 7. React Hydration Warning (Browser Extension)
Browser extensions (e.g. `cz-shortcut-listen`) inject attributes into `<body>` causing hydration mismatch.
**Fix**: `suppressHydrationWarning` on `<body>` in `src/app/layout.tsx` — **already applied**.

### 8. Supabase vs Firestore Responsibility
- **Firestore**: ALL application data (users, groups, theses, submissions, evaluations, etc.)
- **Supabase**: ONLY PDF file storage
- Never put application data in Supabase. Never read files from Firestore.

### 9. Admin Role Must Be Set Manually
The register page only allows `student`, `adviser`, `panel` role selection.
To create an admin: register with any role → go to Firestore → `users/{uid}` → change `role` to `"admin"`.

---

## What Has Been Implemented ✅

### Auth
- [x] Login page with Firebase email/password
- [x] Register page with role selection
- [x] `tms-role` cookie set on login for route protection
- [x] `src/proxy.ts` role-based route guard

### Student
- [x] Dashboard (thesis status overview, group info)
- [x] Group creation + invite members by email
- [x] Thesis creation + edit (title, abstract)
- [x] Thesis detail view (stage timeline, submission history)
- [x] PDF upload to Supabase with version tracking
- [x] StageTimeline component (visual 4-step progress)

### Adviser
- [x] Dashboard
- [x] Browse available theses (open for advisers)
- [x] Volunteer application → admin approves
- [x] Assigned theses list
- [x] Submission review: view PDFs, approve, request revision, add feedback

### Panel
- [x] Dashboard
- [x] Assigned evaluations list
- [x] Evaluation form with per-criterion sliders (0–100), overall score auto-calc, comments
- [x] Read-only after submission

### Admin
- [x] Stats dashboard (user/thesis/submission counts)
- [x] User management table (view all users, change roles)
- [x] All theses list with stage/status filters
- [x] Thesis detail: status change buttons, advance stage, Mark as Completed, Delete Thesis
- [x] Assign advisers (approve volunteers + direct assign) + assign panel members per stage
- [x] Defense scheduling (date, venue, panel members)

### Shared
- [x] DashboardShell (sidebar + topbar with notification bell)
- [x] NotificationBell with unread count badge
- [x] Real-time notifications via Firestore `onSnapshot`
- [x] StatusBadge component (all statuses including `completed`)
- [x] Landing page (public)
- [x] AlertDialog confirmation on destructive actions (Delete Thesis)

---

## What Remains / Future Work

- [ ] Comments/feedback thread on submission detail (UI exists in components, not wired to all pages)
- [ ] Email notifications (currently in-app only — could add via Firebase Functions or Supabase Edge Functions)
- [ ] Inline PDF viewer (currently opens in new tab via signed URL)
- [ ] Admin groups management page (`/admin/groups` route exists in design but not implemented)
- [ ] Firestore security rules hardening (current rules are functional but could be tightened)
- [ ] Deploy to Vercel + set environment variables

---

## Key Utility Functions

| Function | File | Description |
|---|---|---|
| `uploadThesisDocument(thesisId, stage, version, file)` | `lib/supabase.ts` | Upload PDF to Supabase |
| `getSignedUrl(path)` | `lib/supabase.ts` | Get 10-min signed view URL |
| `deleteThesisDocuments(thesisId)` | `lib/supabase.ts` | Bulk delete all PDFs for a thesis |
| `completeThesis(thesisId)` | `lib/firestore/theses.ts` | Set status to "completed" |
| `deleteThesis(thesisId)` | `lib/firestore/theses.ts` | Delete thesis Firestore doc |
| `advanceThesisStage(thesisId)` | `lib/firestore/theses.ts` | Move to next stage, reset status to draft |
| `createNotificationsBulk(uids, type, msg, relatedId)` | `lib/firestore/notifications.ts` | Notify multiple users at once |
| `updateGroupStatus(groupId, status)` | `lib/firestore/groups.ts` | Update group status |
| `useAuth()` | `hooks/useAuth.ts` | `{ tmsUser, firebaseUser, loading, role }` |
| `useNotifications(userId)` | `hooks/useNotifications.ts` | Real-time `{ notifications, unreadCount, markRead, markAllRead }` |

---

## Free Tier Limits to Monitor

### Firebase Spark (Free)
- Firestore reads: **50,000/day**
- Firestore writes: **20,000/day**
- Firestore deletes: **20,000/day**
- Firebase Auth: Unlimited
- Firebase Storage: Not used (Supabase is used instead)

### Supabase (Free)
- Storage: **1 GB** total
- Storage bandwidth: **2 GB/month**
- Database: 500 MB (not used — Firestore handles all data)

---

## Development Commands

```bash
npm run dev       # Start dev server at http://localhost:3000
npm run build     # Production build (must pass before deploying)
npm run lint      # ESLint check

# Deploy Firestore security rules
firebase deploy --only firestore:rules
```

---

## First-Time Setup Checklist

1. **Firebase**: Create project (Spark plan) → enable Authentication (Email/Password) → enable Firestore Database
2. **Supabase**: Create project (free) → Storage → create bucket named `thesis-documents` (private)
3. **Supabase RLS**: Run custom SQL policy (see Gotcha #5 above) in SQL Editor
4. **`.env.local`**: Fill in all Firebase + Supabase keys
5. **Run**: `npm install && npm run dev`
6. **First admin**: Register with any role → Firestore → `users/{uid}` → set `role: "admin"`
7. **Firestore indexes**: Will be created automatically when queries fail — click the console link

---

## Firestore Security Rules

File: `firestore.rules` (deploy with `firebase deploy --only firestore:rules`)

Current rules summary:
- All collections require authentication
- Students: read/write own group's thesis and submissions
- Advisers: read all theses; write feedback/comments
- Panel: read all theses; write own evaluations
- Admin: full read/write on all collections
- Notifications: users can only read their own
