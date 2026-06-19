import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

import {
  LayoutDashboard,
  Brain,
  Route,
  FileSearch,
  FileText,
  Video,
  FolderKanban,
  User,
  Settings,
  Sparkles,
  ArrowRight,
  Target,
  BarChart3,
  Puzzle,
  Map,
  CheckCircle2,
  GraduationCap,
  LogOut,
  Loader2,
  Download,
  Info,
  GitBranch,
} from "lucide-react";

import logout from "../utils/logout";
import { apiUrl, assetUrl } from "../config/api";
import ProfileStatus from "../components/ProfileStatus";
import WhatIfSimulator from "./WhatIfSimulator";
import PathComparison from "./PathComparison";
import ConfidenceMeter, { getConfidenceBand } from "../components/ConfidenceMeter";
import ResponsibleAIPanel from "../components/ResponsibleAIPanel";
import ReasoningPanel from "../components/ReasoningPanel";
import LogoMark from "../components/LogoMark";

const GithubIcon = (props) => (
  <img src="/github.jpg" alt="GitHub" {...props} />
);

const LinkedinIcon = (props) => (
  <img src="/linkedin.jpg" alt="LinkedIn" {...props} />
);

const SidebarLink = ({ href, icon: Icon, label, active }) => (
  <a
    href={href}
    className={
      active
        ? "flex items-center gap-3 px-4 py-3 rounded-2xl bg-[#1d1d1f] text-white font-semibold"
        : "flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-[#f5f1ea] transition-all font-medium"
    }
  >
    <Icon className={active ? "w-5 h-5 text-white" : "w-5 h-5"} />
    {label}
  </a>
);

