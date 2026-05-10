import * as admin from "firebase-admin";
import * as fs from "fs";
import * as path from "path";

// ─── CONFIG — fill these in before running ───────────────────────────────────
const CONFIG = {
  schoolName: "Cebu Institute of Technology University",
  courseName: "BS Computer Engineering",
  techAdminEmail: "admin@email.com", // this user → role: tech_admin, courseId: null
  coordinatorEmail: null as string | null, // this user → role: admin + gets courseId
  //                                        // set to null to assign a coordinator later via the UI
};
// ─────────────────────────────────────────────────────────────────────────────

const KEY_PATH = path.join(process.cwd(), "serviceAccountKey.json");

if (!fs.existsSync(KEY_PATH)) {
  console.error("❌  serviceAccountKey.json not found in project root.");
  console.error(
    "    Download it from Firebase Console → Project Settings → Service Accounts.",
  );
  process.exit(1);
}

if (
  CONFIG.schoolName === "YOUR SCHOOL NAME HERE" ||
  CONFIG.techAdminEmail === "your-admin@email.com"
) {
  console.error("❌  Fill in CONFIG at the top of this file before running.");
  process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(KEY_PATH, "utf-8"));
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

const BATCH_SIZE = 400;

async function batchUpdate(
  docs: admin.firestore.QueryDocumentSnapshot[],
  data: Record<string, unknown>,
  label: string,
) {
  let count = 0;
  for (let i = 0; i < docs.length; i += BATCH_SIZE) {
    const batch = db.batch();
    const chunk = docs.slice(i, i + BATCH_SIZE);
    for (const doc of chunk) batch.update(doc.ref, data);
    await batch.commit();
    count += chunk.length;
  }
  console.log(`   ✅ ${label}: ${count} updated`);
  return count;
}

async function migrate() {
  console.log("🚀  Starting ThesisHub data migration...\n");

  // ── 1. Create school document ────────────────────────────────────────────
  const schoolRef = db.collection("schools").doc();
  await schoolRef.set({
    name: CONFIG.schoolName,
    createdAt: admin.firestore.Timestamp.now(),
  });
  const schoolId = schoolRef.id;
  console.log(`1. School created`);
  console.log(`   ID   : ${schoolId}`);
  console.log(`   Name : ${CONFIG.schoolName}\n`);

  // ── 2. Load all users ────────────────────────────────────────────────────
  const usersSnap = await db.collection("users").get();
  const allUserDocs = usersSnap.docs;
  type RawUser = {
    ref: admin.firestore.DocumentReference;
    id: string;
    email: string;
    [key: string]: unknown;
  };
  const allUsers: RawUser[] = allUserDocs.map(
    (d) =>
      ({
        ref: d.ref,
        id: d.id,
        ...(d.data() as Record<string, unknown>),
      }) as RawUser,
  );

  // ── 3. Resolve tech_admin ────────────────────────────────────────────────
  const techAdminDoc = allUsers.find((u) => u.email === CONFIG.techAdminEmail);
  if (!techAdminDoc) {
    console.error(`❌  No user found with email: ${CONFIG.techAdminEmail}`);
    console.error("    Check CONFIG.techAdminEmail and try again.");
    process.exit(1);
  }

  // ── 4. Resolve coordinator (optional) ───────────────────────────────────
  let coordinatorId: string | null = null;
  if (CONFIG.coordinatorEmail) {
    const coordDoc = allUsers.find((u) => u.email === CONFIG.coordinatorEmail);
    if (!coordDoc) {
      console.warn(
        `⚠️   Coordinator email not found: ${CONFIG.coordinatorEmail} — skipping coordinator assignment.`,
      );
    } else {
      coordinatorId = coordDoc.id;
    }
  }

  // ── 5. Create course document ────────────────────────────────────────────
  const courseRef = db.collection("courses").doc();
  await courseRef.set({
    schoolId,
    name: CONFIG.courseName,
    active: true,
    coordinatorId,
    createdAt: admin.firestore.Timestamp.now(),
  });
  const courseId = courseRef.id;
  console.log(`2. Course created`);
  console.log(`   ID   : ${courseId}`);
  console.log(`   Name : ${CONFIG.courseName}\n`);

  // ── 6. Promote tech_admin ────────────────────────────────────────────────
  await techAdminDoc.ref.update({
    role: "tech_admin",
    schoolId,
    courseId: null,
  });
  console.log(`3. ${CONFIG.techAdminEmail} → tech_admin (courseId: null)\n`);

  // ── 7. Promote coordinator ───────────────────────────────────────────────
  if (coordinatorId) {
    const coordDoc = allUsers.find((u) => u.id === coordinatorId)!;
    await coordDoc.ref.update({ role: "admin", schoolId, courseId });
    await courseRef.update({ coordinatorId });
    console.log(`4. ${CONFIG.coordinatorEmail} → admin / coordinator\n`);
  } else {
    console.log(
      `4. No coordinator assigned (set later via /tech-admin/users)\n`,
    );
  }

  // ── 8. Batch-update remaining users ─────────────────────────────────────
  const skipIds = new Set([
    techAdminDoc.id,
    ...(coordinatorId ? [coordinatorId] : []),
  ]);
  const remainingUserDocs = allUserDocs.filter((d) => !skipIds.has(d.id));
  console.log("5. Updating remaining users...");
  await batchUpdate(remainingUserDocs, { schoolId, courseId }, "users");

  // ── 9. Batch-update groups ───────────────────────────────────────────────
  const groupsSnap = await db.collection("groups").get();
  console.log("\n6. Updating groups...");
  await batchUpdate(groupsSnap.docs, { schoolId, courseId }, "groups");

  // ── 10. Batch-update theses ──────────────────────────────────────────────
  const thesesSnap = await db.collection("theses").get();
  console.log("\n7. Updating theses...");
  await batchUpdate(thesesSnap.docs, { schoolId, courseId }, "theses");

  // ── Summary ──────────────────────────────────────────────────────────────
  console.log("\n────────────────────────────────────────");
  console.log("🎉  Migration complete!");
  console.log(`    School ID : ${schoolId}`);
  console.log(`    Course ID : ${courseId}`);
  console.log("\nNext step:");
  console.log("  1. Fill in your project ID in .firebaserc");
  console.log("  2. Run: firebase deploy --only firestore:indexes");
}

migrate().catch((err) => {
  console.error("❌  Migration failed:", err);
  process.exit(1);
});
