"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import "./homepage.css";

type RoleKey = "student" | "adviser" | "panel" | "admin";

const CheckIcon = () => (
  <svg
    width="11"
    height="11"
    fill="none"
    stroke="#4ade80"
    strokeWidth="3"
    viewBox="0 0 24 24"
  >
    <path d="M20 6L9 17l-5-5" />
  </svg>
);

export default function LandingPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [activeRole, setActiveRole] = useState<RoleKey>("student");

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let W = 0,
      H = 0;
    let particles: {
      x: number;
      y: number;
      vx: number;
      vy: number;
      r: number;
      alpha: number;
    }[] = [];
    const PARTICLE_COUNT = 60;
    let animId: number;
    const accentHue = 217;

    function resize() {
      W = canvas!.width = window.innerWidth;
      H = canvas!.height = window.innerHeight;
    }

    function mkParticle() {
      return {
        x: Math.random() * W,
        y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        r: Math.random() * 1.5 + 0.5,
        alpha: Math.random() * 0.4 + 0.1,
      };
    }

    function initParticles() {
      particles = Array.from({ length: PARTICLE_COUNT }, mkParticle);
    }

    function draw() {
      ctx!.clearRect(0, 0, W, H);
      for (const p of particles) {
        ctx!.beginPath();
        ctx!.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx!.fillStyle = `hsla(${accentHue}, 70%, 65%, ${p.alpha})`;
        ctx!.fill();
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > W) p.vx *= -1;
        if (p.y < 0 || p.y > H) p.vy *= -1;
      }
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < 120) {
            ctx!.beginPath();
            ctx!.moveTo(particles[i].x, particles[i].y);
            ctx!.lineTo(particles[j].x, particles[j].y);
            ctx!.strokeStyle = `hsla(${accentHue}, 70%, 65%, ${0.06 * (1 - d / 120)})`;
            ctx!.lineWidth = 0.5;
            ctx!.stroke();
          }
        }
      }
      animId = requestAnimationFrame(draw);
    }

    resize();
    initParticles();
    draw();

    const handleResize = () => {
      resize();
      initParticles();
    };
    window.addEventListener("resize", handleResize);
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  useEffect(() => {
    document.body.classList.add("homepage");
    return () => document.body.classList.remove("homepage");
  }, []);

  useEffect(() => {
    const navbar = document.getElementById("navbar");
    const handleScroll = () =>
      navbar?.classList.toggle("scrolled", window.scrollY > 40);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("visible");
            observer.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12 },
    );
    document.querySelectorAll(".reveal").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const counterObs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          const el = e.target as HTMLElement;
          const target = +(el.dataset.target || 0);
          const dur = 1200;
          const start = performance.now();
          const tick = (now: number) => {
            const pct = Math.min((now - start) / dur, 1);
            const ease = 1 - Math.pow(1 - pct, 3);
            el.textContent = String(Math.round(ease * target));
            if (pct < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
          counterObs.unobserve(el);
        });
      },
      { threshold: 0.5 },
    );
    document
      .querySelectorAll(".counter")
      .forEach((el) => counterObs.observe(el));
    return () => counterObs.disconnect();
  }, []);

  return (
    <>
      <canvas ref={canvasRef} id="canvas-bg" />

      {/* NAV */}
      <nav id="navbar">
        <Link href="/" className="nav-logo">
          <svg
            width="22"
            height="22"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
          </svg>
          ThesisHub
        </Link>
        <div className="nav-links">
          <a href="#features" className="btn-ghost">
            Features
          </a>
          <a href="#how-it-works" className="btn-ghost">
            How it works
          </a>
          <a href="#roles" className="btn-ghost">
            Roles
          </a>
          <a href="/auth/login" className="btn-ghost">
            Sign In
          </a>
          <a href="/auth/register" className="btn-primary">
            Get Started
          </a>
        </div>
      </nav>

      {/* HERO */}
      <section id="hero">
        <div className="hero-glow" />
        <div className="container">
          <div className="hero-badge">
            <span className="dot" />
            Paperless Thesis Management
          </div>
          <h1 className="hero-title">
            Manage your thesis
            <br />
            journey, <em>end-to-end.</em>
          </h1>
          <p className="hero-sub">
            ThesisHub replaces binders, emails, and spreadsheets with one
            digital platform — from initial proposal to final manuscript
            defense.
          </p>
          <div className="hero-cta">
            <a href="/auth/register" className="btn-primary-lg">
              <svg
                width="16"
                height="16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                viewBox="0 0 24 24"
              >
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
              Start for Free
            </a>
            <a href="#how-it-works" className="btn-outline">
              See how it works
            </a>
          </div>

          {/* Dashboard Mockup */}
          <div className="hero-mockup">
            <div className="mockup-window">
              <div className="mockup-bar">
                <div className="mockup-dot mockup-dot-red" />
                <div className="mockup-dot mockup-dot-yellow" />
                <div className="mockup-dot mockup-dot-green" />
                <div className="mockup-url">thesishub.app/student</div>
              </div>
              <div className="mockup-body">
                <div className="mockup-sidebar">
                  <div className="mockup-sidebar-label">STUDENT</div>
                  <div className="mockup-nav-item active">
                    <span className="mockup-nav-dot" />
                    Dashboard
                  </div>
                  <div className="mockup-nav-item">
                    <span className="mockup-nav-dot" />
                    My Group
                  </div>
                  <div className="mockup-nav-item">
                    <span className="mockup-nav-dot" />
                    Thesis
                  </div>
                  <div className="mockup-nav-item">
                    <span className="mockup-nav-dot" />
                    Submissions
                  </div>
                  <div className="mockup-sidebar-footer">
                    <div className="mockup-nav-item">
                      <span className="mockup-nav-dot" />
                      Notifications
                      <span className="mockup-count">3</span>
                    </div>
                  </div>
                </div>
                <div className="mockup-main">
                  <div className="mockup-heading">📊 Thesis Overview</div>
                  <div className="mockup-cards">
                    <div className="mockup-stat">
                      <div className="mockup-stat-label">Current Stage</div>
                      <div className="mockup-stat-value mockup-stat-value-sm">
                        Pre-Oral
                      </div>
                    </div>
                    <div className="mockup-stat">
                      <div className="mockup-stat-label">Status</div>
                      <div className="mockup-stat-value mockup-stat-value-sm status-success">
                        Approved
                      </div>
                    </div>
                    <div className="mockup-stat">
                      <div className="mockup-stat-label">Submissions</div>
                      <div className="mockup-stat-value">7</div>
                    </div>
                  </div>
                  <div className="mockup-section-label">Progress</div>
                  <div className="mockup-timeline">
                    <div className="tl-step done">Proposal</div>
                    <div className="tl-arrow">→</div>
                    <div className="tl-step active">Pre-Oral</div>
                    <div className="tl-arrow">→</div>
                    <div className="tl-step">Final Oral</div>
                    <div className="tl-arrow">→</div>
                    <div className="tl-step">Manuscript</div>
                  </div>
                  <div className="mockup-table">
                    <div className="mockup-tr header">
                      <span>Document</span>
                      <span>Stage</span>
                      <span>Status</span>
                    </div>
                    <div className="mockup-tr">
                      <span>Proposal_v3.pdf</span>
                      <span className="text-muted">Proposal</span>
                      <span>
                        <span className="badge badge-green">Approved</span>
                      </span>
                    </div>
                    <div className="mockup-tr">
                      <span>PreOral_v1.pdf</span>
                      <span className="text-muted">Pre-Oral</span>
                      <span>
                        <span className="badge badge-blue">Under Review</span>
                      </span>
                    </div>
                    <div className="mockup-tr">
                      <span>PreOral_v2.pdf</span>
                      <span className="text-muted">Pre-Oral</span>
                      <span>
                        <span className="badge badge-amber">Scheduled</span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="hero-scroll-hint">
          Scroll to explore
          <div className="scroll-line" />
        </div>
      </section>

      {/* STATS */}
      <section id="stats">
        <div className="container">
          <div className="stats-grid">
            <div className="stat-item reveal">
              <div className="stat-num">
                <span className="counter" data-target="4">
                  0
                </span>
              </div>
              <div className="stat-label">Thesis stages tracked</div>
            </div>
            <div className="stat-item reveal reveal-delay-1">
              <div className="stat-num">
                <span className="counter" data-target="4">
                  0
                </span>
              </div>
              <div className="stat-label">User roles supported</div>
            </div>
            <div className="stat-item reveal reveal-delay-2">
              <div className="stat-num">
                <span className="counter" data-target="21">
                  0
                </span>
                <span className="unit">+</span>
              </div>
              <div className="stat-label">Dashboard routes</div>
            </div>
            <div className="stat-item reveal reveal-delay-3">
              <div className="stat-num">
                <span className="counter" data-target="100">
                  0
                </span>
                <span className="unit">%</span>
              </div>
              <div className="stat-label">Paperless workflow</div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features">
        <div className="container">
          <div className="features-header">
            <div className="section-eyebrow reveal">Everything you need</div>
            <h2 className="section-title reveal reveal-delay-1">
              Built for every stakeholder
            </h2>
            <p className="section-sub reveal reveal-delay-2">
              One platform connecting students, advisers, panel members, and
              coordinators through every thesis milestone.
            </p>
          </div>
          <div className="features-grid">
            {[
              {
                icon: (
                  <svg
                    width="20"
                    height="20"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                ),
                title: "Team Groups",
                desc: "Students form thesis groups, invite members by email, and collaborate in a shared workspace.",
                delay: "",
              },
              {
                icon: (
                  <svg
                    width="20"
                    height="20"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                  </svg>
                ),
                title: "Adviser Assignment",
                desc: "Advisers volunteer for theses they want to guide, or get directly assigned by coordinators.",
                delay: "reveal-delay-1",
              },
              {
                icon: (
                  <svg
                    width="20"
                    height="20"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <path d="M9 11l3 3L22 4" />
                    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                  </svg>
                ),
                title: "Structured Evaluation",
                desc: "Panel members grade each defense using per-criterion sliders with automatic score calculation.",
                delay: "reveal-delay-2",
              },
              {
                icon: (
                  <svg
                    width="20"
                    height="20"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                ),
                title: "Versioned Documents",
                desc: 'Every PDF submission is versioned and stored securely — no more "final_v3_FINAL.pdf" confusion.',
                delay: "reveal-delay-3",
              },
              {
                icon: (
                  <svg
                    width="20"
                    height="20"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                ),
                title: "Defense Scheduling",
                desc: "Coordinators schedule defense dates and venues, instantly notifying all assigned panel members.",
                delay: "",
              },
              {
                icon: (
                  <svg
                    width="20"
                    height="20"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                  </svg>
                ),
                title: "Real-time Notifications",
                desc: "Live in-app notifications keep every user updated on submissions, approvals, and scheduled defenses.",
                delay: "reveal-delay-1",
              },
              {
                icon: (
                  <svg
                    width="20"
                    height="20"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                ),
                title: "Role-based Access",
                desc: "Each user only sees what they need — students, advisers, panel members, and admins all have tailored views.",
                delay: "reveal-delay-2",
              },
              {
                icon: (
                  <svg
                    width="20"
                    height="20"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <line x1="18" y1="20" x2="18" y2="10" />
                    <line x1="12" y1="20" x2="12" y2="4" />
                    <line x1="6" y1="20" x2="6" y2="14" />
                  </svg>
                ),
                title: "Admin Analytics",
                desc: "System-wide stats on users, theses, submissions, and stage distribution — all in a single dashboard.",
                delay: "reveal-delay-3",
              },
            ].map(({ icon, title, desc, delay }) => (
              <div key={title} className={`feature-card reveal ${delay}`}>
                <div className="feature-icon">{icon}</div>
                <div className="feature-title">{title}</div>
                <div className="feature-desc">{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="section-bordered">
        <div className="container">
          <div className="hiw-inner">
            <div>
              <div className="section-eyebrow reveal">The lifecycle</div>
              <h2 className="section-title reveal reveal-delay-1">
                4 stages.
                <br />
                All in one place.
              </h2>
              <p className="section-sub reveal reveal-delay-2">
                Every thesis goes through a fixed progression. ThesisHub tracks
                status, approvals, and documents at each stage — nothing slips
                through the cracks.
              </p>
            </div>
            <div className="stages-visual reveal">
              {[
                {
                  num: "1",
                  name: "Proposal / Title Defense",
                  desc: "Students submit their thesis proposal PDF. The adviser reviews, gives feedback, and marks it approved or requires revision before it can be scheduled for defense.",
                  tags: ["PDF Upload", "Adviser Review", "Defense Schedule"],
                },
                {
                  num: "2",
                  name: "Pre-Oral Defense",
                  desc: "Revised work is presented. Panel members are assigned and provide structured graded evaluations with per-criterion scores.",
                  tags: [
                    "Panel Assignment",
                    "Grading Form",
                    "Score Aggregation",
                  ],
                },
                {
                  num: "3",
                  name: "Final Oral Defense",
                  desc: "The finalized thesis is defended before the full panel. All feedback incorporated, final scores recorded.",
                  tags: ["Full Panel", "Final Evaluation"],
                },
                {
                  num: "4",
                  name: "Manuscript Submission",
                  desc: 'The final manuscript is submitted, reviewed, and marked complete. The group status is updated to "completed."',
                  tags: ["Final PDF", "Completion", "Archived"],
                },
              ].map(({ num, name, desc, tags }) => (
                <div key={num} className="stage-row">
                  <div className="stage-num">{num}</div>
                  <div className="stage-content">
                    <div className="stage-name">{name}</div>
                    <div className="stage-desc">{desc}</div>
                    <div className="stage-tags">
                      {tags.map((t) => (
                        <span key={t} className="stage-tag">
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ROLES */}
      <section id="roles" className="section-bordered">
        <div className="container">
          <div className="roles-header">
            <div className="section-eyebrow reveal">Who uses ThesisHub</div>
            <h2 className="section-title reveal reveal-delay-1">
              Built for every role
            </h2>
          </div>
          <div className="roles-tabs reveal">
            {(["student", "adviser", "panel", "admin"] as RoleKey[]).map(
              (role) => (
                <button
                  key={role}
                  className={`role-tab${activeRole === role ? " active" : ""}`}
                  onClick={() => setActiveRole(role)}
                >
                  {role === "student"
                    ? "Student"
                    : role === "adviser"
                      ? "Adviser"
                      : role === "panel"
                        ? "Panel Member"
                        : "Coordinator"}
                </button>
              ),
            )}
          </div>

          {/* Student panel */}
          <div
            className={`role-panel${activeRole === "student" ? " active" : ""}`}
          >
            <div className="role-info">
              <div className="role-title">For Students</div>
              <div className="role-desc">
                Form your group, invite teammates, and manage your thesis from
                proposal to manuscript — all in one place. Track your stage
                status and get notified the moment your adviser reviews your
                submission.
              </div>
              <div className="role-features">
                {[
                  "Create and manage your thesis group",
                  "Upload versioned PDF submissions per stage",
                  "View adviser feedback and revision notes",
                  "Track progress through all 4 stages",
                  "Get real-time notifications on approvals",
                ].map((f) => (
                  <div key={f} className="role-feature">
                    <div className="role-feature-icon">
                      <CheckIcon />
                    </div>
                    <div className="role-feature-text">{f}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="role-screen">
              <div className="role-screen-header">
                📁 /student/thesis — Submission History
              </div>
              <div className="role-screen-body">
                <div className="mockup-cards">
                  <div className="mockup-stat">
                    <div className="mockup-stat-label">Stage</div>
                    <div className="mockup-stat-value mockup-stat-value-xs">
                      Pre-Oral
                    </div>
                  </div>
                  <div className="mockup-stat">
                    <div className="mockup-stat-label">Versions</div>
                    <div className="mockup-stat-value">3</div>
                  </div>
                  <div className="mockup-stat">
                    <div className="mockup-stat-label">Status</div>
                    <div className="mockup-stat-value mockup-stat-value-xs status-success">
                      Approved
                    </div>
                  </div>
                </div>
                <div className="mockup-table">
                  <div className="mockup-tr header">
                    <span>Version</span>
                    <span>Uploaded</span>
                    <span>Adviser</span>
                  </div>
                  <div className="mockup-tr">
                    <span>v1 — Draft.pdf</span>
                    <span className="text-muted">Mar 2</span>
                    <span>
                      <span className="badge badge-amber">Revision</span>
                    </span>
                  </div>
                  <div className="mockup-tr">
                    <span>v2 — Revised.pdf</span>
                    <span className="text-muted">Mar 9</span>
                    <span>
                      <span className="badge badge-blue">Reviewing</span>
                    </span>
                  </div>
                  <div className="mockup-tr">
                    <span>v3 — Final.pdf</span>
                    <span className="text-muted">Mar 14</span>
                    <span>
                      <span className="badge badge-green">Approved</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Adviser panel */}
          <div
            className={`role-panel${activeRole === "adviser" ? " active" : ""}`}
          >
            <div className="role-info">
              <div className="role-title">For Advisers</div>
              <div className="role-desc">
                Browse theses that need guidance, volunteer or get assigned by
                the coordinator, then review each submission with feedback.
                Approve when ready, or request targeted revisions.
              </div>
              <div className="role-features">
                {[
                  "Browse and volunteer for open theses",
                  "Open PDFs via secure 10-min signed URLs",
                  "Approve submissions or request revision",
                  "Leave structured written feedback",
                ].map((f) => (
                  <div key={f} className="role-feature">
                    <div className="role-feature-icon">
                      <CheckIcon />
                    </div>
                    <div className="role-feature-text">{f}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="role-screen">
              <div className="role-screen-header">
                📋 /adviser/assigned — Thesis Review
              </div>
              <div className="role-screen-body">
                <div className="role-screen-label">Latest Submission</div>
                <div className="submission-card">
                  <div className="submission-title">PreOral_Final_v3.pdf</div>
                  <div className="submission-meta">
                    Submitted Mar 14 · 2.4 MB
                  </div>
                  <div className="submission-actions">
                    <span className="submission-action submission-action-blue">
                      🔗 Open PDF
                    </span>
                    <span className="submission-action submission-action-green">
                      ✓ Approve
                    </span>
                    <span className="submission-action submission-action-amber">
                      ↩ Revise
                    </span>
                  </div>
                </div>
                <div className="feedback-card">
                  💬 Feedback: &ldquo;Good progress on Chapter 3. Please
                  elaborate on the methodology section before advancing.&rdquo;
                </div>
              </div>
            </div>
          </div>

          {/* Panel panel */}
          <div
            className={`role-panel${activeRole === "panel" ? " active" : ""}`}
          >
            <div className="role-info">
              <div className="role-title">For Panel Members</div>
              <div className="role-desc">
                Get assigned to defenses, review the submitted work, and submit
                structured evaluations. Each criterion is scored independently —
                the system calculates the overall grade automatically.
              </div>
              <div className="role-features">
                {[
                  "View all assigned thesis defenses",
                  "Per-criterion grading with sliders (0–100)",
                  "Auto-calculated overall score",
                  "Read-only after evaluation submitted",
                ].map((f) => (
                  <div key={f} className="role-feature">
                    <div className="role-feature-icon">
                      <CheckIcon />
                    </div>
                    <div className="role-feature-text">{f}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="role-screen">
              <div className="role-screen-header">
                📊 /panel/thesis/:id/evaluate
              </div>
              <div className="role-screen-body">
                <div className="role-screen-label role-screen-label-spaced">
                  Evaluation Form — Pre-Oral Stage
                </div>
                <div className="score-list">
                  {[
                    { label: "Content & Organization", score: 85 },
                    { label: "Methodology", score: 78 },
                    { label: "Presentation", score: 91 },
                  ].map(({ label, score }) => (
                    <div key={label} className="score-row">
                      <div className="score-row-header">
                        <span className="text-muted">{label}</span>
                        <span className="text-blue">{score}</span>
                      </div>
                      <div className="score-track">
                        <div className={`score-fill score-fill-${score}`} />
                      </div>
                    </div>
                  ))}
                  <div className="overall-score">
                    <span className="overall-score-label">Overall Score</span>
                    <span className="overall-score-value">84.7</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Admin panel */}
          <div
            className={`role-panel${activeRole === "admin" ? " active" : ""}`}
          >
            <div className="role-info">
              <div className="role-title">For Coordinators</div>
              <div className="role-desc">
                Full visibility across every thesis, group, and user. Assign
                advisers and panel members, schedule defenses, advance thesis
                stages, and manage the entire system from one command center.
              </div>
              <div className="role-features">
                {[
                  "System-wide stats and analytics",
                  "Assign advisers and panel members",
                  "Schedule defense dates and venues",
                  "Advance thesis stages or mark complete",
                  "Manage user roles and permissions",
                ].map((f) => (
                  <div key={f} className="role-feature">
                    <div className="role-feature-icon">
                      <CheckIcon />
                    </div>
                    <div className="role-feature-text">{f}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="role-screen">
              <div className="role-screen-header">
                ⚙️ /admin — System Overview
              </div>
              <div className="role-screen-body">
                <div className="mockup-cards mockup-cards-2">
                  <div className="mockup-stat">
                    <div className="mockup-stat-label">Total Theses</div>
                    <div className="mockup-stat-value">48</div>
                  </div>
                  <div className="mockup-stat">
                    <div className="mockup-stat-label">Active Users</div>
                    <div className="mockup-stat-value">124</div>
                  </div>
                  <div className="mockup-stat">
                    <div className="mockup-stat-label">Pending Assignments</div>
                    <div className="mockup-stat-value status-warning">7</div>
                  </div>
                  <div className="mockup-stat">
                    <div className="mockup-stat-label">Completed Theses</div>
                    <div className="mockup-stat-value status-success">19</div>
                  </div>
                </div>
                <div className="mockup-table">
                  <div className="mockup-tr header">
                    <span>Thesis</span>
                    <span>Stage</span>
                    <span>Action</span>
                  </div>
                  <div className="mockup-tr">
                    <span className="mockup-small-text">
                      ML-Based Diagnosis...
                    </span>
                    <span>
                      <span className="badge badge-blue">Pre-Oral</span>
                    </span>
                    <span className="mockup-action-blue">Advance →</span>
                  </div>
                  <div className="mockup-tr">
                    <span className="mockup-small-text">IoT Waste Mgmt...</span>
                    <span>
                      <span className="badge badge-amber">Proposal</span>
                    </span>
                    <span className="mockup-action-amber">Schedule</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section id="cta" className="section-bordered">
        <div className="container">
          <div className="cta-card reveal">
            <div className="cta-glow" />
            <div className="hero-badge hero-badge-cta">
              <span className="dot" />
              Free to use
            </div>
            <h2 className="cta-title">Ready to go paperless?</h2>
            <p className="cta-sub">
              Join your institution on ThesisHub and bring every thesis
              milestone into one unified platform.
            </p>
            <div className="hero-cta">
              <a href="/auth/register" className="btn-primary-lg">
                <svg
                  width="16"
                  height="16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  viewBox="0 0 24 24"
                >
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
                Create Your Account
              </a>
              <a href="/auth/login" className="btn-outline">
                Sign In
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer>
        <div className="container">
          <div className="footer-inner">
            <div className="footer-brand">
              <div className="brand-name">
                <svg
                  width="18"
                  height="18"
                  fill="none"
                  stroke="#60a5fa"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                </svg>
                ThesisHub
              </div>
              <p>
                Digitizing the academic thesis lifecycle — from proposal to
                final manuscript. No more printing. No more lost papers.
              </p>
            </div>
            <div className="footer-col">
              <h4>Platform</h4>
              <a href="#features">Features</a>
              <a href="#how-it-works">How it works</a>
              <a href="#roles">Roles</a>
            </div>
            <div className="footer-col">
              <h4>Access</h4>
              <a href="/auth/login">Sign In</a>
              <a href="/auth/register">Create Account</a>
              <a href="/admin">Admin Portal</a>
            </div>
          </div>
          <div className="footer-bottom">
            <span>© 2026 ThesisHub</span>
            <div className="footer-tech">
              <span className="tech-badge">Next.js</span>
              <span className="tech-badge">Firebase</span>
              <span className="tech-badge">Supabase</span>
              <span className="tech-badge">Vercel</span>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