export default function Dashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [userInfo, setUserInfo] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [activeView, setActiveView] = useState("overview");
  const [reasoningMap, setReasoningMap] = useState({});

  useEffect(() => {
    const fetchAnalysis = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          navigate("/login");
          return;
        }

        const { data } = await axios.get(
          apiUrl("/api/analysis"),
          { headers: { Authorization: `Bearer ${token}` } }
        );

        setUserInfo(data.user);
        setAnalysis(data.analysis);
      } catch (error) {
        console.error(error);
        if (error.response?.status === 401) {
          logout();
          return;
        }
      } finally {
        setLoading(false);
      }
    };

    fetchAnalysis();
  }, [navigate]);

  // Fetch tradeoff reasoning for recommended skills (non-fatal — cards still
  // render without it). One batched call, results keyed by lowercased name.
  useEffect(() => {
    const skills = analysis?.recommendedSkills;
    if (!skills?.length) return;
    const fetchReasonings = async () => {
      try {
        const token = localStorage.getItem("token");
        const { data } = await axios.post(
          apiUrl("/api/recommendations/reasoning"),
          { targetRole: analysis?.careerFit, items: skills },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const map = {};
        (data?.reasonings || []).forEach((r) => {
          if (r?.name) map[r.name.toLowerCase()] = r.reasoning;
        });
        setReasoningMap(map);
      } catch (e) {
        // ignore — reasoning is optional enrichment
      }
    };
    fetchReasonings();
  }, [analysis]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f7f5f2] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-10 h-10 animate-spin text-[#b89968]" />
          <p className="text-slate-500 font-medium">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  const hasProfile = userInfo?.careerGoal && userInfo?.resume;

  if (!hasProfile) {
    return (
      <div className="min-h-screen bg-[#f7f5f2] flex items-center justify-center px-6">
        <div className="bg-white border border-[#e8e6e1] rounded-[2rem] p-10 text-center max-w-md w-full">
          <div className="w-20 h-20 rounded-full bg-[#f5f1ea] flex items-center justify-center mx-auto mb-6">
            <User className="w-10 h-10 text-[#1d1d1f]" />
          </div>
          <h2 className="text-2xl font-bold text-[#1d1d1f] mb-3">
            Finish setting up your profile
          </h2>
          <p className="text-slate-500 mb-6">
            Capabl needs your career goal and resume to generate your
            personalized analysis.
          </p>
          <a
            href="/onboarding"
            className="inline-flex items-center gap-2 h-12 px-6 rounded-2xl bg-[#1d1d1f] text-white font-semibold hover:opacity-90"
          >
            Complete profile <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </div>
    );
  }

  const resumeUrl = userInfo.resume
    ? assetUrl(userInfo.resume)
    : null;

  // Derive evidence-source completeness from the persisted evidence summary
  // (same mapping the backend uses). Drives the confidence meter + band.
  const es = analysis?.evidenceSummary || {};
  const dataCompleteness = {
    interview: (es.interview || 0) > 0,
    projects: (es.project || 0) > 0,
    resume: (es.resume || 0) > 0 || !!userInfo?.resume,
    certs: (es.certification || 0) > 0,
    roadmap: (es.roadmap || 0) > 0,
  };
  const confidenceBand = getConfidenceBand(dataCompleteness);

  // Tier required skills by their evidence-derived readiness so the headline
  // reflects DEPTH, not mere presence. "Mastered" means genuinely Proficient
  // (readiness ≥ 70) — not "a keyword appeared once". This is exactly why a
  // profile with broad coverage can still sit near ~50% match: most skills are
  // "Developing", not "Mastered". Falls back gracefully if per-skill data is
  // absent on older cached analyses.
  const proficiency = analysis?.skillProficiency || [];
  const hasProficiency = proficiency.length > 0;
  const requiredTotal =
    analysis?.requiredSkills?.length || proficiency.length || 0;
  const readinessOf = (s) => Number(s?.readiness) || 0;
  const masteredSkills = proficiency.filter((s) => readinessOf(s) >= 70);
  const developingSkills = proficiency.filter(
    (s) => readinessOf(s) >= 20 && readinessOf(s) < 70
  );
  const gapSkills = proficiency.filter((s) => readinessOf(s) < 20);
  const masteredCount = hasProficiency
    ? masteredSkills.length
    : analysis?.skillStrengths?.length ?? 0;
  const masteredPct = requiredTotal
    ? Math.round((masteredCount / requiredTotal) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-[#f7f5f2] flex">
      <aside className="w-[270px] bg-white border-r border-[#e8e6e1] h-screen overflow-y-auto px-6 py-8 hidden lg:flex flex-col fixed left-0 top-0">
        <a href="/" className="flex items-center gap-2 mb-12">
          <LogoMark className="w-8 h-8 text-[#1d1d1f]" />
          <span className="text-xl font-bold">Capabl</span>
        </a>

        <div className="space-y-2 flex-1">
          <SidebarLink href="/dashboard" icon={LayoutDashboard} label="Dashboard" active />
          <SidebarLink href="/analyzer" icon={Brain} label="AI Analyzer" />
          <SidebarLink href="/road-map" icon={Route} label="Roadmap" />
          <SidebarLink href="/skill-gap" icon={FileSearch} label="Skill Gap" />
          <SidebarLink href="/resume" icon={FileText} label="Resume" />
          <SidebarLink href="/interview" icon={Video} label="Mock Interview" />
          <SidebarLink href="/projects" icon={FolderKanban} label="Projects" />
          <SidebarLink href="/profile" icon={User} label="Profile" />
          <SidebarLink href="/settings" icon={Settings} label="Settings" />
        </div>

        <button
          onClick={logout}
          className="flex items-center gap-3 px-4 py-3 rounded-2xl text-red-600 hover:bg-red-50 transition-all font-semibold mt-4"
        >
          <LogOut className="w-5 h-5" />
          Logout
        </button>

        <div className="mt-4">
          <ResponsibleAIPanel />
        </div>
      </aside>

      <main className="flex-1 lg:ml-[270px] p-8 lg:p-12">
        <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#1d1d1f] via-[#2a2522] to-[#77410e] text-white p-8 lg:p-10 mb-8">
          <div className="absolute -top-16 -right-10 w-56 h-56 rounded-full bg-[#b89968]/20 blur-3xl" />
          <div className="absolute -bottom-20 right-32 w-48 h-48 rounded-full bg-white/5 blur-3xl" />
          <div className="relative flex items-start justify-between gap-6">
            <div>
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#e7d3b3] bg-white/10 px-3 py-1 rounded-full mb-4">
                <Sparkles className="w-3.5 h-3.5" /> Your career dashboard
              </span>
              <h1 className="text-3xl lg:text-4xl font-bold mb-2">
                Welcome back, {userInfo?.name?.split(" ")[0] || "there"} 👋
              </h1>
              <p className="text-white/70 text-lg font-medium">
                Tracking your path to{" "}
                <span className="text-[#e7d3b3] font-semibold">
                  {analysis?.careerFit || userInfo?.careerGoal || "your goal"}
                </span>
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <div className="hidden sm:block text-right">
                <h3 className="font-semibold text-white">{userInfo?.name}</h3>
                <p className="text-sm text-white/60">Student</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-[#b89968] flex items-center justify-center text-[#1d1d1f] font-bold text-lg ring-2 ring-white/30">
                {(userInfo?.name || "U").charAt(0).toUpperCase()}
              </div>
              <button
                onClick={logout}
                title="Log out"
                className="lg:hidden w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-[1.5fr,1fr] gap-5 mb-6">
          <div className="bg-white border border-[#e8e6e1] rounded-[2rem] p-7">
            <div className="flex items-start gap-5">
              <div className="w-16 h-16 rounded-2xl bg-[#f5f1ea] flex items-center justify-center shrink-0">
                <GraduationCap className="w-8 h-8 text-[#b89968]" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-slate-500 mb-1">
                  Hello {userInfo?.name?.split(" ")[0]}
                </h3>
                <h2 className="text-2xl font-bold text-[#1d1d1f] mb-2">
                  {userInfo?.college || "College not added"}
                </h2>
                <p className="text-slate-500">
                  Career Goal:{" "}
                  <span className="font-semibold text-[#1d1d1f]">
                    {userInfo?.careerGoal}
                  </span>
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white border border-[#e8e6e1] rounded-[2rem] p-7">
            <h3 className="text-sm font-semibold text-slate-500 mb-3">
              Resume
            </h3>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-[#edf3ff] flex items-center justify-center shrink-0">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-[#1d1d1f] truncate">
                  {userInfo?.resumeName || "Resume uploaded"}
                </p>
                <p className="text-xs text-slate-500">
                  Used for AI analysis
                </p>
              </div>
              {resumeUrl && (
                <a
                  href={resumeUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="w-10 h-10 rounded-xl border border-[#e8e6e1] flex items-center justify-center hover:bg-[#f5f1ea]"
                  title="Open resume"
                >
                  <Download className="w-4 h-4" />
                </a>
              )}
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-5 mb-6">
          <div className="bg-white border border-[#e8e6e1] rounded-[2rem] p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
            <div className="flex items-start gap-5">
              <div className="w-16 h-16 rounded-2xl bg-[#e8f8ef] flex items-center justify-center shrink-0">
                <Target className="w-8 h-8 text-green-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-[#1d1d1f] mb-2">
                  Career Readiness Score
                </h3>
                <h2 className="text-4xl font-bold text-green-600 mb-2">
                  {analysis?.readinessScore ?? 0}%{" "}
                  <span className="text-xl font-semibold text-slate-400">
                    ± {confidenceBand}
                  </span>
                </h2>
                <p className="text-slate-500 text-sm">
                  Composite of skills, resume, projects &amp; profile evidence
                </p>
                <ConfidenceMeter dataCompleteness={dataCompleteness} />
              </div>
            </div>
          </div>

          <div className="bg-white border border-[#e8e6e1] rounded-[2rem] p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl flex flex-col justify-between">
            <div>
              <div className="flex items-start gap-5">
                <div className="w-16 h-16 rounded-2xl bg-[#f3ecff] flex items-center justify-center shrink-0">
                  <Brain className="w-8 h-8 text-purple-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-[#1d1d1f] mb-2">
                    Role Match Score
                  </h3>
                  <div className="flex items-center gap-4">
                    <h2 className="text-4xl font-bold text-purple-600">
                      {analysis?.matchScore ?? 0}%
                    </h2>
                    <div className="w-14 h-14 shrink-0 relative flex items-center justify-center">
                      <svg className="w-full h-full transform -rotate-90">
                        <circle
                          cx="28"
                          cy="28"
                          r="22"
                          stroke="#f3ecff"
                          strokeWidth="4.5"
                          fill="transparent"
                        />
                        <circle
                          cx="28"
                          cy="28"
                          r="22"
                          stroke="#9333ea"
                          strokeWidth="4.5"
                          fill="transparent"
                          strokeDasharray="138.23"
                          strokeDashoffset={138.23 - (138.23 * (analysis?.matchScore ?? 0)) / 100}
                          strokeLinecap="round"
                          className="transition-all duration-1000"
                        />
                      </svg>
                    </div>
                  </div>
                  <p className="text-slate-500 text-sm mt-2 truncate">
                    Your skills vs {analysis?.careerFit || "Full Stack Developer"}
                  </p>
                </div>
              </div>

              <div className="space-y-2 mt-4 pt-4 border-t border-[#f7f5f2]">
                <p className="text-xs text-slate-500 mb-2 font-medium">Recruiter Visibility Signals</p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="w-16 text-xs text-slate-500">Resume</span>
                    <div className="flex-1 h-2 rounded-full bg-purple-50 overflow-hidden">
                      <div className="h-full bg-purple-600 rounded-full" style={{ width: `${analysis?.resume?.score ?? 0}%` }} />
                    </div>
                    <span className="text-[10px] text-slate-400 w-8 text-right">{analysis?.resume?.score ?? 0}%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-16 text-xs text-slate-500">GitHub</span>
                    <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div className="h-full bg-slate-800 rounded-full" style={{ width: `${analysis?.github?.score ?? 0}%` }} />
                    </div>
                    <span className="text-[10px] text-slate-400 w-8 text-right">{analysis?.github?.score ?? 0}%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-16 text-xs text-slate-500">LinkedIn</span>
                    <div className="flex-1 h-2 rounded-full bg-blue-50 overflow-hidden">
                      <div className="h-full bg-blue-600 rounded-full" style={{ width: `${analysis?.linkedin?.score ?? 0}%` }} />
                    </div>
                    <span className="text-[10px] text-slate-400 w-8 text-right">{analysis?.linkedin?.score ?? 0}%</span>
                  </div>
                </div>
              </div>
            </div>
            <p className="text-[11px] text-slate-400 mt-4 flex items-start gap-1">
              <Info className="w-3 h-3 mt-0.5 shrink-0" />
              These signals drive recruiter visibility. Your match score reflects skill evidence only.
            </p>
          </div>

          <div className="bg-white border border-[#e8e6e1] rounded-[2rem] p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl flex flex-col justify-between">
            <div>
              <div className="flex items-start gap-5">
                <div className="w-16 h-16 rounded-2xl bg-[#edf3ff] flex items-center justify-center shrink-0">
                  <BarChart3 className="w-8 h-8 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-[#1d1d1f] mb-2">
                    Skills Mastered
                  </h3>
                  <div className="flex items-center gap-4">
                    <h2 className="text-4xl font-bold text-blue-600">
                      {masteredCount}
                      <span className="text-2xl font-semibold text-slate-300">
                        /{requiredTotal || "—"}
                      </span>
                    </h2>
                    <div className="w-14 h-14 shrink-0 relative flex items-center justify-center">
                      <svg className="w-full h-full transform -rotate-90">
                        <circle
                          cx="28"
                          cy="28"
                          r="22"
                          stroke="#edf3ff"
                          strokeWidth="4.5"
                          fill="transparent"
                        />
                        <circle
                          cx="28"
                          cy="28"
                          r="22"
                          stroke="#2563eb"
                          strokeWidth="4.5"
                          fill="transparent"
                          strokeDasharray="138.23"
                          strokeDashoffset={138.23 - (138.23 * masteredPct) / 100}
                          strokeLinecap="round"
                          className="transition-all duration-1000"
                        />
                      </svg>
                    </div>
                  </div>
                  <p className="text-slate-500 text-sm mt-2 truncate">
                    {requiredTotal
                      ? `Proficient in ${masteredCount} of ${requiredTotal} required skills`
                      : "Skills aligned with your goal"}
                  </p>
                </div>
              </div>

              <div className="space-y-2 mt-4 pt-4 border-t border-[#f7f5f2]">
                <p className="text-xs text-slate-500 mb-2 font-medium">Proficiency Breakdown</p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="w-20 text-xs text-slate-500">Proficient</span>
                    <div className="flex-1 h-2 rounded-full bg-green-50 overflow-hidden">
                      <div className="h-full bg-green-500 rounded-full transition-all duration-700" style={{ width: `${requiredTotal ? (masteredSkills.length / requiredTotal) * 100 : 0}%` }} />
                    </div>
                    <span className="text-[10px] text-slate-400 w-8 text-right">{masteredSkills.length}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-20 text-xs text-slate-500">Developing</span>
                    <div className="flex-1 h-2 rounded-full bg-amber-50 overflow-hidden">
                      <div className="h-full bg-amber-500 rounded-full transition-all duration-700" style={{ width: `${requiredTotal ? (developingSkills.length / requiredTotal) * 100 : 0}%` }} />
                    </div>
                    <span className="text-[10px] text-slate-400 w-8 text-right">{developingSkills.length}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-20 text-xs text-slate-500">Gap</span>
                    <div className="flex-1 h-2 rounded-full bg-rose-50 overflow-hidden">
                      <div className="h-full bg-rose-500 rounded-full transition-all duration-700" style={{ width: `${requiredTotal ? (gapSkills.length / requiredTotal) * 100 : 0}%` }} />
                    </div>
                    <span className="text-[10px] text-slate-400 w-8 text-right">{gapSkills.length}</span>
                  </div>
                </div>
              </div>
            </div>
            <p className="text-[11px] text-slate-400 mt-4 flex items-start gap-1">
              <Info className="w-3 h-3 mt-0.5 shrink-0" />
              Mastered = Proficient (≥70% evidence). Developing skills lift your match as you add proof.
            </p>
          </div>
        </div>

        {/* Readiness tabs — Overview / Compare Paths / What-if Simulator (no new route) */}
        <div className="mb-6">
          <div className="inline-flex bg-white border border-[#e8e6e1] rounded-2xl p-1 mb-4">
            <button
              onClick={() => setActiveView("overview")}
              className={
                activeView === "overview"
                  ? "px-4 py-2 rounded-xl bg-[#1d1d1f] text-white text-sm font-semibold"
                  : "px-4 py-2 rounded-xl text-sm font-medium text-slate-500 hover:text-[#1d1d1f]"
              }
            >
              Overview
            </button>
            <button
              onClick={() => setActiveView("compare")}
              className={
                activeView === "compare"
                  ? "px-4 py-2 rounded-xl bg-[#1d1d1f] text-white text-sm font-semibold flex items-center gap-2"
                  : "px-4 py-2 rounded-xl text-sm font-medium text-slate-500 hover:text-[#1d1d1f] flex items-center gap-2"
              }
            >
              <GitBranch className="w-4 h-4" /> Decision Simulator
            </button>
            <button
              onClick={() => setActiveView("simulate")}
              className={
                activeView === "simulate"
                  ? "px-4 py-2 rounded-xl bg-[#1d1d1f] text-white text-sm font-semibold flex items-center gap-2"
                  : "px-4 py-2 rounded-xl text-sm font-medium text-slate-500 hover:text-[#1d1d1f] flex items-center gap-2"
              }
            >
              <Sparkles className="w-4 h-4" /> What-If
            </button>
          </div>

          {activeView === "compare" && (
            <PathComparison
              targetRole={analysis?.careerFit || userInfo?.careerGoal}
            />
          )}

          {activeView === "simulate" && (
            <WhatIfSimulator
              targetRole={analysis?.careerFit || userInfo?.careerGoal}
              skills={analysis?.skillProficiency || []}
              initialScore={analysis?.matchScore ?? 0}
            />
          )}
        </div>

        {hasProficiency ? (
          <div className="bg-white border border-[#e8e6e1] rounded-[2rem] p-6 mb-6">
            <div className="flex items-center justify-between gap-3 mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#edf3ff] flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-blue-600" />
                </div>
                <h2 className="text-xl font-bold text-[#1d1d1f]">Skill Mastery</h2>
              </div>
              <span className="text-xs text-slate-400 hidden sm:block">
                Readiness derived from resume, projects, interview &amp; certs
              </span>
            </div>

            <div className="grid md:grid-cols-3 gap-5">
              {[
                {
                  label: "Proficient",
                  items: masteredSkills,
                  dot: "bg-green-500",
                  chip: "bg-[#e8f8ef] text-green-700",
                  bar: "bg-green-500",
                  empty: "No skills proven at proficient level yet.",
                },
                {
                  label: "Developing",
                  items: developingSkills,
                  dot: "bg-amber-500",
                  chip: "bg-amber-50 text-amber-700",
                  bar: "bg-amber-500",
                  empty: "Nothing in progress right now.",
                },
                {
                  label: "Gap",
                  items: gapSkills,
                  dot: "bg-rose-500",
                  chip: "bg-rose-50 text-rose-600",
                  bar: "bg-rose-500",
                  empty: "No gaps — great coverage!",
                },
              ].map((tier) => (
                <div key={tier.label} className="rounded-2xl border border-[#f0eee9] p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="flex items-center gap-2 text-sm font-semibold text-[#1d1d1f]">
                      <span className={`w-2.5 h-2.5 rounded-full ${tier.dot}`} />
                      {tier.label}
                    </span>
                    <span className="text-sm font-bold text-slate-400">
                      {tier.items.length}
                    </span>
                  </div>
                  {tier.items.length ? (
                    <div className="flex flex-wrap gap-2">
                      {tier.items
                        .slice()
                        .sort((a, b) => readinessOf(b) - readinessOf(a))
                        .map((s) => (
                          <span
                            key={s.name}
                            className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize ${tier.chip}`}
                          >
                            {s.name}
                            <span className="opacity-60"> · {readinessOf(s)}%</span>
                          </span>
                        ))}
                    </div>
                  ) : (
                    <p className="text-slate-400 text-xs">{tier.empty}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="grid lg:grid-cols-2 gap-5 mb-6">
            <div className="bg-white border border-[#e8e6e1] rounded-[2rem] p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-[#e8f8ef] flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                </div>
                <h2 className="text-xl font-bold text-[#1d1d1f]">Skill Strengths</h2>
              </div>
              {analysis?.skillStrengths?.length ? (
                <div className="flex flex-wrap gap-2">
                  {analysis.skillStrengths.map((s) => (
                    <span
                      key={s}
                      className="px-3 py-1.5 rounded-full bg-[#e8f8ef] text-green-700 text-sm font-medium capitalize"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-slate-400 text-sm">
                  Add more skills matching your career goal to see strengths.
                </p>
              )}
            </div>

            <div className="bg-white border border-[#e8e6e1] rounded-[2rem] p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-[#fff2e4] flex items-center justify-center">
                  <Puzzle className="w-5 h-5 text-orange-500" />
                </div>
                <h2 className="text-xl font-bold text-[#1d1d1f]">Skill Gaps</h2>
              </div>
              {analysis?.skillGaps?.length ? (
                <div className="flex flex-wrap gap-2">
                  {analysis.skillGaps.map((s) => (
                    <span
                      key={s}
                      className="px-3 py-1.5 rounded-full bg-[#fff2e4] text-orange-600 text-sm font-medium capitalize"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-slate-400 text-sm">
                  No skill gaps detected — you're on track!
                </p>
              )}
            </div>
          </div>
        )}

        <div className="bg-white border border-[#e8e6e1] rounded-[2rem] p-6 mb-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-[#edf3ff] flex items-center justify-center">
              <User className="w-5 h-5 text-blue-600" />
            </div>
            <h2 className="text-xl font-bold text-[#1d1d1f]">
              Connected Profiles
            </h2>
          </div>
          <ProfileStatus
            profileStatus={analysis?.profileStatus}
            userInfo={userInfo}
            icons={{
              resume: FileText,
              github: GithubIcon,
              linkedin: LinkedinIcon,
            }}
          />
        </div>

        <div className="bg-white border border-[#e8e6e1] rounded-[2rem] p-6 mb-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-[#f3ecff] flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-purple-600" />
            </div>
            <h2 className="text-xl font-bold text-[#1d1d1f]">
              Recommended Next Skills
            </h2>
          </div>
          {analysis?.recommendedSkills?.length ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {analysis.recommendedSkills.map((s) => (
                <div
                  key={s}
                  className="border border-[#e8e6e1] rounded-2xl px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#f5f1ea] flex items-center justify-center">
                      <Sparkles className="w-4 h-4 text-[#b89968]" />
                    </div>
                    <span className="font-medium text-[#1d1d1f] capitalize">
                      {s}
                    </span>
                  </div>
                  <ReasoningPanel reasoning={reasoningMap[String(s).toLowerCase()]} />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-400 text-sm">
              No new skills recommended — you have great coverage.
            </p>
          )}
        </div>

        <div className="bg-white border border-[#e8e6e1] rounded-[2rem] p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-[#fff0f5] flex items-center justify-center">
              <Map className="w-5 h-5 text-pink-500" />
            </div>
            <h2 className="text-xl font-bold text-[#1d1d1f]">
              Personalized Roadmap
            </h2>
          </div>
          {analysis?.roadmap?.length ? (
            <div className="space-y-4">
              {analysis.roadmap.map((w) => (
                <div
                  key={w.week}
                  className="border border-[#e8e6e1] rounded-2xl p-5 flex items-center gap-5 transition-all hover:border-[#b89968] hover:shadow-md"
                >
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#1d1d1f] to-[#77410e] text-white flex items-center justify-center font-bold shrink-0">
                    W{w.week}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-[#1d1d1f] mb-1 capitalize">
                      {w.goal}
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {w.focus.map((f) => (
                        <span
                          key={f}
                          className="px-2.5 py-1 rounded-full bg-[#f5f1ea] text-xs font-medium capitalize"
                        >
                          {f}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-400 text-sm">
              No roadmap available yet.
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
