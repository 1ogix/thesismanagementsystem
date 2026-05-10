"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import {
  getCoursesBySchool,
  createCourse,
  updateCourse,
} from "@/lib/firestore/courses";
import { getUsersBySchool, updateUserRole } from "@/lib/firestore/users";
import { Course, TmsUser, PRESET_COURSES } from "@/types";
import { ROLE_LABELS } from "@/lib/roles";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Plus, ToggleLeft, ToggleRight } from "lucide-react";
import { toast } from "sonner";
import { Timestamp } from "firebase/firestore";

export default function TechAdminCoursesPage() {
  const { tmsUser } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [coordinators, setCoordinators] = useState<TmsUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCourseName, setNewCourseName] = useState<string>("");
  const [newCoordinatorId, setNewCoordinatorId] = useState<string>("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!tmsUser) return;
    if (!tmsUser.schoolId) { setLoading(false); return; }
    Promise.all([
      getCoursesBySchool(tmsUser.schoolId),
      getUsersBySchool(tmsUser.schoolId),
    ]).then(([c, users]) => {
      setCourses(c);
      setCoordinators(
        users.filter((u) => u.role === "admin" || u.role === "tech_admin"),
      );
      setLoading(false);
    });
  }, [tmsUser]);

  async function handleAddCourse(e: React.FormEvent) {
    e.preventDefault();
    if (!tmsUser?.schoolId || !newCourseName) {
      toast.error("Select a course name.");
      return;
    }
    setSaving(true);
    try {
      const id = await createCourse({
        schoolId: tmsUser.schoolId,
        name: newCourseName,
        active: true,
        coordinatorId: newCoordinatorId || null,
      });
      const newCourse: Course = {
        id,
        schoolId: tmsUser.schoolId,
        name: newCourseName,
        active: true,
        coordinatorId: newCoordinatorId || null,
        createdAt: Timestamp.now(),
      };
      if (newCoordinatorId) {
        await updateUserRole(newCoordinatorId, "admin");
        await updateCourse(id, { coordinatorId: newCoordinatorId });
      }
      setCourses((prev) => [...prev, newCourse]);
      setNewCourseName("");
      setNewCoordinatorId("");
      toast.success("Course added.");
    } catch {
      toast.error("Failed to add course.");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(course: Course) {
    try {
      await updateCourse(course.id, { active: !course.active });
      setCourses((prev) =>
        prev.map((c) => (c.id === course.id ? { ...c, active: !c.active } : c)),
      );
      toast.success(
        course.active ? "Course deactivated." : "Course activated.",
      );
    } catch {
      toast.error("Failed to update course.");
    }
  }

  async function handleAssignCoordinator(courseId: string, uid: string) {
    try {
      await updateCourse(courseId, { coordinatorId: uid || null });
      if (uid) await updateUserRole(uid, "admin");
      setCourses((prev) =>
        prev.map((c) =>
          c.id === courseId ? { ...c, coordinatorId: uid || null } : c,
        ),
      );
      toast.success("Coordinator updated.");
    } catch {
      toast.error("Failed to assign coordinator.");
    }
  }

  const existingCourseNames = new Set(courses.map((c) => c.name));
  const availablePresets = PRESET_COURSES.filter(
    (name) => !existingCourseNames.has(name),
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Course Management</h1>

      {/* Add course form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add a Course</CardTitle>
          <CardDescription>
            Activate a program for your school and optionally assign a
            coordinator.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddCourse} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Course / Program</Label>
                <Select
                  onValueChange={(v) => setNewCourseName(v ?? "")}
                  value={newCourseName}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        availablePresets.length === 0
                          ? "All courses added"
                          : "Select a course…"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {availablePresets.map((name) => (
                      <SelectItem key={name} value={name}>
                        {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Assign Coordinator (optional)</Label>
                <Select
                  onValueChange={(v) => setNewCoordinatorId(v ?? "")}
                  value={newCoordinatorId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="No coordinator yet" />
                  </SelectTrigger>
                  <SelectContent>
                    {coordinators.map((u) => (
                      <SelectItem key={u.uid} value={u.uid}>
                        {u.displayName} — {ROLE_LABELS[u.role]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button
              type="submit"
              className="bg-blue-600 hover:bg-blue-500"
              disabled={
                saving || !newCourseName || availablePresets.length === 0
              }
            >
              <Plus className="w-4 h-4 mr-1" /> Add Course
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Course list */}
      <div className="space-y-3">
        <h2 className="font-semibold text-slate-700">All Courses</h2>
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        ) : courses.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-10 text-center text-slate-400 text-sm">
              No courses yet.
            </CardContent>
          </Card>
        ) : (
          courses.map((course) => {
            const coordinator = coordinators.find(
              (u) => u.uid === course.coordinatorId,
            );
            return (
              <Card key={course.id}>
                <CardContent className="py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-slate-800">
                          {course.name}
                        </p>
                        <Badge
                          variant={course.active ? "default" : "outline"}
                          className="text-xs"
                        >
                          {course.active ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Coordinator:{" "}
                        {coordinator
                          ? coordinator.displayName
                          : "None assigned"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                      {/* Reassign coordinator */}
                      <Select
                        value={course.coordinatorId ?? ""}
                        onValueChange={(v) =>
                          handleAssignCoordinator(course.id, v ?? "")
                        }
                      >
                        <SelectTrigger className="w-44 h-7 text-xs">
                          <SelectValue placeholder="Assign coordinator">
                            {course.coordinatorId
                              ? (coordinators.find((u) => u.uid === course.coordinatorId)?.displayName ?? null)
                              : null}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {coordinators.map((u) => (
                            <SelectItem
                              key={u.uid}
                              value={u.uid}
                              className="text-xs"
                            >
                              {u.displayName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {/* Toggle active */}
                      <AlertDialog>
                        <AlertDialogTrigger
                          className={`inline-flex items-center gap-1 px-2 h-7 rounded-md text-xs border transition-colors ${course.active ? "border-red-200 text-red-600 hover:bg-red-50" : "border-green-200 text-green-600 hover:bg-green-50"}`}
                        >
                          {course.active ? (
                            <>
                              <ToggleLeft className="w-3 h-3" /> Deactivate
                            </>
                          ) : (
                            <>
                              <ToggleRight className="w-3 h-3" /> Activate
                            </>
                          )}
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              {course.active ? "Deactivate" : "Activate"}{" "}
                              {course.name}?
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              {course.active
                                ? "Students will no longer be able to register under this course."
                                : "This course will become available for new registrations."}
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleToggleActive(course)}
                            >
                              Confirm
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
