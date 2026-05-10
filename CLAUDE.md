# ThesisHub — Thesis Management System
## AI Handoff Document — Last updated: May 11, 2026

This file is the **single source of truth** for any AI agent or developer continuing work on this project. Read it fully before making any changes.

---

## Project Overview

ThesisHub is a multi-tenant SaaS web app that digitizes the academic thesis lifecycle — eliminating paper-based processes for proposals, oral defenses, and manuscript submissions. Multiple schools can subscribe; each school has its own isolated courses, coordinators, students, advisers, and panel members.

- **Build status**: All pages building cleanly (24 routes, 0 errors). Multi-school branch active.
- **Active branch**: `feature/multi-school-multi-course`
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

---

## Project Structure

```
src/
├── app/
│   ├── auth/
│   │   ├── login/page.tsx           # Email/password login, sets tms-role cookie
│   │   └── register/page.tsx        # Register: picks School → Course → Role
│   ├── (dashboard)/
│   │   ├── layout.tsx               # Wraps all dashboard pages in DashboardShell
│   │   ├── student/
│   │   │   ├── page.tsx             # Student dashboard (thesis status + group info + upcoming defenses)
│   │   │   ├── group/page.tsx       # Create group, invite members by email
│   │   │   ├── thesis/page.tsx      # Create thesis, edit title/abstract
│   │   │   └── thesis/[thesisId]/
│   │   │       ├── page.tsx         # Thesis detail + submission history + schedules + evaluations
│   │   │       └── submit/page.tsx  # Upload PDF to Supabase (versioned)
│   │   ├── adviser/
│   │   │   ├── page.tsx             # Adviser dashboard (upcoming defenses)
│   │   │   ├── available/page.tsx   # Browse theses needing adviser, volunteer
│   │   │   ├── assigned/page.tsx    # Theses where this adviser is assigned
│   │   │   └── thesis/[thesisId]/page.tsx  # Review submissions, approve/revise
│   │   ├── panel/
│   │   │   ├── page.tsx             # Panel dashboard (upcoming defenses + evaluations)
│   │   │   ├── evaluations/page.tsx # List of assigned evaluations
│   │   │   └── thesis/[thesisId]/evaluate/page.tsx  # Grading form (sliders 0-100 per criterion)
│   │   ├── admin/
│   │   │   ├── page.tsx             # Coordinator dashboard (course-scoped stats + upcoming defenses)
│   │   │   ├── users/page.tsx       # User management — scoped to coordinator's course
│   │   │   ├── theses/page.tsx      # All theses — scoped to coordinator's course
│   │   │   ├── theses/[thesisId]/page.tsx  # Thesis detail: status controls, advance stage, complete, delete
│   │   │   ├── assign/page.tsx      # Assign advisers + panel — scoped to coordinator's course
│   │   │   └── schedules/page.tsx   # Schedule defenses — scoped to coordinator's course
│   │   └── tech-admin/
│   │       ├── page.tsx             # Tech admin dashboard (school-wide stats + course list)
│   │       ├── courses/page.tsx     # Manage courses: add from presets, toggle active, assign coordinator
│   │       └── users/page.tsx       # All school users across all courses, role management
│   ├── page.tsx                     # Landing page (public)
│   └── layout.tsx                   # Root layout (QueryProvider, AuthProvider, Toaster)
├── components/
│   ├── ui/                          # shadcn/ui components
│   ├── providers/
│   │   ├── QueryProvider.tsx        # React Query client wrapper
│   │   └── AuthProvider.tsx         # Firebase auth listener wrapper
│   ├── shared/
│   │   └── DashboardShell.tsx       # Sidebar nav (role-aware, collapsible on mobile) + topbar
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
│       ├── users.ts                 # createUserDocument, getUsersByCourse, getUsersBySchool, updateUserRole
│       ├── groups.ts                # createGroup(+schoolId+courseId), getGroupsByCourse, getGroupsBySchool
│       ├── theses.ts                # createThesis(+schoolId+courseId), getThesesByCourse, getThesesBySchool
│       ├── schools.ts               # getSchool, getAllSchools, createSchool
│       ├── courses.ts               # getCoursesBySchool, getActiveCoursesBySchool, createCourse, updateCourse
│       ├── submissions.ts           # createSubmission, getSubmissionsByThesis, updateSubmissionStatus
│       ├── adviser.ts               # applyAsAdviser, assignAdviserByAdmin, updateApplicationStatus
│       ├── panel.ts                 # assignPanelMember, getPanelByThesis, submitEvaluation, getEvaluationsByThesis
│       ├── notifications.ts         # createNotification, createNotificationsBulk, subscribeToNotifications, markAllRead
│       ├── schedules.ts             # createSchedule, getSchedulesByThesis, getSchedulesByPanelMember, deleteSchedule
│       └── comments.ts              # addComment, getCommentsBySubmission
├── store/
│   └── authStore.ts                 # Zustand: { firebaseUser, tmsUser, loading, clear() }
├── types/
│   └── index.ts                     # ALL TypeScript types + STAGE_LABELS, STATUS_LABELS, EVALUATION_CRITERIA, PRESET_COURSES
└── proxy.ts                         # Role-based route protection (Next.js 16 middleware convention)
```

