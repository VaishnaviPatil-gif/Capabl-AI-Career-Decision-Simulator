import { useEffect, useState } from "react";
import axios from "axios";
import {
  Loader2,
  TrendingUp,
  Clock,
  AlertTriangle,
  Lightbulb,
  CheckCircle2,
  ArrowRight,
  GitBranch,
  Target,
} from "lucide-react";
import { apiUrl } from "../config/api";
import { WeeklyPlanCard } from "./WhatIfSimulator";

// Visual accent per path key — kept deterministic so a path always looks the
// same across renders.
const PATH_THEME = {
  "quick-wins": { dot: "bg-green-500", ring: "#22c55e", chip: "bg-[#e8f8ef] text-green-700" },
  "critical-gaps": { dot: "bg-rose-500", ring: "#f43f5e", chip: "bg-rose-50 text-rose-600" },
  "balanced-sprint": { dot: "bg-blue-500", ring: "#3b82f6", chip: "bg-blue-50 text-blue-600" },
};
const fallbackTheme = { dot: "bg-slate-400", ring: "#94a3b8", chip: "bg-slate-100 text-slate-600" };

export default function PathComparison({ targetRole }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [chosen, setChosen] = useState(null); // path key the user committed to
  const [plan, setPlan] = useState(null);
  const [committing, setCommitting] = useState(null); // path key mid-commit

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        setError(null);
        const token = localStorage.getItem("token");
        const { data } = await axios.post(
          apiUrl("/api/whatif/compare"),
          { targetRole },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setData(data);
      } catch (e) {
        setError(
          e?.response?.data?.error ||
            "Couldn't build path comparison. Run your AI analysis first."
        );
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [targetRole]);

  const choosePath = async (path) => {
    try {
      setCommitting(path.key);
      setError(null);
      const token = localStorage.getItem("token");
      const { data: planData } = await axios.post(
        apiUrl("/api/goals/commit"),
        {
          targetRole: data?.targetRole || targetRole,
          skillsToFocus: path.skills.map((s) => s.name),
          weekStartDate: new Date().toISOString().slice(0, 10),
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setPlan(planData);
      setChosen(path.key);
    } catch (e) {
      setError("Couldn't lock in that path. Try again.");
    } finally {
      setCommitting(null);
    }
  };

  if (loading) {
    return (
      <div className="bg-white border border-[#e8e6e1] rounded-[2rem] p-10 flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-[#b89968]" />
        <p className="text-slate-500 text-sm">Modeling your paths and tradeoffs…</p>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="bg-white border border-[#e8e6e1] rounded-[2rem] p-8 text-center">
        <AlertTriangle className="w-8 h-8 text-orange-500 mx-auto mb-3" />
        <p className="text-slate-600">{error}</p>
      </div>
    );
  }

  const paths = data?.paths || [];
  const band = data?.confidenceBand ?? 15;

  if (!paths.length) {
    return (
      <div className="bg-white border border-[#e8e6e1] rounded-[2rem] p-8 text-center">
        <CheckCircle2 className="w-8 h-8 text-green-600 mx-auto mb-3" />
        <p className="text-slate-600">
          No major gaps to weigh — your evidence already covers this role well.
        </p>
      </div>
    );
  }

  const chosenPath = paths.find((p) => p.key === chosen);

  return (
    <div className="space-y-5">
      {/* Decision framing — the brief's "clear decision moment" + human-in-loop */}
      <div className="bg-white border border-[#e8e6e1] rounded-[2rem] p-6">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#f3ecff] flex items-center justify-center shrink-0">
            <GitBranch className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wider text-purple-600 font-semibold mb-1">
              Career Decision Simulator
            </p>
            <h2 className="text-xl font-bold text-[#1d1d1f]">
              Which path should you take?
            </h2>
            <p className="text-slate-500 text-sm mt-1">
              Three strategies toward{" "}
              <span className="font-semibold text-[#1d1d1f]">
                {data?.targetRole || targetRole}
              </span>
              , modeled from your current evidence. Projections carry a{" "}
              <span className="font-semibold">±{band}%</span> uncertainty band —
              they're decision inputs, not guarantees.{" "}
              <span className="text-[#b89968] font-medium">You decide; Capabl won't pick for you.</span>
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600">
          <AlertTriangle className="w-4 h-4" /> {error}
        </div>
      )}

      {/* Side-by-side path cards */}
      <div className="grid md:grid-cols-3 gap-5 items-stretch">
        {paths.map((path) => {
          const theme = PATH_THEME[path.key] || fallbackTheme;
          const isChosen = chosen === path.key;
          const dimmed = chosen && !isChosen;
          return (
            <div
              key={path.key}
              className={
                "bg-white border rounded-[2rem] p-6 flex flex-col transition-all " +
                (isChosen
                  ? "border-[#1d1d1f] shadow-lg"
                  : dimmed
                  ? "border-[#e8e6e1] opacity-60"
                  : "border-[#e8e6e1] hover:-translate-y-1 hover:shadow-xl")
              }
            >
              <div className="flex items-center gap-2 mb-1">
                <span className={`w-2.5 h-2.5 rounded-full ${theme.dot}`} />
                <h3 className="text-lg font-bold text-[#1d1d1f]">{path.title}</h3>
              </div>
              <p className="text-sm text-slate-500 mb-4">{path.approach}</p>

              {/* Projected outcome */}
              <div className="flex items-end gap-3 mb-4">
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-slate-400 font-semibold">
                    Projected match
                  </p>
                  <p className="text-3xl font-bold text-[#1d1d1f]">
                    {path.projectedScore}%
                  </p>
                </div>
                {path.delta > 0 && (
                  <span className="mb-1 px-2 py-1 rounded-full bg-[#e8f8ef] text-green-700 text-sm font-semibold flex items-center gap-1">
                    <TrendingUp className="w-3.5 h-3.5" /> +{path.delta}%
                  </span>
                )}
              </div>

              {/* Effort */}
              <div className="flex items-center gap-2 text-sm text-slate-600 mb-4">
                <Clock className="w-4 h-4 text-slate-400" />
                <span className="font-medium">~{path.effortWeeks} week{path.effortWeeks > 1 ? "s" : ""}</span>
                <span className="text-slate-400">· {path.skills.length} skill{path.skills.length > 1 ? "s" : ""}</span>
              </div>

              {/* Skills */}
              <div className="flex flex-wrap gap-1.5 mb-4">
                {path.skills.map((s) => (
                  <span
                    key={s.name}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize ${theme.chip}`}
                  >
                    {s.name}
                    <span className="opacity-60"> · {s.readiness}%</span>
                  </span>
                ))}
              </div>

              {/* Tradeoff — the hidden cost of this path */}
              <div className="rounded-2xl bg-[#fff7ed] border border-orange-100 px-3 py-2.5 mb-3">
                <p className="text-xs text-orange-700 flex items-start gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  <span><span className="font-semibold">Tradeoff: </span>{path.tradeoff}</span>
                </p>
              </div>

              {/* Hidden consideration — honest caveat */}
              <div className="rounded-2xl bg-[#f7f5f2] px-3 py-2.5 mb-3">
                <p className="text-xs text-slate-600 flex items-start gap-1.5">
                  <Lightbulb className="w-3.5 h-3.5 mt-0.5 shrink-0 text-[#b89968]" />
                  <span>{path.consideration}</span>
                </p>
              </div>

              {/* Why this path — explicit positive rationale */}
              {path.rationale && (
                <div className="flex items-start gap-1.5 mb-5">
                  <Target className="w-3.5 h-3.5 mt-0.5 shrink-0 text-green-600" />
                  <p className="text-xs text-[#1d1d1f]">
                    <span className="font-semibold">Why this path: </span>
                    {path.rationale}
                  </p>
                </div>
              )}

              {/* Decision button */}
              <button
                onClick={() => choosePath(path)}
                disabled={!!committing || (chosen && !isChosen)}
                className={
                  "mt-auto w-full h-11 rounded-2xl font-semibold flex items-center justify-center gap-2 transition-all " +
                  (isChosen
                    ? "bg-[#e8f8ef] text-green-700"
                    : chosen
                    ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                    : "bg-[#1d1d1f] text-white hover:opacity-90")
                }
              >
                {committing === path.key ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Building plan…
                  </>
                ) : isChosen ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" /> This is my path
                  </>
                ) : (
                  <>
                    Choose this path <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* Committed plan */}
      {chosen && plan && (
        <div className="bg-white border border-[#e8e6e1] rounded-[2rem] p-6">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            <h3 className="text-lg font-bold text-[#1d1d1f]">
              Your 7-day plan — {chosenPath?.title}
            </h3>
          </div>
          <WeeklyPlanCard plan={plan} />
          <button
            onClick={() => {
              setChosen(null);
              setPlan(null);
            }}
            className="mt-4 w-full h-11 rounded-2xl border border-[#e8e6e1] text-[#1d1d1f] font-semibold hover:bg-[#f5f1ea] transition-all"
          >
            Compare paths again
          </button>
        </div>
      )}
    </div>
  );
}
