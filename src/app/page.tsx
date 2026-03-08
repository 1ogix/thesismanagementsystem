import Link from "next/link";
import { Button } from "@/components/ui/button";
import { BookOpen, Users, ClipboardCheck, FileText } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white">
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-5 border-b border-white/10">
        <div className="flex items-center gap-2 font-bold text-xl">
          <BookOpen className="w-6 h-6 text-blue-400" />
          ThesisHub
        </div>
        <div className="flex gap-3">
          <Link href="/auth/login">
            <Button
              variant="ghost"
              className="text-white hover:text-white hover:bg-white/10"
            >
              Sign In
            </Button>
          </Link>
          <Link href="/auth/register">
            <Button className="bg-blue-600 hover:bg-blue-500">
              Get Started
            </Button>
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-4xl mx-auto text-center px-6 py-24">
        <span className="inline-block bg-blue-500/20 text-blue-300 text-sm font-medium px-4 py-1 rounded-full mb-6 border border-blue-500/30">
          Paperless Thesis Management
        </span>
        <h1 className="text-5xl font-bold leading-tight mb-6">
          Manage Your Thesis Journey,{" "}
          <span className="text-blue-400">Digitally.</span>
        </h1>
        <p className="text-lg text-slate-300 mb-10 max-w-2xl mx-auto">
          From proposal to final manuscript — ThesisHub digitizes every stage of
          the thesis process. No more printing. No more lost papers.
        </p>
        <div className="flex gap-4 justify-center">
          <Link href="/auth/register">
            <Button
              size="lg"
              className="bg-blue-600 hover:bg-blue-500 text-white px-8"
            >
              Start for Free
            </Button>
          </Link>
          <Link href="/auth/login">
            <Button
              size="lg"
              variant="outline"
              className="border-white/20 text-black hover:bg-white/10 hover:text-white"
            >
              Sign In
            </Button>
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-6 pb-24 grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          {
            icon: Users,
            title: "Team Groups",
            desc: "Students form thesis groups and collaborate digitally.",
          },
          {
            icon: BookOpen,
            title: "Adviser Assignment",
            desc: "Advisers volunteer or get assigned by coordinators.",
          },
          {
            icon: ClipboardCheck,
            title: "Panel Evaluation",
            desc: "Panel members evaluate and grade proposals and defenses.",
          },
          {
            icon: FileText,
            title: "Document Tracking",
            desc: "All submissions versioned and accessible — no printing needed.",
          },
        ].map(({ icon: Icon, title, desc }) => (
          <div
            key={title}
            className="bg-white/5 border border-white/10 rounded-xl p-6 hover:bg-white/10 transition"
          >
            <Icon className="w-8 h-8 text-blue-400 mb-3" />
            <h3 className="font-semibold text-white mb-1">{title}</h3>
            <p className="text-sm text-slate-400">{desc}</p>
          </div>
        ))}
      </section>

      {/* Stages */}
      <section className="max-w-4xl mx-auto px-6 pb-24 text-center">
        <h2 className="text-2xl font-bold mb-2">
          4 Thesis Stages, All Digital
        </h2>
        <p className="text-slate-400 mb-10">
          Track progress through every milestone.
        </p>
        <div className="flex flex-col md:flex-row items-center justify-center gap-4">
          {[
            "Proposal / Title Defense",
            "Pre-Oral Defense",
            "Final Oral Defense",
            "Manuscript Submission",
          ].map((stage, i) => (
            <div key={stage} className="flex items-center gap-4">
              <div className="bg-blue-600/20 border border-blue-500/30 rounded-lg px-4 py-3 text-sm font-medium text-blue-200 text-center min-w-[140px]">
                <span className="block text-xs text-blue-400 mb-1">
                  Stage {i + 1}
                </span>
                {stage}
              </div>
              {i < 3 && (
                <span className="text-slate-600 hidden md:block text-xl">
                  →
                </span>
              )}
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-white/10 py-6 text-center text-slate-500 text-sm">
        &copy; {new Date().getFullYear()} ThesisHub. Built with Firebase &amp;
        Supabase.
      </footer>
    </div>
  );
}
