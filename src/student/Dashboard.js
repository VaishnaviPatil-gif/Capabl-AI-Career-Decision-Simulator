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
  Sparkles,
  ArrowRight,
  Target,
  BarChart3,
  Puzzle,
  ClipboardList,
  Map,
  CheckCircle2,
  Clock3,
  Lock,
  Bell,
  ChevronDown,
  Rocket,
} from "lucide-react";

import { useEffect, useState } from "react";

export default function Dashboard() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    setTimeout(() => {
      setProgress(62);
    }, 300);
  }, []);

  return (
    <div className="min-h-screen bg-[#f7f5f2] flex">
      {/* SIDEBAR */}

      <aside className="w-[270px] bg-white border-r border-[#e8e6e1] min-h-screen px-6 py-8 hidden lg:flex flex-col fixed left-0 top-0">
        {/* LOGO */}

        <a href="/" className="flex items-center gap-2 mb-12">
          <div className="w-8 h-8 rounded-full border-[3px] border-[#1d1d1f] flex items-center justify-center">
            <div className="w-1.5 h-1.5 bg-[#1d1d1f] rounded-full"></div>
          </div>

          <span className="text-xl font-bold">Capabl</span>
        </a>

        {/* NAV */}

        <div className="space-y-2">
          <a
            href="/dashboard"
            className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-[#1d1d1f] text-white font-semibold"
          >
            <LayoutDashboard className="w-5 h-5 text-white" />
            Dashboard
          </a>

          <a
            href="/analyzer"
            className="flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-[#f5f1ea] transition-all font-medium"
          >
            <Brain className="w-5 h-5" />
            AI Analyzer
          </a>

          <a
            href="/road-map"
            className="flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-[#f5f1ea] transition-all font-medium"
          >
            <Route className="w-5 h-5" />
            Roadmap
          </a>

          <a
            href="/skill-gap"
            className="flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-[#f5f1ea] transition-all font-medium"
          >
            <FileSearch className="w-5 h-5" />
            Skill Gap
          </a>

          <a
            href="/resume"
            className="flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-[#f5f1ea] transition-all font-medium"
          >
            <FileText className="w-5 h-5" />
            Resume
          </a>

          <a
            href="/interview"
            className="flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-[#f5f1ea] transition-all font-medium"
          >
            <Video className="w-5 h-5" />
            Mock Interview
          </a>

          <a
            href="/projects"
            className="flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-[#f5f1ea] transition-all font-medium"
          >
            <FolderKanban className="w-5 h-5" />
            Projects
          </a>

          <a
            href="/recommendations"
            className="flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-[#f5f1ea] transition-all font-medium"
          >
            <Bookmark className="w-5 h-5" />
            Recommendations
          </a>

          <a
            href="/profile"
            className="flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-[#f5f1ea] transition-all font-medium"
          >
            <User className="w-5 h-5" />
            Profile
          </a>

          <a
            href="/settings"
            className="flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-[#f5f1ea] transition-all font-medium"
          >
            <Settings className="w-5 h-5" />
            Settings
          </a>
        </div>
      </aside>

      {/* MAIN */}

      <main className="flex-1 lg:ml-[270px] p-8 lg:p-12">
        {/* HEADER */}

        <div className="flex items-start justify-between mb-10">
          <div>
            <h1 className="text-3xl font-bold text-[#1d1d1f] mb-3">
              Welcome back, Reya 👋
            </h1>

            <p className="text-slate-500 text-lg font-medium">
              Ready to take the next step in your career journey?
            </p>
          </div>

          <div className="flex items-center gap-5">
            <button className="h-14 px-8 rounded-2xl bg-[#1d1d1f] text-white flex items-center gap-3 font-semibold hover:opacity-90 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]">
              Start AI Analyzer
              <Sparkles className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <img
                src="https://i.pravatar.cc/100?img=32"
                alt="profile"
                className="w-12 h-12 rounded-full object-cover"
              />

              <div>
                <h3 className="font-semibold text-[#1d1d1f]">
                  Reya Doshi
                </h3>

                <p className="text-sm text-slate-500">Student</p>
              </div>

              <ChevronDown className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* TOP CARDS */}

        <div className="grid lg:grid-cols-3 gap-5 mb-6">
          {/* Readiness */}

          <div className="bg-white border border-[#e8e6e1] rounded-[2rem] p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
            <div className="flex items-start gap-5 mb-6">
              <div className="w-20 h-20 rounded-[1.7rem] bg-[#e8f8ef] flex items-center justify-center">
                <Target className="w-10 h-10 text-green-600" />
              </div>

              <div>
                <h3 className="text-2xl font-semibold mb-3">
                  Readiness Score
                </h3>

                <h2 className="text-4xl font-bold text-green-600 mb-3">
                  78%
                </h2>

                <p className="text-slate-500 font-medium">
                  Your overall career readiness based on AI analysis
                </p>
              </div>
            </div>

            <a
              href="/analyzer"
              className="flex items-center gap-2 font-semibold transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
            >
              View Full
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>

          {/* Match Goals */}

          <div className="bg-white border border-[#e8e6e1] rounded-[2rem] p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
            <div className="flex items-start gap-5 mb-6">
              <div className="w-20 h-20 rounded-[1.7rem] bg-[#f3ecff] flex items-center justify-center">
                <Brain className="w-10 h-10 text-purple-600" />
              </div>

              <div>
                <h3 className="text-2xl font-semibold mb-3">
                  Match Goals
                </h3>

                <h2 className="text-4xl font-bold text-purple-600 mb-3">
                  12
                </h2>

                <p className="text-slate-500 font-medium">
                  Top career & job matches for your goals
                </p>
              </div>
            </div>

            <a
              href="/recommendations"
              className="flex items-center gap-2 font-semibold transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
            >
              View Full
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>

          {/* Skill Strength */}

          <div className="bg-white border border-[#e8e6e1] rounded-[2rem] p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
            <div className="flex items-start gap-5 mb-6">
              <div className="w-20 h-20 rounded-[1.7rem] bg-[#edf3ff] flex items-center justify-center">
                <BarChart3 className="w-10 h-10 text-blue-600" />
              </div>

              <div>
                <h3 className="text-2xl font-semibold mb-3">
                  Skill Strength
                </h3>

                <h2 className="text-4xl font-bold text-blue-600 mb-3">
                  8
                </h2>

                <p className="text-slate-500 font-medium">
                  Strong skills that make you stand out
                </p>
              </div>
            </div>

            <a
              href="/skill-gap"
              className="flex items-center gap-2 font-semibold transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
            >
              View Full
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </div>

        {/* SECOND ROW */}

        <div className="grid lg:grid-cols-3 gap-5 mb-6">
          {/* Skill Gap */}

          <div className="bg-white border border-[#e8e6e1] rounded-[2rem] p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
            <div className="flex items-start gap-5 mb-6">
              <div className="w-20 h-20 rounded-[1.7rem] bg-[#fff2e4] flex items-center justify-center">
                <Puzzle className="w-10 h-10 text-orange-500" />
              </div>

              <div>
                <h3 className="text-2xl font-semibold mb-3">
                  Skill Gap Overview
                </h3>

                <h2 className="text-4xl font-bold text-orange-500 mb-3">
                  5
                </h2>

                <p className="text-slate-500 font-medium">
                  Important skills to learn for your target role
                </p>
              </div>
            </div>

            <a
              href="/skill-gap"
              className="flex items-center gap-2 font-semibold transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
            >
              View Full
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>

          {/* Next Steps */}

          <div className="bg-white border border-[#e8e6e1] rounded-[2rem] p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
            <div className="flex items-start gap-5 mb-6">
              <div className="w-20 h-20 rounded-[1.7rem] bg-[#e8f8f7] flex items-center justify-center">
                <ClipboardList className="w-10 h-10 text-teal-600" />
              </div>

              <div>
                <h3 className="text-2xl font-semibold mb-3">
                  Next Steps
                </h3>

                <h2 className="text-4xl font-bold text-teal-600 mb-3">
                  4
                </h2>

                <p className="text-slate-500 font-medium">
                  Recommended actions to move forward
                </p>
              </div>
            </div>

            <a
              href="/road-map"
              className="flex items-center gap-2 font-semibold transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
            >
              View Full
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>

          {/* Roadmap Progress */}

          <div className="bg-white border border-[#e8e6e1] rounded-[2rem] p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
            <div className="flex items-start gap-5 mb-6">
              <div className="w-20 h-20 rounded-[1.7rem] bg-[#fff0f5] flex items-center justify-center">
                <Map className="w-10 h-10 text-pink-500" />
              </div>

              <div>
                <h3 className="text-2xl font-semibold mb-3">
                  Roadmap Progress
                </h3>

                <h2 className="text-4xl font-bold text-pink-500 mb-3">
                  62%
                </h2>

                <p className="text-slate-500 font-medium">
                  Your learning roadmap completion
                </p>
              </div>
            </div>

            <a
              href="/road-map"
              className="flex items-center gap-2 font-semibold transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
            >
              View Full
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </div>

        {/* LOWER GRID */}

        <div className="grid lg:grid-cols-[1.2fr,1fr] gap-6 mb-6">
          {/* ROADMAP */}

          <div className="bg-white border border-[#e8e6e1] rounded-[2rem] p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-bold">
                Roadmap Progress
              </h2>

              <a
                href="/road-map"
                className="text-blue-600 font-semibold flex items-center gap-2 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
              >
                View Roadmap
                <ArrowRight className="w-4 h-4" />
              </a>
            </div>

            <h3 className="text-2xl font-semibold mb-5">
              Full Stack Developer
            </h3>

            <div className="flex items-center gap-4 mb-10">
              <div className="flex-1 h-4 rounded-full bg-[#ece6dc] overflow-hidden">
                <div
                  className="h-full bg-[#d4a44d] rounded-full transition-all duration-1000 ease-out"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>

              <span className="text-2xl font-bold">
                {progress}%
              </span>
            </div>

            <div className="grid grid-cols-4 gap-5">
              <div>
                <h3 className="text-2xl font-bold">12</h3>
                <p className="text-slate-500">Completed</p>
              </div>

              <div>
                <h3 className="text-2xl font-bold">8</h3>
                <p className="text-slate-500">In Progress</p>
              </div>

              <div>
                <h3 className="text-2xl font-bold">5</h3>
                <p className="text-slate-500">Pending</p>
              </div>

              <div>
                <h3 className="text-2xl font-bold">3</h3>
                <p className="text-slate-500">Locked</p>
              </div>
            </div>
          </div>

          {/* RECENT ACTIVITY */}

          <div className="bg-white border border-[#e8e6e1] rounded-[2rem] p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-bold">
                Recent Activity
              </h2>

              <button className="text-blue-600 font-semibold flex items-center gap-2 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]">
                View All
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-6">
              {[
                {
                  title: "AI Analyzer report generated",
                  desc: "Review your latest analysis",
                  time: "2h ago",
                },
                {
                  title: "Roadmap updated",
                  desc: "3 new milestones added",
                  time: "1d ago",
                },
                {
                  title: "Mock interview completed",
                  desc: "You scored 85%",
                  time: "2d ago",
                },
                {
                  title: "New project added",
                  desc: "Capabl Platform",
                  time: "3d ago",
                },
              ].map((item, index) => (
                <div
                  key={index}
                  className="flex items-start justify-between p-3 rounded-2xl transition-all duration-300 hover:bg-[#faf7f2] hover:-translate-y-1"
                >
                  <div className="flex gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-[#f5f1ea] flex items-center justify-center">
                      <Sparkles className="w-5 h-5 text-[#c89a2b]" />
                    </div>

                    <div>
                      <h3 className="font-semibold mb-1">
                        {item.title}
                      </h3>

                      <p className="text-slate-500">
                        {item.desc}
                      </p>
                    </div>
                  </div>

                  <span className="text-sm text-slate-400">
                    {item.time}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* FOOTER */}

        <div className="bg-[#f8f1e5] border border-[#ece3d3] rounded-[2rem] p-6 flex items-center justify-between">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-white flex items-center justify-center">
              <Rocket className="w-8 h-8 text-[#d4a44d]" />
            </div>

            <div>
              <h2 className="text-2xl font-bold mb-2">
                Small progress leads to big success!
              </h2>

              <p className="text-slate-500 text-lg">
                Keep learning, keep growing. You're doing great!
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}