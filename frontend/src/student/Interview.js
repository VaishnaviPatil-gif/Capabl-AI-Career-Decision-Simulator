import { useEffect, useRef, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";

import {
  LayoutDashboard,
  Brain,
  Route,
  FileSearch,
  FileText,
  Video,
  FolderKanban,
  Bookmark,
  User,
  Settings,
  PlayCircle,
  CheckCircle2,
  Code2,
  Briefcase,
  MessagesSquare,
  LineChart,
  ArrowRight,
  Loader2,
  X,
  Send,
  Sparkles,
  Award,
  Maximize2,
  History,
  LogOut,
} from "lucide-react";

import logout from "../utils/logout";

const API = "http://localhost:5000";

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

const TOPIC_ICON = {
  technical: Code2,
  behavioral: MessagesSquare,
  "system-design": LineChart,
  dsa: Brain,
  resume: Briefcase,
};

export default function Interview() {
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState(null); // topics/levels/durations from server
  const [history, setHistory] = useState([]);
  const [performance, setPerformance] = useState({
    overallScore: 0,
    interviewsTaken: 0,
    avgScore: 0,
    bestScore: 0,
  });

  // Start-screen picker state
  const [topic, setTopic] = useState("technical");
  const [level, setLevel] = useState("medium");
  const [duration, setDuration] = useState("short");

  // Live session state
  const [session, setSession] = useState(null);
  // session shape:
  //   { id, topic, level, careerFit, totalQuestions,
  //     turns: [{ question, answer, feedback }], current: string }
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);
  const [scorecard, setScorecard] = useState(null);
  const [reviewSession, setReviewSession] = useState(null); // for past session

  const stageRef = useRef(null);
  const textareaRef = useRef(null);

  const authHeaders = () => {
    const token = localStorage.getItem("token");
    return { Authorization: `Bearer ${token}` };
  };

  const fetchMeta = async () => {
    try {
      const { data } = await axios.get(`${API}/api/interviews`, {
        headers: authHeaders(),
      });
      setMeta({
        topics: data.topics,
        levels: data.levels,
        durations: data.durations,
      });
      setHistory(data.sessions || []);
      setPerformance(data.performance || performance);
    } catch (error) {
      console.error(error);
      if (error.response?.status === 401) logout();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMeta();
  }, []);

  // ----- Fullscreen helpers -----
  const enterFullscreen = async () => {
    const el = stageRef.current || document.documentElement;
    try {
      if (el.requestFullscreen) await el.requestFullscreen();
      else if (el.webkitRequestFullscreen) await el.webkitRequestFullscreen();
    } catch {
      /* user may decline — interview still works in-page */
    }
  };
  const exitFullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
    } catch {
      /* ignore */
    }
  };

  // ----- Session lifecycle -----
  const startInterview = async () => {
    setBusy(true);
    try {
      const { data } = await axios.post(
        `${API}/api/interviews/start`,
        { topic, level, duration },
        { headers: authHeaders() }
      );
      setSession({
        id: data.sessionId,
        topic: data.topic,
        level: data.level,
        careerFit: data.careerFit,
        totalQuestions: data.totalQuestions,
        turns: [],
        current: data.question,
        currentIndex: 1,
      });
      setScorecard(null);
      setAnswer("");
      // Defer fullscreen request to after render so the stage div exists
      setTimeout(() => {
        enterFullscreen();
        textareaRef.current?.focus();
      }, 100);
    } catch (e) {
      const msg = e.response?.data?.message || e.message;
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  const submitAnswer = async () => {
    if (!session || !answer.trim() || busy) return;
    const sentAnswer = answer.trim();
    setBusy(true);
    try {
      const { data } = await axios.post(
        `${API}/api/interviews/${session.id}/answer`,
        { answer: sentAnswer },
        { headers: authHeaders() }
      );

      setSession((s) => ({
        ...s,
        turns: [
          ...s.turns,
          {
            question: s.current,
            answer: sentAnswer,
            feedback: data.feedback,
          },
        ],
        current: data.nextQuestion,
        currentIndex: data.questionIndex,
      }));
      setAnswer("");

      if (data.isLast) {
        await finalizeInterview();
      } else {
        textareaRef.current?.focus();
      }
    } catch (e) {
      const msg = e.response?.data?.message || e.message;
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  const finalizeInterview = async () => {
    if (!session) return;
    setBusy(true);
    try {
      const { data } = await axios.post(
        `${API}/api/interviews/${session.id}/finish`,
        {},
        { headers: authHeaders() }
      );
      setScorecard(data);
      await exitFullscreen();
      fetchMeta();
    } catch (e) {
      toast.error(e.response?.data?.message || e.message);
    } finally {
      setBusy(false);
    }
  };

  const abandonInterview = async () => {
    if (!session) return;
    try {
      await axios.post(
        `${API}/api/interviews/${session.id}/finish`,
        {},
        { headers: authHeaders() }
      );
    } catch {
      /* best effort */
    }
    await exitFullscreen();
    setSession(null);
    setScorecard(null);
    setAnswer("");
    fetchMeta();
  };

  const closeScorecard = async () => {
    setScorecard(null);
    setSession(null);
    setAnswer("");
  };

  const openReview = async (id) => {
    try {
      const { data } = await axios.get(`${API}/api/interviews/${id}`, {
        headers: authHeaders(),
      });
      setReviewSession(data);
    } catch (e) {
      toast.error(e.response?.data?.message || e.message);
    }
  };

  // Ctrl/Cmd+Enter to submit
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        submitAnswer();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [answer, session, busy]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f7f5f2] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#b89968]" />
      </div>
    );
  }

  // ============ LIVE INTERVIEW STAGE ============
  if (session && !scorecard) {
    const progress = Math.round(
      ((session.currentIndex - 1) / session.totalQuestions) * 100
    );

    return (
      <div
        ref={stageRef}
        className="fixed inset-0 bg-gradient-to-br from-[#1a1a1f] via-[#2a2520] to-[#1a1a1f] text-white z-50 flex flex-col"
      >
        <div className="px-6 sm:px-10 pt-6 pb-3 flex items-center justify-between gap-4 border-b border-white/10">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-[#c89a2b] flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-wider text-[#c89a2b]">
                Live mock interview
              </p>
              <h2 className="font-bold truncate">
                {session.careerFit} · {session.topic} · {session.level}
              </h2>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-sm text-white/70">
              Question {Math.min(session.currentIndex, session.totalQuestions)} /{" "}
              {session.totalQuestions}
            </span>
            <button
              type="button"
              onClick={abandonInterview}
              className="h-9 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-sm font-semibold flex items-center gap-2"
              title="End interview early"
            >
              <X className="w-4 h-4" />
              End
            </button>
          </div>
        </div>

        <div className="h-1 bg-white/10">
          <div
            className="h-full bg-[#c89a2b] transition-all"
            style={{ width: `${progress}%` }}
          ></div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 sm:px-10 py-6 sm:py-10">
          <div className="max-w-3xl mx-auto space-y-8">
            {session.turns.map((t, i) => (
              <div key={i} className="space-y-3 opacity-70">
                <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                  <p className="text-xs uppercase tracking-wider text-[#c89a2b] mb-2">
                    Q{i + 1}
                  </p>
                  <p className="text-base">{t.question}</p>
                </div>
                <div className="bg-[#c89a2b]/10 border border-[#c89a2b]/30 rounded-2xl p-5">
                  <p className="text-xs uppercase tracking-wider text-[#c89a2b] mb-2">
                    Your answer
                  </p>
                  <p className="text-base whitespace-pre-wrap">{t.answer}</p>
                </div>
                {t.feedback && (
                  <div className="text-sm text-white/60 italic px-3">
                    {t.feedback}
                  </div>
                )}
              </div>
            ))}

            {session.current && (
              <div className="bg-white text-[#1d1d1f] rounded-3xl p-7 shadow-2xl">
                <p className="text-xs uppercase tracking-wider text-[#c89a2b] mb-2">
                  Question {session.currentIndex} of {session.totalQuestions}
                </p>
                <h3 className="text-xl sm:text-2xl font-bold leading-snug">
                  {session.current}
                </h3>
              </div>
            )}
          </div>
        </div>

        <div className="px-6 sm:px-10 py-5 border-t border-white/10 bg-black/30 backdrop-blur">
          <div className="max-w-3xl mx-auto">
            <textarea
              ref={textareaRef}
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              rows={4}
              placeholder="Type your answer here... (Ctrl+Enter to submit)"
              disabled={busy}
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-base text-white placeholder-white/40 focus:outline-none focus:border-[#c89a2b] resize-none disabled:opacity-60"
            />
            <div className="flex items-center justify-between mt-3">
              <p className="text-xs text-white/40">
                {answer.length} characters · Ctrl+Enter to submit
              </p>
              <button
                type="button"
                onClick={submitAnswer}
                disabled={busy || !answer.trim()}
                className="h-11 px-6 rounded-xl bg-[#c89a2b] hover:bg-[#b88a1b] disabled:opacity-50 font-semibold flex items-center gap-2"
              >
                {busy ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                {busy ? "Evaluating..." : "Submit answer"}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============ MAIN PAGE (start screen + history) ============
  return (
    <div className="min-h-screen bg-[#f7f5f2] flex">
      <aside className="w-[270px] bg-white border-r border-[#e8e6e1] min-h-screen px-6 py-8 hidden lg:flex flex-col fixed left-0 top-0">
        <a href="/" className="flex items-center gap-2 mb-12">
          <div className="w-8 h-8 rounded-full border-[3px] border-[#1d1d1f] flex items-center justify-center">
            <div className="w-1.5 h-1.5 bg-[#1d1d1f] rounded-full"></div>
          </div>
          <span className="text-xl font-bold">Capabl</span>
        </a>
        <div className="space-y-2 flex-1">
          <SidebarLink href="/dashboard" icon={LayoutDashboard} label="Dashboard" />
          <SidebarLink href="/analyzer" icon={Brain} label="AI Analyzer" />
          <SidebarLink href="/road-map" icon={Route} label="Roadmap" />
          <SidebarLink href="/skill-gap" icon={FileSearch} label="Skill Gap" />
          <SidebarLink href="/resume" icon={FileText} label="Resume" />
          <SidebarLink href="/interview" icon={Video} label="Mock Interview" active />
          <SidebarLink href="/projects" icon={FolderKanban} label="Projects" />
          <SidebarLink href="/recommendations" icon={Bookmark} label="Recommendations" />
          <SidebarLink href="/profile" icon={User} label="Profile" />
          <SidebarLink href="/settings" icon={Settings} label="Settings" />
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-3 px-4 py-3 rounded-2xl text-red-600 hover:bg-red-50 font-semibold mt-4"
        >
          <LogOut className="w-5 h-5" />
          Logout
        </button>
      </aside>

      <main className="flex-1 lg:ml-[270px] p-6 sm:p-8 lg:p-12 max-w-[1400px] w-full mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-10">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-[#1d1d1f] mb-2">
              AI Mock Interview
            </h1>
            <p className="text-slate-500 text-base sm:text-lg font-medium">
              Live AI interviewer tailored to your career goal. Full-screen
              mode, real evaluation, instant scorecard.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
          <div className="bg-white border border-[#e8e6e1] rounded-[2rem] p-6">
            <Award className="w-9 h-9 text-[#c89a2b] mb-4" />
            <p className="text-sm text-slate-500 mb-1">Best score</p>
            <h2 className="text-3xl font-bold text-[#1d1d1f]">
              {performance.bestScore}
            </h2>
          </div>
          <div className="bg-white border border-[#e8e6e1] rounded-[2rem] p-6">
            <LineChart className="w-9 h-9 text-green-500 mb-4" />
            <p className="text-sm text-slate-500 mb-1">Average</p>
            <h2 className="text-3xl font-bold text-[#1d1d1f]">
              {performance.avgScore}
            </h2>
          </div>
          <div className="bg-white border border-[#e8e6e1] rounded-[2rem] p-6">
            <CheckCircle2 className="w-9 h-9 text-blue-500 mb-4" />
            <p className="text-sm text-slate-500 mb-1">Interviews</p>
            <h2 className="text-3xl font-bold text-[#1d1d1f]">
              {performance.interviewsTaken}
            </h2>
          </div>
          <div className="bg-white border border-[#e8e6e1] rounded-[2rem] p-6">
            <Maximize2 className="w-9 h-9 text-purple-500 mb-4" />
            <p className="text-sm text-slate-500 mb-1">Mode</p>
            <h2 className="text-xl font-bold text-[#1d1d1f]">
              Full-screen live
            </h2>
          </div>
        </div>

        <div className="bg-white border border-[#e8e6e1] rounded-[2rem] p-7 mb-10">
          <h2 className="text-2xl font-bold text-[#1d1d1f] mb-6">
            Start a new interview
          </h2>

          <p className="text-sm font-semibold text-slate-500 mb-3">
            1 · Pick a topic
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-7">
            {(meta?.topics || []).map((t) => {
              const Icon = TOPIC_ICON[t.key] || Code2;
              const active = topic === t.key;
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setTopic(t.key)}
                  className={`text-left p-4 rounded-2xl border-2 transition-all ${
                    active
                      ? "border-[#c89a2b] bg-[#fff8ec]"
                      : "border-[#ece4d4] hover:border-[#c89a2b]/40 bg-white"
                  }`}
                >
                  <Icon
                    className={`w-6 h-6 mb-2 ${
                      active ? "text-[#c89a2b]" : "text-slate-500"
                    }`}
                  />
                  <h3 className="font-semibold text-[#1d1d1f]">{t.label}</h3>
                  <p className="text-xs text-slate-500 mt-1">{t.description}</p>
                </button>
              );
            })}
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-7">
            <div>
              <p className="text-sm font-semibold text-slate-500 mb-3">
                2 · Difficulty
              </p>
              <div className="flex gap-2">
                {(meta?.levels || ["easy", "medium", "hard"]).map((l) => (
                  <button
                    key={l}
                    type="button"
                    onClick={() => setLevel(l)}
                    className={`flex-1 h-11 rounded-xl border-2 font-semibold capitalize transition-all ${
                      level === l
                        ? "border-[#c89a2b] bg-[#fff8ec] text-[#c89a2b]"
                        : "border-[#ece4d4] bg-white text-slate-600 hover:border-[#c89a2b]/40"
                    }`}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-500 mb-3">
                3 · Duration
              </p>
              <div className="flex gap-2">
                {(meta?.durations || []).map((d) => (
                  <button
                    key={d.key}
                    type="button"
                    onClick={() => setDuration(d.key)}
                    className={`flex-1 h-11 rounded-xl border-2 font-semibold capitalize transition-all px-2 text-sm ${
                      duration === d.key
                        ? "border-[#c89a2b] bg-[#fff8ec] text-[#c89a2b]"
                        : "border-[#ece4d4] bg-white text-slate-600 hover:border-[#c89a2b]/40"
                    }`}
                  >
                    {d.key} · {d.totalQuestions}q
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={startInterview}
            disabled={busy}
            className="w-full h-14 rounded-2xl bg-[#1d1d1f] text-white font-bold text-lg flex items-center justify-center gap-3 hover:opacity-90 disabled:opacity-60"
          >
            {busy ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <PlayCircle className="w-6 h-6" />
            )}
            {busy ? "Starting..." : "Start full-screen interview"}
          </button>
          <p className="text-xs text-slate-400 text-center mt-3">
            Your browser will request full-screen — you can press Esc anytime to
            exit.
          </p>
        </div>

        <div className="bg-white border border-[#e8e6e1] rounded-[2rem] p-7">
          <div className="flex items-center gap-3 mb-6">
            <History className="w-5 h-5 text-slate-500" />
            <h2 className="text-2xl font-bold text-[#1d1d1f]">
              Past interviews
            </h2>
          </div>
          {history.length === 0 ? (
            <p className="text-slate-400 text-sm">
              No interviews yet — start one above.
            </p>
          ) : (
            <div className="space-y-3">
              {history.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => s.status === "finished" && openReview(s.id)}
                  className="w-full flex flex-wrap items-center gap-4 p-4 rounded-2xl border border-[#f1ede5] hover:bg-[#fffaf0] transition-all text-left"
                >
                  <div className="flex-1 min-w-[150px]">
                    <h3 className="font-semibold text-[#1d1d1f] capitalize">
                      {s.topic} · {s.level}
                    </h3>
                    <p className="text-xs text-slate-500">
                      {new Date(s.startedAt).toLocaleString()}
                    </p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${
                      s.status === "finished"
                        ? "bg-[#e7f7ea] text-green-700"
                        : s.status === "abandoned"
                        ? "bg-[#fff0ed] text-red-600"
                        : "bg-[#fff3df] text-[#c89a2b]"
                    }`}
                  >
                    {s.status}
                  </span>
                  {s.score != null && (
                    <span className="font-bold text-[#1d1d1f]">
                      {s.score}/100
                    </span>
                  )}
                  {s.status === "finished" && (
                    <ArrowRight className="w-4 h-4 text-slate-400" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* ============ SCORECARD MODAL ============ */}
      {scorecard && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-[2rem] max-w-2xl w-full p-8 my-8">
            <div className="flex items-start justify-between mb-6">
              <div>
                <p className="text-xs uppercase tracking-wider text-[#c89a2b] mb-1">
                  Interview complete
                </p>
                <h2 className="text-3xl font-bold text-[#1d1d1f]">
                  Your scorecard
                </h2>
              </div>
              <button
                onClick={closeScorecard}
                className="w-10 h-10 rounded-full hover:bg-slate-100 flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center justify-center mb-6">
              <div className="w-40 h-40 rounded-full bg-gradient-to-br from-[#c89a2b] to-[#77410e] flex items-center justify-center text-white">
                <div className="text-center">
                  <h2 className="text-6xl font-bold">{scorecard.score}</h2>
                  <p className="text-xs opacity-80">out of 100</p>
                </div>
              </div>
            </div>

            {scorecard.summary && (
              <p className="text-center text-slate-600 mb-6">
                {scorecard.summary}
              </p>
            )}

            <div className="grid sm:grid-cols-2 gap-4 mb-6">
              <div className="bg-[#f4fbf6] border border-green-200 rounded-2xl p-4">
                <h3 className="font-semibold text-green-700 mb-2">
                  Strengths
                </h3>
                <ul className="text-sm text-slate-700 space-y-1 list-disc pl-5">
                  {(scorecard.strengths || []).map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>
              <div className="bg-[#fff0ed] border border-red-200 rounded-2xl p-4">
                <h3 className="font-semibold text-red-700 mb-2">
                  Areas to improve
                </h3>
                <ul className="text-sm text-slate-700 space-y-1 list-disc pl-5">
                  {(scorecard.weaknesses || []).map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>
            </div>

            {(scorecard.advice || []).length > 0 && (
              <div className="bg-[#f4efff] border border-purple-200 rounded-2xl p-4 mb-6">
                <h3 className="font-semibold text-purple-700 mb-2">
                  Next steps
                </h3>
                <ul className="text-sm text-slate-700 space-y-1 list-disc pl-5">
                  {scorecard.advice.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>
            )}

            <button
              type="button"
              onClick={closeScorecard}
              className="w-full h-12 rounded-xl bg-[#1d1d1f] text-white font-semibold"
            >
              Back to interviews
            </button>
          </div>
        </div>
      )}

      {/* ============ REVIEW MODAL ============ */}
      {reviewSession && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-[2rem] max-w-3xl w-full p-8 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between mb-6">
              <div>
                <p className="text-xs uppercase tracking-wider text-[#c89a2b] mb-1">
                  Past interview · {reviewSession.topic} ·{" "}
                  {reviewSession.level}
                </p>
                <h2 className="text-2xl font-bold text-[#1d1d1f]">
                  Score: {reviewSession.score ?? "—"}/100
                </h2>
              </div>
              <button
                onClick={() => setReviewSession(null)}
                className="w-10 h-10 rounded-full hover:bg-slate-100 flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {reviewSession.summary && (
              <p className="text-slate-600 mb-5">{reviewSession.summary}</p>
            )}

            <div className="space-y-4 mb-6">
              {(reviewSession.transcript || [])
                .filter((t) => t.answer)
                .map((t, i) => (
                  <div
                    key={i}
                    className="border border-[#f1ede5] rounded-2xl p-4"
                  >
                    <p className="text-xs uppercase tracking-wider text-[#c89a2b] mb-1">
                      Q{i + 1}
                    </p>
                    <p className="font-semibold text-[#1d1d1f] mb-2">
                      {t.question}
                    </p>
                    <p className="text-sm text-slate-600 mb-2 whitespace-pre-wrap">
                      {t.answer}
                    </p>
                    {t.feedback && (
                      <p className="text-xs text-slate-500 italic">
                        AI feedback: {t.feedback}
                      </p>
                    )}
                  </div>
                ))}
            </div>

            <button
              type="button"
              onClick={() => setReviewSession(null)}
              className="w-full h-12 rounded-xl bg-[#1d1d1f] text-white font-semibold"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
