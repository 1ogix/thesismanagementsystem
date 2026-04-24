# Error: Adviser "Open Theses" Page Showed Empty Even When Theses Existed

## What Was the Error

The adviser's "Open Theses" page (`/adviser/available`) always displayed "All theses have advisers assigned" even when a student had created a thesis with no adviser. The list was always empty regardless of how many theses existed in Firestore.

## Why It Happened

The original code called `hasAdviserApplied(thesisId, adviserId)` once per thesis inside a `Promise.all`. That function ran a Firestore query with **two `where` filters** on different fields:

```ts
query(
  collection(db, "adviserApplications"),
  where("thesisId", "==", thesisId),
  where("adviserId", "==", adviserId)
)
```

Firestore requires a **composite index** for any query that combines `where` on multiple different fields. That composite index had never been created in the Firebase Console. When the query ran, Firestore threw an error with a link to create the missing index.

Because the error was thrown inside `Promise.all`, it caused the entire `.then()` chain to reject. The `.catch()` handler caught it silently — it only called `setLoading(false)` without setting any theses — so the `theses` state stayed as `[]`. With an empty array, `openTheses.filter(...)` also returned `[]`, showing the empty state message.

The silent catch made it look like a data or permissions problem when it was actually a missing Firestore index.

## How We Fixed It

Replaced the per-thesis compound query with a single upfront query using only one `where` filter (no composite index needed), then checked membership in-memory:

```ts
// Single query — fetches all applications for this adviser
const myApplications = await getApplicationsByAdviser(tmsUser.uid);

const withState = await Promise.all(
  all.map(async (t) => {
    const group = await getGroup(t.groupId);
    return {
      ...t,
      hasApplied: myApplications.some((a) => a.thesisId === t.id), // in-memory check
      hasAdviser: !!group?.adviserId,
    };
  })
);
```

`getApplicationsByAdviser` queries on a single field (`adviserId`) which requires no composite index. The `hasApplied` check is done in JavaScript using `.some()` instead of a second Firestore query.

## Additional Discovery

After applying the fix, debug toasts revealed "Found 1 total theses / 0 open" — meaning the thesis existed but its group already had `adviserId` set from previous manual testing. The code was correct; the test data was stale. Setting `adviserId` back to `null` on the group document in Firebase Console resolved the display issue.

## Lesson

Always add visible error feedback (e.g. `toast.error(err.message)`) in Firestore `.catch()` handlers during development. Silent catches hide Firestore index errors, permission errors, and query errors that are otherwise invisible unless the browser console is open.
