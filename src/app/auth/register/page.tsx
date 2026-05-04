"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { createUserDocument } from "@/lib/firestore/users";
import { UserRole } from "@/types";
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

const ROLES: { value: UserRole; label: string; desc: string }[] = [
  {
    value: "student",
    label: "Student",
    desc: "Submit thesis proposals and documents",
  },
  {
    value: "adviser",
    label: "Adviser",
    desc: "Mentor and review student theses",
  },
  {
    value: "panel",
    label: "Panel Member",
    desc: "Evaluate and grade thesis defenses",
  },
].filter((role) => SELF_REGISTER_ROLES.includes(role.value));

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    displayName: "",
    email: "",
    institutionalEmail: "",
    department: "",
    password: "",
    role: "" as UserRole | "",
  });
  const [loading, setLoading] = useState(false);

  function handleChange(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (!form.role) {
      toast.error("Please select a role.");
      return;
    }
    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, form.email, form.password);
      await updateProfile(cred.user, { displayName: form.displayName });
      await createUserDocument(cred.user.uid, {
        email: form.email,
        displayName: form.displayName,
        role: form.role as UserRole,
        department: form.department,
        institutionalEmail: form.institutionalEmail || form.email,
      });

      document.cookie = `tms-role=${form.role}; path=/; max-age=604800`;
      toast.success("Account created!");
      router.push(getDefaultDashboardRoute(form.role as UserRole));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Registration failed.";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

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
                  className="bg-white/5 border-white/10 text-white placeholder:text-slate-500"
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
                  className="bg-white/5 border-white/10 text-white placeholder:text-slate-500"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-slate-300">Institutional Email</Label>
                <Input
                  type="email"
                  placeholder="you@university.edu.ph"
                  value={form.institutionalEmail}
                  onChange={(e) => handleChange("institutionalEmail", e.target.value)}
                  className="bg-white/5 border-white/10 text-white placeholder:text-slate-500"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-slate-300">Department / Program</Label>
                <Input
                  placeholder="BSCS, BSIT, etc."
                  value={form.department}
                  onChange={(e) => handleChange("department", e.target.value)}
                  required
                  className="bg-white/5 border-white/10 text-white placeholder:text-slate-500"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-slate-300">Role</Label>
                <Select onValueChange={(v) => handleChange("role", (v ?? "") as string)}>
                  <SelectTrigger className="bg-white/5 border-white/10 text-white">
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
                  className="bg-white/5 border-white/10 text-white placeholder:text-slate-500"
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
