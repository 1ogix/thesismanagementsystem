# Multi-School / Multi-Course — Implementation Progress

Branch: `feature/multi-school-multi-course`

## Goal
Turn ThesisHub from a single-course system into a multi-tenant SaaS where:
- Multiple schools can subscribe
- Each school has a **Tech Admin** (manages school-level: courses, coordinators, users)
- Each course has a **Coordinator** (current "admin" role, scoped to one course)
- Students, advisers, and panelists are scoped to one course within one school

---

## Architecture Summary

```
[Developer] → Firebase console (creates school docs, sets first tech_admin)
tech_admin  → per school: manages courses + coordinators + all school users
admin       → per course (UI label: "Coordinator"): same as old admin but scoped
student / adviser / panel / adviser_panel → scoped to one course
```

**New Firestore collections:** `schools/`, `courses/`

**Added fields to existing docs:**
- `users` → `schoolId: string`, `courseId: string | null`
- `groups` → `schoolId: string`, `courseId: string`
- `theses` → `schoolId: string`, `courseId: string`

**New role:** `tech_admin`

**New routes:** `/tech-admin`, `/tech-admin/courses`, `/tech-admin/users`

---

## ✅ COMPLETED

### Types & Roles
- [x] `src/types/index.ts` — added `tech_admin` to `UserRole`, added `School` + `Course` interfaces, added `PRESET_COURSES` constant, added `schoolId`/`courseId` to `TmsUser`, `Group`, `Thesis`
- [x] `src/lib/roles.ts` — added `tech_admin` to `ROLE_LABELS` (label: "Tech Admin"), `TECH_ADMIN_ASSIGNABLE_ROLES`, `getDefaultDashboardRoute`, `getAllowedRoutePrefixes`; renamed `admin` label to "Coordinator"

### Routing
- [x] `src/proxy.ts` — added `/tech-admin` to protected prefixes, added `tech_admin` to allowed roles check

### Firestore Helpers
- [x] `src/lib/firestore/schools.ts` (NEW) — `getSchool`, `getAllSchools`, `createSchool`
- [x] `src/lib/firestore/courses.ts` (NEW) — `getCourse`, `getCoursesBySchool`, `getActiveCoursesBySchool`, `createCourse`, `updateCourse`
- [x] `src/lib/firestore/users.ts` — added `getUsersByCourse`, `getUsersBySchool`
- [x] `src/lib/firestore/groups.ts` — updated `createGroup` signature (+schoolId, +courseId), added `getGroupsByCourse`, `getGroupsBySchool`
- [x] `src/lib/firestore/theses.ts` — updated `createThesis` signature (+schoolId, +courseId), added `getThesesByCourse`, `getThesesBySchool`

### UI — Sidebar
- [x] `src/components/shared/DashboardShell.tsx` — added `tech_admin` nav: Dashboard / Courses / Users

### Registration
- [x] `src/app/auth/register/page.tsx` — School dropdown (fetches `getAllSchools()`), Course dropdown (fetches `getActiveCoursesBySchool(schoolId)` on school change), removed freetext department field

### Admin Pages (coordinator-scoped)
- [x] `src/app/(dashboard)/admin/page.tsx` — uses `getUsersByCourse`, `getThesesByCourse`, `getGroupsByCourse`; filters schedules to course theses
- [x] `src/app/(dashboard)/admin/users/page.tsx` — uses `getUsersByCourse`; added `tech_admin` to `ROLE_COLORS`
- [x] `src/app/(dashboard)/admin/theses/page.tsx` — uses `getThesesByCourse`, `getGroupsByCourse`
- [x] `src/app/(dashboard)/admin/assign/page.tsx` — uses `getThesesByCourse`
- [x] `src/app/(dashboard)/admin/schedules/page.tsx` — uses `getThesesByCourse`, filters `getAllSchedules()` to course thesis IDs

### Student Pages
- [x] `src/app/(dashboard)/student/group/page.tsx` — passes `tmsUser.schoolId` + `tmsUser.courseId` to `createGroup`
- [x] `src/app/(dashboard)/student/thesis/page.tsx` — passes `group.schoolId` + `group.courseId` to `createThesis`

### Tech Admin Pages (NEW)
- [x] `src/app/(dashboard)/tech-admin/page.tsx` — school-wide stats + course list overview
- [x] `src/app/(dashboard)/tech-admin/courses/page.tsx` — add courses from 6 presets, toggle active/inactive, assign coordinator
- [x] `src/app/(dashboard)/tech-admin/users/page.tsx` — all school users, role management with full `TECH_ADMIN_ASSIGNABLE_ROLES`

### Build
- [x] `npm run build` — passes with 0 TypeScript errors. All 3 tech-admin routes confirmed in route table.

---

## ❌ REMAINING

### Data Migration (must do manually in Firebase console or via script)
The existing data has no `schoolId` or `courseId`. Steps:

1. **Create school doc** in Firestore `schools/` collection:
   ```json
   { "name": "Your School Name", "createdAt": <now> }
   ```
   → note the generated `schoolId`

2. **Create course doc** in Firestore `courses/` collection:
   ```json
   {
     "schoolId": "<schoolId from step 1>",
     "name": "BS Computer Engineering",
     "active": true,
     "coordinatorId": "<existing admin uid>",
     "createdAt": <now>
   }
   ```
   → note the generated `courseId`

3. **Batch-update all existing `users` docs** → add `schoolId` and `courseId` (use `courseId: null` for tech_admin)

4. **Batch-update all existing `groups` docs** → add `schoolId` + `courseId`

5. **Batch-update all existing `theses` docs** → add `schoolId` + `courseId`

6. **Set the first tech_admin** → find the existing admin user in Firestore `users/`, change their `role` to `"tech_admin"`, set `courseId: null`

7. **Keep or create a coordinator** → the existing admin (or a new user) should have `role: "admin"` + `courseId: <bsce courseId>` + `schoolId`

### Firestore Composite Indexes (create if queries fail in browser console)
- `courses`: `schoolId ASC` + `active ASC`
- `groups`: `courseId ASC`
- `theses`: `courseId ASC`
- `users`: `courseId ASC`, `schoolId ASC`

### CLAUDE.md Update
- [ ] Update `CLAUDE.md` to document the new architecture: `schools/` + `courses/` collections, `tech_admin` role, `schoolId`/`courseId` on users/groups/theses, new routes `/tech-admin/*`

### Optional / Future
- [ ] `adviser/available/page.tsx` — currently shows ALL theses without adviser; should filter to same course as the adviser (`where("courseId", "==", tmsUser.courseId)`) — needs `getUsersByCapability` to also be course-scoped or filtered separately
- [ ] `getUsersByCapability("adviser")` in assign + schedules pages — currently returns ALL advisers/panel across ALL schools; should filter by `schoolId` for proper isolation
- [ ] Firestore security rules — tighten to enforce `schoolId`/`courseId` access at the database level

---

## How to Continue in Next Session

1. Read this file (`MULTI_SCHOOL_PROGRESS.md`) at the start of the session
2. Run `git checkout feature/multi-school-multi-course` to get back to this branch
3. Run `npm run build` to confirm still clean
4. Pick up from the ❌ REMAINING section above — start with the migration steps, then the optional course-scoping fixes