---

## Multi-Tenant Architecture

### Role Hierarchy
```
[Developer] — Firebase console only (creates school docs, sets first tech_admin)
    └── tech_admin — per school: manages courses, coordinators, all school users
            └── admin (Coordinator) — per course: manages full thesis workflow for one course
                    └── student / adviser / panel / adviser_panel — scoped to one course
```

### Role → Route → Scope

| Role | Dashboard | Scope | Notes |
|---|---|---|---|
| `tech_admin` | `/tech-admin` | One school (`schoolId`) | Manages courses + all users in school |
| `admin` | `/admin` | One course (`courseId`) | UI label: "Coordinator". Full thesis workflow. |
| `adviser` | `/adviser` | One course (`courseId`) | Volunteer/assigned to theses |
| `adviser_panel` | `/adviser` | One course (`courseId`) | Can do both adviser + panel duties |
| `panel` | `/panel` | One course (`courseId`) | Evaluates defenses |
| `student` | `/student` | One course (`courseId`) | Creates group + thesis, uploads PDFs |

> **Creating accounts:** `tech_admin` and `admin` cannot self-register. Developer creates `tech_admin` manually in Firestore. Tech admin assigns `admin` via the Users page or directly in Firestore.

---

## Preset Courses

Defined as `PRESET_COURSES` constant in `src/types/index.ts`. These are the only selectable course names when a tech admin adds a course to their school.

```
BS Computer Engineering
BS Architecture
BS Civil Engineering
BS Electrical Engineering
BS Computer Science
BS Information Technology
```

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

