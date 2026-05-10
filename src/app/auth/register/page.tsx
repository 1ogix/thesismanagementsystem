"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { createUserDocument } from "@/lib/firestore/users";
import { getAllSchools } from "@/lib/firestore/schools";
import { getActiveCoursesBySchool } from "@/lib/firestore/courses";
import { UserRole, School, Course } from "@/types";
import { getDefaultDashboardRoute, SELF_REGISTER_ROLES } from "@/lib/roles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { BookOpen, Loader2 } from "lucide-react";
import { toast } from "sonner";

type RegisterRoleOption = { value: UserRole; label: string; desc: string };

const ROLES: RegisterRoleOption[] = [
  { value: "student", label: "Student", desc: "Submit thesis proposals and documents" },
  { value: "adviser", label: "Adviser", desc: "Mentor and review student theses" },
  { value: "panel", label: "Panel Member", desc: "Evaluate and grade thesis defenses" },
];

export default function RegisterPage() {
  const router = useRouter();
  const [schools, setSchools] = useState<School[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [form, setForm] = useState({
    displayName: "",
    email: "",
    institutionalEmail: "",
    password: "",
    role: "" as UserRole | "",
    schoolId: "",
    courseId: "",
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getAllSchools().then(setSchools);
  }, []);

  useEffect(() => {
    if (!form.schoolId) { setCourses([]); return; }
    getActiveCoursesBySchool(form.schoolId).then(setCourses);
    setForm((prev) => ({ ...prev, courseId: "" }));
  }, [form.schoolId]);

  function handleChange(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (!form.role) { toast.error("Please select a role."); return; }
    if (!form.schoolId) { toast.error("Please select a school."); return; }
    if (!form.courseId) { toast.error("Please select a course."); return; }
    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, form.email, form.password);
      await updateProfile(cred.user, { displayName: form.displayName });
      await createUserDocument(cred.user.uid, {
        email: form.email,
        displayName: form.displayName,
        role: form.role as UserRole,
        department: courses.find((c) => c.id === form.courseId)?.name ?? "",
        institutionalEmail: form.institutionalEmail || form.email,
        schoolId: form.schoolId,
        courseId: form.courseId,
      });

      document.cookie = `tms-role=${form.role}; path=/; max-age=604800`;
      toast.success("Account created!");
      router.push(getDefaultDashboardRoute(form.role as UserRole));
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Registration failed.");
    } finally {
      setLoading(false);
    }
  }

  const inputCls = "bg-white/5 border-white/10 text-white placeholder:text-slate-500";
  const triggerCls = "bg-white/5 border-white/10 text-white";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-2 mb-8 text-white font-bold text-xl">
          <BookOpen className="w-6 h-6 text-blue-400" />
          ThesisHub
        </div>

        <Card className="bg-white/5 border-white/10 text-white">
          <CardHeader className="text-center">
            <CardTitle className="text-white">Create Account</CardTitle>
            <CardDescription className="text-slate-400">
              Join ThesisHub to manage your thesis digitally
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="space-y-1">
                <Label className="text-slate-300">Full Name</Label>
                <Input
                  placeholder="Juan Dela Cruz"
                  value={form.displayName}
                  onChange={(e) => handleChange("displayName", e.target.value)}
                  required
                  className={inputCls}
                />
              </div>

              <div className="space-y-1">
                <Label className="text-slate-300">Email</Label>
                <Input
                  type="email"
                  placeholder="you@email.com"
                  value={form.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                  required
                  className={inputCls}
                />
              </div>

              <div className="space-y-1">
                <Label className="text-slate-300">Institutional Email</Label>
                <Input
                  type="email"
                  placeholder="you@university.edu.ph"
                  value={form.institutionalEmail}
                  onChange={(e) => handleChange("institutionalEmail", e.target.value)}
                  className={inputCls}
                />
              </div>

              {/* School */}
              <div className="space-y-1">
                <Label className="text-slate-300">School</Label>
                <Select onValueChange={(v) => handleChange("schoolId", (v ?? "") as string)}>
                  <SelectTrigger className={triggerCls}>
                    <SelectValue placeholder={schools.length === 0 ? "Loading schools…" : "Select your school"}>
                      {form.schoolId
                        ? (schools.find((s) => s.id === form.schoolId)?.name ?? null)
                        : null}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {schools.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Course — only shown once a school is picked */}
              {form.schoolId && (
                <div className="space-y-1">
                  <Label className="text-slate-300">Course / Program</Label>
                  <Select
                    key={form.schoolId}
                    onValueChange={(v) => handleChange("courseId", (v ?? "") as string)}
                  >
                    <SelectTrigger className={triggerCls}>
                      <SelectValue placeholder={courses.length === 0 ? "No active courses" : "Select your course"}>
                        {form.courseId
                          ? (courses.find((c) => c.id === form.courseId)?.name ?? null)
                          : null}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {courses.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Role */}
              <div className="space-y-1">
                <Label className="text-slate-300">Role</Label>
                <Select onValueChange={(v) => handleChange("role", (v ?? "") as string)}>
                  <SelectTrigger className={triggerCls}>
                    <SelectValue placeholder="Select your role" />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map((r) => (
                      <SelectItem key={r.value} value={r.value}>
                        <span className="font-medium">{r.label}</span>
                        <span className="text-xs text-muted-foreground ml-2">— {r.desc}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-slate-300">Password</Label>
                <Input
                  type="password"
                  placeholder="At least 8 characters"
                  value={form.password}
                  onChange={(e) => handleChange("password", e.target.value)}
                  required
                  minLength={8}
                  className={inputCls}
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-500"
                disabled={loading}
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Create Account
              </Button>
            </form>
            <p className="text-center text-sm text-slate-400 mt-4">
              Already have an account?{" "}
              <Link href="/auth/login" className="text-blue-400 hover:underline">
                Sign In
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
