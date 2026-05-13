import MainLayout from "../layouts/MainLayout";

import {
  Briefcase,
  ArrowRight,
  Calendar,
  Cpu,
  ShieldCheck,
  Zap,
  LayoutGrid,
  Users,
  ClipboardCheck,
  Star,
  BarChart3,
  Mail,
  Settings,
  Award,
  Clock,
  MessageCircle,
  Building2,
  UserCheck,
  TrendingUp,
} from "lucide-react";

export default function Recruiters() {

  return (

    <MainLayout>

      <main className="pt-36 bg-white overflow-hidden">

        {/* HERO */}

        <section className="max-w-7xl mx-auto px-8 grid lg:grid-cols-2 gap-16 items-center mb-24">

          {/* LEFT */}

          <div className="space-y-8">

            <div className="inline-flex items-center gap-2 bg-[#f3ede2] text-[#b89968] px-4 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider">

              <Briefcase className="w-4 h-4" />

              For Recruiters

            </div>

            <h1 className="text-7xl font-extrabold tracking-tight leading-[1.1] text-[#1d1d1f]">

              Find. Assess. Hire.
              <br />
              The right talent.

            </h1>

            <p className="text-lg text-slate-500 font-medium max-w-lg leading-relaxed">

              Capabl helps recruiters discover verified talent, evaluate real skills, and hire with confidence using AI-powered insights and assessments.

            </p>

            <div className="flex flex-wrap gap-4 pt-2">

              <a href="/signup"
                className="bg-[#1d1d1f] text-white px-8 py-4 rounded-2xl font-bold flex items-center gap-3 shadow-xl"
              >

                Post a Job for Free

                <ArrowRight className="w-5 h-5" />

              </a>

              <button className="bg-white border border-[#e8e6e1] px-8 py-4 rounded-2xl font-bold hover:bg-[#f5f1ea] transition-all flex items-center gap-2">

                <Calendar className="w-5 h-5" />

                Book a Demo

              </button>

            </div>

            <div className="flex items-center gap-8 pt-4 flex-wrap">

              <div className="flex items-center gap-2 text-[11px] font-bold text-slate-400 uppercase tracking-widest">

                <Cpu className="w-4 h-4 text-[#b89968]" />

                AI-Powered Matching

              </div>

              <div className="flex items-center gap-2 text-[11px] font-bold text-slate-400 uppercase tracking-widest">

                <ShieldCheck className="w-4 h-4 text-[#b89968]" />

                Verified Skills

              </div>

              <div className="flex items-center gap-2 text-[11px] font-bold text-slate-400 uppercase tracking-widest">

                <Zap className="w-4 h-4 text-[#b89968]" />

                Faster Hiring

              </div>

            </div>

          </div>

          {/* DASHBOARD */}

          <div className="bg-white rounded-[2rem] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.08)] border border-[#e8e6e1] flex h-[580px] overflow-hidden">

            {/* SIDEBAR */}

            <aside className="w-40 border-r border-slate-50 p-6 flex flex-col shrink-0">

              <div className="flex items-center gap-2 mb-8">

                <div className="w-5 h-5 rounded-full border-[2px] border-black flex items-center justify-center">

                  <div className="w-1 h-1 bg-black rounded-full"></div>

                </div>

                <span className="text-xs font-bold">

                  Capabl

                </span>

              </div>

              <div className="space-y-1 text-[10px] font-semibold text-slate-500">

                <div className="bg-[#f3ede2] text-black px-3 py-2 rounded-lg flex items-center gap-2">

                  <LayoutGrid className="w-3.5 h-3.5" />

                  Overview

                </div>

                <div className="px-3 py-2 flex items-center gap-2">

                  <Users className="w-3.5 h-3.5" />

                  Candidates

                </div>

                <div className="px-3 py-2 flex items-center gap-2">

                  <ClipboardCheck className="w-3.5 h-3.5" />

                  Assessments

                </div>

                <div className="px-3 py-2 flex items-center gap-2">

                  <Briefcase className="w-3.5 h-3.5" />

                  Jobs

                </div>

                <div className="px-3 py-2 flex items-center gap-2">

                  <Star className="w-3.5 h-3.5" />

                  Shortlist

                </div>

                <div className="px-3 py-2 flex items-center gap-2">

                  <BarChart3 className="w-3.5 h-3.5" />

                  Analytics

                </div>

                <div className="px-3 py-2 flex items-center gap-2">

                  <Mail className="w-3.5 h-3.5" />

                  Messages

                </div>

                <div className="px-3 py-2 flex items-center gap-2">

                  <Settings className="w-3.5 h-3.5" />

                  Settings

                </div>

              </div>

              <div className="mt-auto pt-4 flex items-center gap-2">

                <img
                  src="https://i.pravatar.cc/150?u=ind_f_1"
                  alt=""
                  className="w-6 h-6 rounded-full"
                />

                <div className="flex flex-col">

                  <span className="text-[8px] font-bold">

                    Sneha Kapoor

                  </span>

                  <span className="text-[7px] text-slate-400">

                    Talent Partner

                  </span>

                </div>

              </div>

            </aside>

            {/* CONTENT */}

            <main className="flex-1 p-6 bg-white overflow-hidden space-y-6">

              <div className="flex justify-between items-center">

                <h3 className="text-sm font-bold">

                  Interview Pipeline

                </h3>

                <div className="flex items-center gap-2 px-2 py-1 border border-slate-100 rounded text-[8px] font-bold text-slate-400">

                  Next 7 Days

                  <Calendar className="w-3 h-3" />

                </div>

              </div>

              {/* STATS */}

              <div className="grid grid-cols-4 gap-3">

                {[
                  ["Screening", "124"],
                  ["Assessments", "86"],
                  ["Interviews", "42"],
                  ["Offers", "12"],
                ].map((item, index) => (

                  <div
                    key={index}
                    className="p-3 bg-slate-50/50 rounded-xl border border-slate-50 text-center"
                  >

                    <p className="text-[7px] font-bold text-slate-400 uppercase">

                      {item[0]}

                    </p>

                    <h4 className="text-sm font-bold">

                      {item[1]}

                    </h4>

                  </div>

                ))}

              </div>

              {/* SCHEDULE */}

              <div className="grid grid-cols-2 gap-4">

                <div className="p-4 border border-slate-50 rounded-2xl">

                  <h4 className="text-[9px] font-bold text-slate-500 uppercase mb-3">

                    Today's Schedule

                  </h4>

                  <div className="space-y-3">

                    <div className="p-2 bg-slate-50 rounded-lg border-l-2 border-[#b89968]">

                      <div className="flex justify-between text-[8px] font-bold">

                        <span>
                          Technical Interview
                        </span>

                        <span>
                          10:30 AM
                        </span>

                      </div>

                      <p className="text-[7px] text-slate-400">

                        Raj Goenka - Senior Dev

                      </p>

                    </div>

                    <div className="p-2 bg-slate-50 rounded-lg border-l-2 border-[#b89968]">

                      <div className="flex justify-between text-[8px] font-bold">

                        <span>
                          System Design
                        </span>

                        <span>
                          02:00 PM
                        </span>

                      </div>

                      <p className="text-[7px] text-slate-400">

                        Priya Sharma - Frontend

                      </p>

                    </div>

                  </div>

                </div>

                {/* GOAL */}

                <div className="p-4 border border-slate-50 rounded-2xl flex flex-col items-center">

                  <h4 className="text-[9px] font-bold text-slate-500 uppercase mb-3 self-start">

                    Hiring Goal

                  </h4>

                  <div className="relative w-20 h-20 flex items-center justify-center">

                    <svg className="w-full h-full -rotate-90">

                      <circle
                        cx="40"
                        cy="40"
                        r="34"
                        fill="transparent"
                        stroke="#f1f5f9"
                        strokeWidth="8"
                      />

                      <circle
                        cx="40"
                        cy="40"
                        r="34"
                        fill="transparent"
                        stroke="#b89968"
                        strokeWidth="8"
                        strokeDasharray="213"
                        strokeDashoffset="60"
                        strokeLinecap="round"
                      />

                    </svg>

                    <div className="absolute inset-0 flex flex-col items-center justify-center">

                      <span className="text-[10px] font-bold">

                        72%

                      </span>

                      <span className="text-[6px] text-slate-400 font-bold">

                        Target

                      </span>

                    </div>

                  </div>

                </div>

              </div>

              {/* INTERVIEW CANDIDATES */}

              <div className="space-y-3">

                <div className="flex justify-between items-center">

                  <h4 className="text-[9px] font-bold text-slate-500 uppercase">

                    Interview Candidates

                  </h4>

                  <span className="text-[8px] font-bold text-[#b89968] cursor-pointer">

                    View Schedule

                  </span>

                </div>

                <div className="space-y-2">

                  {[
                    ["Saurabh", "Full Stack Developer", "95% Match"],
                    ["Priya", "Frontend Developer", "88% Match"],
                  ].map((item, index) => (

                    <div
                      key={index}
                      className="flex items-center justify-between p-2 bg-slate-50/50 rounded-lg text-[8px]"
                    >

                      <div className="flex items-center gap-2 w-1/3">

                        <img
                          src={`https://i.pravatar.cc/150?u=${index}`}
                          alt=""
                          className="w-6 h-6 rounded-full"
                        />

                        <span className="font-bold">

                          {item[0]}

                        </span>

                      </div>

                      <span className="w-1/3 text-slate-400 font-medium">

                        {item[1]}

                      </span>

                      <span className="px-2 py-0.5 bg-green-50 text-green-600 rounded-full font-bold">

                        {item[2]}

                      </span>

                    </div>

                  ))}

                </div>

              </div>

            </main>

          </div>

        </section>

        {/* WHY RECRUITERS */}

        <section className="bg-white py-24">

          <div className="max-w-7xl mx-auto px-8">

            <div className="text-center space-y-6 mb-16">

              <h2 className="text-4xl font-extrabold tracking-tight text-[#1d1d1f]">

                Why Recruiters Choose Capabl

              </h2>

              <p className="text-lg text-slate-500 font-medium max-w-2xl mx-auto leading-relaxed">

                From sourcing to shortlisting, we make hiring smarter, faster, and more reliable.

              </p>

            </div>

            {/* 6 CARDS */}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">

              {[
                {
                  icon: <Users className="w-6 h-6 text-[#b89968]" />,
                  title: "AI-Powered Talent Matching",
                  desc: "Get the best matches based on skills, experience, and role requirements using advanced AI.",
                },

                {
                  icon: <Award className="w-6 h-6 text-[#b89968]" />,
                  title: "Verified Skills & Assessments",
                  desc: "Candidates are evaluated through real skill tests and AI assessments to ensure quality.",
                },

                {
                  icon: <BarChart3 className="w-6 h-6 text-[#b89968]" />,
                  title: "Smart Analytics",
                  desc: "Get powerful insights into candidate pipelines, skill demand, and hiring performance.",
                },

                {
                  icon: <Clock className="w-6 h-6 text-[#b89968]" />,
                  title: "Faster Time-to-Hire",
                  desc: "Automate screening and focus only on the most relevant, job-ready candidates.",
                },

                {
                  icon: <MessageCircle className="w-6 h-6 text-[#b89968]" />,
                  title: "Direct Communication",
                  desc: "Chat with candidates, share updates, and collaborate seamlessly within the platform.",
                },

                {
                  icon: <ShieldCheck className="w-6 h-6 text-[#b89968]" />,
                  title: "Secure & Reliable",
                  desc: "Your data and hiring process are encrypted and protected with enterprise-grade security.",
                },

              ].map((item, index) => (

                <div
                  key={index}
                  className="bg-white border border-[#e8e6e1] rounded-[1.5rem] p-10 space-y-6 hover:-translate-y-[5px] transition-all duration-300 hover:shadow-xl"
                >

                  <div className="w-12 h-12 bg-[#f3ede2] rounded-xl flex items-center justify-center">

                    {item.icon}

                  </div>

                  <h3 className="text-xl font-bold">

                    {item.title}

                  </h3>

                  <p className="text-sm text-slate-500 font-medium leading-relaxed">

                    {item.desc}

                  </p>

                </div>

              ))}

            </div>

          </div>

        </section>

        {/* STATS */}

        <section className="max-w-7xl mx-auto px-8 mb-24 grid grid-cols-2 lg:grid-cols-4 gap-8">

          {[
            ["10K+", "Active Recruiters", <Building2 className="w-8 h-8 text-[#b89968]" />],
            ["50K+", "Jobs Posted", <Briefcase className="w-8 h-8 text-[#b89968]" />],
            ["2M+", "Candidates Evaluated", <UserCheck className="w-8 h-8 text-[#b89968]" />],
            ["70%", "Faster Hiring", <TrendingUp className="w-8 h-8 text-[#b89968]" />],
          ].map((item, index) => (

            <div
              key={index}
              className="flex flex-col items-center text-center p-8 bg-[#f3ede2] rounded-[1.5rem]"
            >

              {item[2]}

              <div className="text-3xl font-extrabold mt-4">

                {item[0]}

              </div>

              <div className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">

                {item[1]}

              </div>

            </div>

          ))}

        </section>

        {/* BOTTOM CTA */}

        <section className="max-w-7xl mx-auto px-8 pb-32">

          <div className="bg-[#f5f1ea] rounded-[3rem] p-12 lg:p-20 flex flex-col lg:flex-row items-center gap-16 border border-[#e8e6e1] overflow-hidden relative">

            {/* LEFT */}

            <div className="flex-1 space-y-8 z-10 text-center lg:text-left">

              <h2 className="text-5xl lg:text-6xl font-extrabold tracking-tight text-[#1d1d1f] leading-tight">

                Ready to build your dream team?

              </h2>

              <p className="text-xl text-slate-500 font-medium max-w-xl mx-auto lg:mx-0">

                Join thousands of recruiters who trust Capabl to find and hire the right talent with AI assessments.

              </p>

              <div className="flex flex-wrap gap-4 justify-center lg:justify-start">

                
<a href="/signup"
                className="bg-[#1d1d1f] text-white px-8 py-4 rounded-2xl font-bold flex items-center gap-3 shadow-xl"
              >

                Post a Job for Free

                <ArrowRight className="w-5 h-5" />

              </a>

                <button className="bg-white border border-[#e8e6e1] px-10 py-4 rounded-2xl font-bold flex items-center gap-2">

                  <Calendar className="w-5 h-5" />

                  Book a Demo

                </button>

              </div>

            </div>

            {/* RIGHT */}

            <div className="relative w-full lg:w-1/2 flex justify-center items-center h-80">

              <div className="relative w-72 h-72">

                {/* CARD 1 */}

                <div className="absolute top-0 left-0 w-40 h-52 bg-white border border-[#e8e6e1] rounded-2xl shadow-xl transform -rotate-6 p-4 flex flex-col items-center gap-3">

                  <img
                    src="https://media.istockphoto.com/id/1987655119/photo/smiling-young-businesswoman-standing-in-the-corridor-of-an-office.jpg?s=612x612&w=0&k=20&c=5N_IVGYsXoyj-H9vEiZUCLqbmmineaemQsKt2NTXGms="
                    alt=""
                    className="w-16 h-16 rounded-full border-2 border-[#f3ede2]"
                  />

                  <div className="text-center">

                    <span className="text-[10px] font-extrabold">

                      Ananya Iyer

                    </span>

                    <p className="text-[8px] text-slate-400 font-medium">

                      Software Engineer

                    </p>

                  </div>

                </div>

                {/* CARD 2 */}

                <div className="absolute top-10 left-20 w-44 h-56 bg-white border border-[#e8e6e1] rounded-2xl shadow-2xl z-20 p-5 flex flex-col items-center gap-4">

                  <div className="relative">

                    <img
                      src="https://static.vecteezy.com/system/resources/thumbnails/045/782/565/small/confident-indian-businessman-in-modern-office-environment-professional-profile-branding-corporate-headshot-photo.jpg"
                      alt=""
                      className="w-20 h-20 rounded-full border-4 border-[#f3ede2]"
                    />

                    <div className="absolute -top-2 -right-2 w-8 h-8 bg-amber-400 rounded-full flex items-center justify-center text-white border-2 border-white shadow-lg">

                      <Award className="w-4 h-4" />

                    </div>

                  </div>

                  <div className="text-center">

                    <span className="text-[12px] font-extrabold">

                      Rohan Mehta

                    </span>

                    <p className="text-[9px] text-slate-400 font-medium">

                      Full Stack Developer

                    </p>

                  </div>

                </div>

              </div>

            </div>

          </div>

        </section>

      </main>

    </MainLayout>
  );
}