manuscript + approved → completed  (final state — coordinator clicks "Mark as Completed")
```

### Who does what per stage
1. Student uploads PDF → status becomes `submitted`
2. Adviser reviews → changes to `approved` / `revision_required`
3. Coordinator schedules defense → status becomes `scheduled`
4. Panel members evaluate → coordinator marks `evaluated`
5. Coordinator decides: `approved` → "Advance to Next Stage" (or "Mark as Completed" if manuscript)

---

## Firestore Collections & Schema

### `schools` *(new)*
```ts
{ id, name, createdAt: Timestamp }
```

### `courses` *(new)*
```ts
{ id, schoolId, name, active: boolean, coordinatorId: string | null, createdAt: Timestamp }
```

### `users`
```ts
{
  uid, email, displayName, role: UserRole,
  department,          // kept for backward compat; course name is stored here on new registrations
  institutionalEmail,
  schoolId: string,    // which school this user belongs to
  courseId: string | null,  // null for tech_admin only
  createdAt
}
```

### `groups`
```ts
{ id, name, members: string[], leaderId, adviserId: string | null, status, schoolId, courseId, createdAt }
```

### `theses`
```ts
{ id, groupId, title, abstract, currentStage, stageStatus, schoolId, courseId, createdAt, updatedAt }
```

### `submissions`
```ts
{ id, thesisId, stage, fileUrl, fileName, version, submittedBy, submittedAt, status, adviserFeedback }
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
{ id, thesisId, panelMemberId, stage, grades: { [criterion]: number }, overallScore, comments, submittedAt }
```

### `defenseSchedules`
```ts
{ id, thesisId, stage: "proposal"|"pre_oral"|"final_oral", scheduledAt, venue, panelIds: string[], createdAt }
```

### `notifications`
```ts
{ id, userId, type, message, read: boolean, relatedId, createdAt }
```

### `comments`
```ts
{ id, thesisId, submissionId, authorId, text, createdAt }
```

---

## Supabase Storage

- **Bucket name**: `thesis-documents` (private — no public access)
- **Path format**: `{thesisId}/{stage}/v{version}_{sanitized_filename}.pdf`
- **Signed URL TTL**: **600 seconds (10 minutes)** — regenerated on each "open" click

### Key storage helpers (`src/lib/supabase.ts`)
```ts
uploadThesisDocument(thesisId, stage, version, file)
getSignedUrl(path)
deleteDocument(path)
deleteThesisDocuments(thesisId)
```

---

## TypeScript Types (`src/types/index.ts`)

```ts
type UserRole = "student" | "adviser" | "panel" | "adviser_panel" | "admin" | "tech_admin"
type ThesisStage = "proposal" | "pre_oral" | "final_oral" | "manuscript"
type StageStatus = "draft" | "submitted" | "under_review" | "scheduled" | "evaluated" | "approved" | "revision_required" | "rejected" | "completed"

interface School { id, name, createdAt }
interface Course { id, schoolId, name, active, coordinatorId, createdAt }

const PRESET_COURSES: readonly string[]  // 6 preset program names
```

Constants exported from `types/index.ts`:
- `STAGE_LABELS` — human-readable stage names
- `STATUS_LABELS` — human-readable status names
- `EVALUATION_CRITERIA` — grading criteria per stage
- `PRESET_COURSES` — the 6 available course names for tech admin to pick from

---

## Auth Flow

1. User registers → picks School → Course → Role → Firebase Auth creates account → `users` doc created with `schoolId` + `courseId`
2. User logs in → Firebase Auth verifies → `tms-role` cookie set with role string
3. `src/proxy.ts` reads `tms-role` cookie → redirects to correct dashboard or blocks access
4. `useAuth()` hook subscribes to `onAuthStateChanged` and loads `tmsUser` from Firestore

---

## ⚠️ Critical Gotchas — Read Before Editing

### 1. Next.js 16 Middleware Convention
Next.js 16 uses `src/proxy.ts` (NOT `middleware.ts`) and exports `proxy()` (NOT `middleware()`).
**Do not rename this file or the export.**

### 2. shadcn/ui — `DropdownMenuTrigger` has no `asChild`
**Fix**: Apply `className` directly on `<DropdownMenuTrigger>` instead of wrapping a `<Button>`.

### 3. shadcn/ui — `AlertDialogTrigger` has no `asChild`
**Fix**: Apply Tailwind button styles directly on `<AlertDialogTrigger className="...">`.

### 4. shadcn/ui — `Select.onValueChange` type issue
`onValueChange` can cause TypeScript errors when the result feeds into a typed setter.
**Fix**: Always cast — `onValueChange={(v) => setState((v ?? "") as string)}`

### 5. Supabase RLS Policies — Must Use Custom SQL
Supabase's built-in policy templates use `auth.role()` which only works with Supabase Auth — not Firebase Auth.
**Fix**: Run custom SQL in Supabase → SQL Editor:
```sql
CREATE POLICY "allow_all_thesis_docs" ON storage.objects
FOR ALL USING (bucket_id = 'thesis-documents')
WITH CHECK (bucket_id = 'thesis-documents');
```

### 6. Firestore Composite Indexes — Manual Creation Required
**Fix**: When you see a Firestore index error in browser console, click the auto-generated link.

Required indexes (create if missing):
- `notifications`: `userId ASC` + `createdAt DESC`
- `submissions`: `thesisId ASC` + `submittedAt DESC`
- `submissions`: `thesisId ASC` + `stage ASC` + `submittedAt DESC`
- `comments`: `submissionId ASC` + `createdAt ASC`
- `courses`: `schoolId ASC` + `active ASC` *(new)*
- `users`: `courseId ASC` *(new)*
- `users`: `schoolId ASC` *(new)*
- `groups`: `courseId ASC` *(new)*
- `theses`: `courseId ASC` *(new)*

### 7. React Hydration Warning (Browser Extension)
**Fix**: `suppressHydrationWarning` on `<body>` in `src/app/layout.tsx` — already applied.

### 8. Supabase vs Firestore Responsibility
- **Firestore**: ALL application data
- **Supabase**: ONLY PDF file storage

### 9. `tech_admin` and `admin` Cannot Self-Register
The register page only allows `student`, `adviser`, `panel`.
- `tech_admin`: developer sets manually in Firestore → `users/{uid}` → `role: "tech_admin"`, `courseId: null`
- `admin` (Coordinator): tech admin sets via `/tech-admin/users` page or directly in Firestore → add `courseId`

### 10. Coordinator Queries Are Course-Scoped
All admin (`/admin/*`) pages use `tmsUser.courseId` to filter data. If `tmsUser.courseId` is null, queries return nothing. Make sure every coordinator has `courseId` set in their Firestore doc.

### 11. useEffect Data Fetch Pattern — Always Guard Both `tmsUser` AND `tmsUser.courseId`/`schoolId`
When fetching data in `useEffect` based on auth, use this pattern or pages will hang on infinite skeleton:

```ts
useEffect(() => {
  if (!tmsUser) return;                        // auth still loading
  if (!tmsUser.courseId) { setLoading(false); return; }  // field missing in Firestore
  // ... fetch data
}, [tmsUser]);
```

**Never use `[]` as the dependency array** when the effect reads from `tmsUser` — `tmsUser` is null on first mount.

### 12. Schedule Scoping — No `courseId` on `defenseSchedules`
`defenseSchedules` documents do NOT have a `courseId` field. Scoping is done by:
1. Fetch `getThesesByCourse(courseId)` → get thesis IDs
2. Filter `getAllSchedules()` client-side to only those thesis IDs

Do NOT add `courseId` directly to schedule documents without updating all related queries.

---

## What Has Been Implemented ✅

### Multi-School / Multi-Course Architecture
- [x] `schools/` and `courses/` Firestore collections
- [x] `tech_admin` role with `/tech-admin` dashboard, courses page, users page
- [x] `admin` role re-labeled "Coordinator" — all queries scoped to `courseId`
- [x] Registration picks School → Course → Role
- [x] `schoolId` + `courseId` written to all new `users`, `groups`, `theses` documents
- [x] `PRESET_COURSES` constant (6 program names)

### Auth
- [x] Login page with Firebase email/password
- [x] Register page (school + course + role selection)
- [x] `tms-role` cookie set on login for route protection
- [x] `src/proxy.ts` role-based route guard (includes `tech_admin` + `/tech-admin`)

### Student
- [x] Dashboard (thesis status overview, group info, upcoming defense schedules)
- [x] Group creation + invite members by email
- [x] Thesis creation + edit (title, abstract)
- [x] Thesis detail view (stage timeline, submission history, schedules, panel evaluations)
- [x] PDF upload to Supabase with version tracking
- [x] Filename wraps on mobile in submission list

### Adviser
- [x] Dashboard (upcoming defenses from advised theses; adviser_panel role also shows panel schedules)
- [x] Browse available theses, volunteer application
- [x] Assigned theses list
- [x] Submission review: view PDFs, approve, request revision, add feedback

### Panel
- [x] Dashboard (upcoming defenses where panelist is listed + evaluation assignments)
- [x] Assigned evaluations list
- [x] Evaluation form with per-criterion sliders (0–100), overall score auto-calc, comments
- [x] Read-only after submission

### Coordinator (admin)
- [x] Stats dashboard (course-scoped: user/thesis/group counts + upcoming defenses)
- [x] User management — scoped to course
- [x] All theses list — scoped to course
- [x] Thesis detail: status controls, advance stage, complete, delete
- [x] Assign advisers (approve volunteers + direct) + assign panel — scoped to course
- [x] Defense scheduling with explicit participant selector (students shown, adviser shown, panelists selectable)
- [x] Schedule delete with notification to all participants

### Tech Admin (new)
- [x] School-wide dashboard (stats across all courses + course list)
- [x] Dashboard displays school name as large `text-4xl` heading (fetched via `getSchool(schoolId)`)
- [x] Course management: add from 6 presets, toggle active/inactive, assign coordinator
- [x] School users management: all users across all courses, full role change including `tech_admin`

### Shared / UX
- [x] DashboardShell with collapsible sidebar on mobile (hamburger toggle, backdrop, auto-close on nav)
- [x] NotificationBell with unread count badge
- [x] Real-time notifications via Firestore `onSnapshot`
- [x] StatusBadge component
- [x] Landing page (public)
- [x] AlertDialog confirmations on destructive actions
- [x] All admin + tech-admin `useEffect` data fetches guard against null `tmsUser` (auth loading) AND null `courseId`/`schoolId` (missing Firestore field) — call `setLoading(false)` in both cases so pages never hang on infinite skeleton
- [x] Admin dashboard shows a yellow warning card when coordinator has no `courseId` set

---

## ❌ What Remains

### ✅ Previously Blocking — Now Done

**1. Data Migration** — **COMPLETED** (May 11, 2026)

Migration was run via `scripts/migrate.ts` using Firebase Admin SDK. The script:
- Created the school doc (`Cebu Institute of Technology University`)
- Created the course doc (`BS Computer Engineering`)
- Promoted the admin user to `tech_admin` (courseId: null)
- Batch-updated all existing `users`, `groups`, and `theses` docs with `schoolId` + `courseId`

**`scripts/migrate.ts` is safe to delete** — it was a one-time migration tool.

For any future new school: create the school doc manually in Firestore `schools/` collection, then use the tech admin UI to add courses and assign coordinators.

---

### ✅ Previously Blocking — Now Done (continued)

**2. Firestore Composite Indexes** — **COMPLETED** (May 11, 2026)

Deployed via `firebase deploy --only firestore:indexes`. All indexes in `firestore.indexes.json` are live. The `firestore.indexes.json` file is the source of truth — do not create indexes manually via the console going forward, add them to the file and redeploy.

**3. Coordinator Assigned** — **COMPLETED** (May 11, 2026)

BS Computer Engineering course now has a coordinator assigned (`coordinatorId` set in Firestore). The coordinator's role is `admin` and their `courseId` is set — the `/admin` dashboard is fully operational.

**4. Adviser/Panel Queries Now Course-Scoped** — **COMPLETED**

`admin/assign/page.tsx` and `admin/schedules/page.tsx` now use `getUsersByCapabilityAndCourse(capability, courseId)` — only users from the coordinator's own course are shown.

**5. Available Theses Now Course-Scoped** — **COMPLETED**

`adviser/available/page.tsx` now uses `getThesesByCourse(tmsUser.courseId)` — advisers only see theses from their own course.

---

### Future / Optional

- [ ] Comments/feedback thread on submission detail (UI components exist, not wired to all pages)
- [ ] Email notifications (currently in-app only)
- [ ] Inline PDF viewer (currently opens in new tab via signed URL)
- [ ] Firestore security rules hardening — enforce `schoolId`/`courseId` at database level, not just application level
- [ ] Admin groups management page
- [ ] Deploy to Vercel + set environment variables

---

## Key Utility Functions

| Function | File | Description |
|---|---|---|
| `getAllSchools()` | `lib/firestore/schools.ts` | Fetch all schools (used in registration) |
| `getActiveCoursesBySchool(schoolId)` | `lib/firestore/courses.ts` | Fetch active courses for a school |
| `getCoursesBySchool(schoolId)` | `lib/firestore/courses.ts` | All courses (active + inactive) for a school |
| `updateCourse(courseId, data)` | `lib/firestore/courses.ts` | Toggle active, assign coordinator |
| `getUsersByCourse(courseId)` | `lib/firestore/users.ts` | All users in a course (coordinator use) |
| `getUsersBySchool(schoolId)` | `lib/firestore/users.ts` | All users in a school (tech admin use) |
| `getThesesByCourse(courseId)` | `lib/firestore/theses.ts` | All theses in a course |
| `getGroupsByCourse(courseId)` | `lib/firestore/groups.ts` | All groups in a course |
| `uploadThesisDocument(...)` | `lib/supabase.ts` | Upload PDF to Supabase |
| `getSignedUrl(path)` | `lib/supabase.ts` | Get 10-min signed view URL |
| `deleteThesisDocuments(thesisId)` | `lib/supabase.ts` | Bulk delete all PDFs for a thesis |
| `completeThesis(thesisId)` | `lib/firestore/theses.ts` | Set status to "completed" |
| `deleteThesis(thesisId)` | `lib/firestore/theses.ts` | Delete thesis Firestore doc |
| `advanceThesisStage(thesisId)` | `lib/firestore/theses.ts` | Move to next stage, reset status to draft |
| `createNotificationsBulk(uids, ...)` | `lib/firestore/notifications.ts` | Notify multiple users at once |
| `useAuth()` | `hooks/useAuth.ts` | `{ tmsUser, firebaseUser, loading, role }` |
| `useNotifications(userId)` | `hooks/useNotifications.ts` | Real-time `{ notifications, unreadCount, markRead, markAllRead }` |

---

## Free Tier Limits to Monitor

### Firebase Spark (Free)
- Firestore reads: **50,000/day**
- Firestore writes: **20,000/day**
- Firestore deletes: **20,000/day**

### Supabase (Free)
- Storage: **1 GB** total
- Storage bandwidth: **2 GB/month**

---

## Development Commands

```bash
npm run dev       # Start dev server at http://localhost:3000
npm run build     # Production build (must pass before deploying)
npm run lint      # ESLint check

git checkout feature/multi-school-multi-course   # active development branch

# Deploy Firestore security rules
firebase deploy --only firestore:rules
```

---

## First-Time Setup (New School)

1. **Firebase**: Create project → enable Authentication (Email/Password) → enable Firestore
2. **Supabase**: Create project → Storage → create private bucket `thesis-documents` → run RLS SQL (see Gotcha #5)
3. **`.env.local`**: Fill in all Firebase + Supabase keys
4. **Run**: `npm install && npm run dev`
5. **Create school doc** in Firestore `schools/` collection manually
6. **Create course doc(s)** in Firestore `courses/` collection manually (or via tech admin UI once a tech admin exists)
7. **Set first tech_admin**: Register any account → Firestore → `users/{uid}` → set `role: "tech_admin"`, `courseId: null`, `schoolId: "<your school id>"`
8. Tech admin can then use `/tech-admin/courses` to add courses and assign coordinators
9. **Firestore indexes**: Create when queries fail in browser console (click auto-generated link)

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

> ⚠️ Rules are NOT yet updated to enforce `schoolId`/`courseId` isolation at the database level. This is a known gap — scoping is currently enforced at the application layer only.
