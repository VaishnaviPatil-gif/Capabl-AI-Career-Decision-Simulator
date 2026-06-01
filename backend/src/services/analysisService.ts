import {
  extractResumeText,
  analyzeResumeText,
} from "./resumeService.js";
import {
  fetchGithubProfile,
  scoreGithub,
  scoreLinkedIn,
} from "./socialService.js";
import { resourcesForSkill } from "./skillResources.js";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// ---------------------------------------------------------------------------
// Domain types
// ---------------------------------------------------------------------------

type SkillSource = "manual" | "resume" | "profile";
type StageStatus = "locked" | "active" | "completed";

interface RoadmapSkill {
  name: string;
  known: boolean;
  source: SkillSource | null;
  resources: ReturnType<typeof resourcesForSkill>;
}

interface RoadmapStage {
  stage: string;
  title: string;
  skills: RoadmapSkill[];
  knownSkills: string[];
  gapSkills: string[];
  knownCount: number;
  total: number;
  progress: number;
  status: StageStatus;
}

interface WeeklyTask {
  key: string;
  label: string;
  done: boolean;
}

interface WeeklyPlan {
  week: number;
  title: string;
  focus: string[];
  tasks: WeeklyTask[];
  goal: string;
}

interface WeeklyDoneEntry {
  week: number;
  taskKey: string;
}

interface SkillSets {
  resumeSet: Set<string>;
  profileSet: Set<string>;
  manualSet: Set<string>;
}

interface ResumeAnalysis {
  ok: boolean;
  resumeScore: number;
  atsScore: number;
  foundSkills: string[];
  missingKeywords: string[];
  sectionsFound: string[];
  wordCount: number;
  contact: Record<string, string>;
  breakdown?: unknown;
}

interface GithubProfile {
  ok: boolean;
  reason?: string;
  ownRepoCount?: number;
  totalStars?: number;
  languageBytes?: Record<string, number>;
}

interface GithubScoreResult {
  score: number;
  breakdown?: unknown;
  languagesMatched?: string[];
}

interface LinkedInScoreResult {
  score: number;
  ok?: boolean;
  reason?: string;
}

interface StrengthEntry {
  title: string;
  description: string;
  status: string;
  color: string;
}

interface SuggestionEntry {
  title: string;
  description: string;
}

interface SkillProficiencyEntry {
  name: string;
  level: "Confident" | "Practising" | "Beginner";
  currentPct: number;
  targetPct: number;
  gapPct: number;
  evidence: string[];
  known: boolean;
}

// What Gemini returns for role intelligence
interface RoleIntelligence {
  normalizedTitle: string;         // clean job title e.g. "AI Applications Developer"
  requiredSkills: string[];        // 10-14 skills this role actually needs
  roadmapStages: {
    title: string;                 // stage name e.g. "Foundations"
    skills: string[];              // 3-4 skills in this stage
  }[];
}

interface CachedRoleIntelligence {
  goalSnapshot?: string | null;
  requiredSkills?: string[] | null;
  roleIntelligence?: unknown;
}

interface RunAnalysisInput {
  user?: {
    college?: string;
    bio?: string;
    github?: string;
    linkedin?: string;
    age?: number | string;
    careerGoal?: string;
  };
  skills?: string[];
  careerGoal?: string;
  resumePath?: string;
  githubUrl?: string;
  linkedinUrl?: string;
  manualSkills?: string[];
  weeklyProgress?: WeeklyDoneEntry[];
  resumeText?: string; // optional pre-extracted text (avoids double extraction)
  cachedRoleIntelligence?: CachedRoleIntelligence;
}

interface RunAnalysisResult {
  careerFit: string;
  readinessScore: number;
  matchScore: number;
  profileCompleteness: number;
  skillCountScore: number;
  skillStrengths: string[];
  skillGaps: string[];
  recommendedSkills: string[];
  extractedSkills: string[];
  requiredSkills: string[];
  roleIntelligence: RoleIntelligence;
  roleGoalSnapshot: string;
  skillProficiency: SkillProficiencyEntry[];
  roadmap: WeeklyPlan[];
  roadmapStages: RoadmapStage[];
  resume: {
    score: number;
    atsScore: number;
    foundSkills: string[];
    missingKeywords: string[];
    sectionsFound: string[];
    wordCount: number;
    contact: Record<string, string>;
    ok: boolean;
    breakdown?: unknown;
  };
  github: {
    score: number;
    breakdown?: unknown;
    languagesMatched?: string[];
    profile: GithubProfile;
  };
  linkedin: LinkedInScoreResult;
  recruiterVisibility: number;
  strengthsText: StrengthEntry[];
  aiSuggestions: SuggestionEntry[];
}

// ---------------------------------------------------------------------------
// Skill normalisation
// ---------------------------------------------------------------------------

const SKILL_ALIASES: Record<string, string> = {
  js: "javascript",
  ts: "typescript",
  reactjs: "react",
  "react.js": "react",
  nodejs: "node.js",
  "node js": "node.js",
  expressjs: "express",
  "express.js": "express",
  postgres: "postgresql",
  psql: "postgresql",
  mongo: "mongodb",
  rest: "rest api",
  "restful api": "rest api",
  "restful apis": "rest api",
  ml: "machine learning",
  tf: "tensorflow",
  tw: "tailwind",
  tailwindcss: "tailwind css",
  k8s: "kubernetes",
  cicd: "ci/cd",
  "ci cd": "ci/cd",
  llm: "llm integration",
  gpt: "openai api",
  "gpt-4": "openai api",
  "socket.io": "websockets",
  socketio: "websockets",
  "next.js": "next.js",
  nextjs: "next.js",
  "react native": "react native",
  dsa: "data structures & algorithms",
};

function normaliseSkill(raw: unknown): string {
  if (!raw) return "";
  const s = String(raw).toLowerCase().trim();
  return SKILL_ALIASES[s] ?? s;
}

function skillsMatch(a: string, b: string): boolean {
  const na = normaliseSkill(a);
  const nb = normaliseSkill(b);
  return na === nb || na.includes(nb) || nb.includes(na);
}

function userHasSkill(skill: string, userSkills: Set<string>): boolean {
  const ns = normaliseSkill(skill);
  for (const us of userSkills) {
    if (skillsMatch(ns, us)) return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// Gemini: dynamically determine role requirements from career goal + resume
// ---------------------------------------------------------------------------

async function getRoleIntelligence(
  careerGoal: string,
  resumeText: string,
  existingSkills: string[],
  cached?: CachedRoleIntelligence
): Promise<RoleIntelligence> {
  if (
    cached?.goalSnapshot === careerGoal &&
    cached?.requiredSkills?.length &&
    cached?.roleIntelligence
  ) {
    const cachedRole = cached.roleIntelligence as RoleIntelligence;
    if (
      cachedRole.normalizedTitle &&
      Array.isArray(cachedRole.roadmapStages) &&
      Array.isArray(cachedRole.requiredSkills)
    ) {
      return {
        ...cachedRole,
        requiredSkills: cached.requiredSkills,
      };
    }
  }

  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const prompt = `
You are a senior technical recruiter and career coach.

A student has the following career goal: "${careerGoal}"

Their resume content (first 2000 chars):
${resumeText.slice(0, 2000)}

Their listed skills: ${existingSkills.slice(0, 20).join(", ")}

Based on their ACTUAL career goal and resume context, determine:
1. The normalised job title for their goal (be specific, e.g. "AI Applications Developer" not just "Developer")
2. Exactly 12 skills that are ACTUALLY required for this specific role in the current job market (2024-2026)
   - Match skills to the REAL role, not a generic template
   - If they want to build AI-powered apps with LLMs: include llm integration, prompt engineering, etc.
   - If they want ML/data science: include python, pytorch, etc.
   - Be realistic about what companies hiring for this role actually test
3. A 5-stage learning roadmap for this specific role, each stage with 3-4 skills

Respond ONLY with valid JSON (no markdown, no backticks, no explanation):
{
  "normalizedTitle": "string",
  "requiredSkills": ["skill1", "skill2", ...12 skills],
  "roadmapStages": [
    { "title": "Foundations", "skills": ["skill1", "skill2", "skill3"] },
    { "title": "Core Skills", "skills": ["skill1", "skill2", "skill3"] },
    { "title": "Advanced Skills", "skills": ["skill1", "skill2", "skill3"] },
    { "title": "Real World Projects", "skills": ["skill1", "skill2", "skill3"] },
    { "title": "Placement Ready", "skills": ["system design", "interview prep", "portfolio"] }
  ]
}

Rules:
- Use lowercase skill names consistently
- Skills must reflect the actual 2024-2026 job market for this exact role
- Do NOT use generic templates — analyse the career goal carefully
- requiredSkills must total exactly 12
`;

  try {
    const response = await model.generateContent(prompt);
    const raw = response.response.text().trim();
    const cleaned = raw.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleaned) as RoleIntelligence;

    // Validate shape — fall back gracefully if Gemini returns unexpected format
    if (
      !parsed.normalizedTitle ||
      !Array.isArray(parsed.requiredSkills) ||
      parsed.requiredSkills.length < 5 ||
      !Array.isArray(parsed.roadmapStages)
    ) {
      throw new Error("Invalid shape from Gemini");
    }

    return parsed;
  } catch (err) {
    // Graceful fallback: derive from careerGoal string only
    console.warn("getRoleIntelligence fallback triggered:", err);
    return getFallbackRoleIntelligence(careerGoal);
  }
}

// ---------------------------------------------------------------------------
// Fallback if Gemini fails (no hardcoded role map — derives from goal text)
// ---------------------------------------------------------------------------

function getFallbackRoleIntelligence(careerGoal: string): RoleIntelligence {
  const goal = careerGoal.toLowerCase();

  // Detect broad category from goal text only
  const isAIApps =
    goal.includes("llm") ||
    goal.includes("ai app") ||
    goal.includes("ai application") ||
    goal.includes("ai product") ||
    goal.includes("generative");

  const isMLEngineer =
    !isAIApps &&
    (goal.includes("machine learning") ||
      goal.includes("ml engineer") ||
      goal.includes("deep learning") ||
      goal.includes("data scientist"));

  const isDevOps =
    goal.includes("devops") ||
    goal.includes("cloud") ||
    goal.includes("platform engineer") ||
    goal.includes("sre");

  const isMobile =
    goal.includes("mobile") ||
    goal.includes("android") ||
    goal.includes("ios") ||
    goal.includes("flutter");

  const isData =
    !isMLEngineer &&
    (goal.includes("data analyst") ||
      goal.includes("data engineer") ||
      goal.includes("analytics"));

  const isFrontend =
    !isAIApps &&
    !isMLEngineer &&
    (goal.includes("frontend") || goal.includes("front-end") || goal.includes("ui "));

  const isBackend =
    !isAIApps &&
    !isMLEngineer &&
    (goal.includes("backend") || goal.includes("back-end") || goal.includes("server"));

  if (isAIApps) {
    return {
      normalizedTitle: "AI Applications Developer",
      requiredSkills: [
        "javascript", "typescript", "react", "node.js", "express",
        "rest api", "llm integration", "prompt engineering",
        "openai api", "websockets", "docker", "git",
      ],
      roadmapStages: [
        { title: "Foundations", skills: ["javascript", "typescript", "git"] },
        { title: "Backend & APIs", skills: ["node.js", "express", "rest api"] },
        { title: "LLM Integration", skills: ["llm integration", "prompt engineering", "openai api"] },
        { title: "Real-Time & Deployment", skills: ["websockets", "docker"] },
        { title: "Placement Ready", skills: ["system design", "interview prep", "portfolio"] },
      ],
    };
  }

  if (isMLEngineer) {
    return {
      normalizedTitle: "Machine Learning Engineer",
      requiredSkills: [
        "python", "numpy", "pandas", "scikit-learn", "machine learning",
        "deep learning", "tensorflow", "pytorch", "statistics", "sql",
        "data visualization", "git",
      ],
      roadmapStages: [
        { title: "Foundations", skills: ["python", "statistics", "git"] },
        { title: "Data Stack", skills: ["numpy", "pandas", "sql"] },
        { title: "Machine Learning", skills: ["scikit-learn", "machine learning"] },
        { title: "Deep Learning", skills: ["tensorflow", "pytorch", "deep learning"] },
        { title: "Placement Ready", skills: ["system design", "interview prep", "portfolio"] },
      ],
    };
  }

  if (isDevOps) {
    return {
      normalizedTitle: "DevOps Engineer",
      requiredSkills: [
        "linux", "bash", "docker", "kubernetes", "aws",
        "terraform", "ci/cd", "git", "monitoring", "python",
        "networking", "security",
      ],
      roadmapStages: [
        { title: "Foundations", skills: ["linux", "bash", "git"] },
        { title: "Containers", skills: ["docker", "kubernetes"] },
        { title: "Cloud", skills: ["aws", "terraform"] },
        { title: "Automation", skills: ["ci/cd", "monitoring", "python"] },
        { title: "Placement Ready", skills: ["system design", "interview prep", "portfolio"] },
      ],
    };
  }

  if (isMobile) {
    return {
      normalizedTitle: "Mobile Developer",
      requiredSkills: [
        "javascript", "react native", "flutter", "dart",
        "swift", "kotlin", "rest api", "git",
        "state management", "firebase", "app deployment", "ui/ux basics",
      ],
      roadmapStages: [
        { title: "Foundations", skills: ["javascript", "git"] },
        { title: "Cross-Platform", skills: ["react native", "flutter", "dart"] },
        { title: "Native", skills: ["swift", "kotlin"] },
        { title: "Integration", skills: ["rest api", "firebase", "state management"] },
        { title: "Placement Ready", skills: ["system design", "interview prep", "portfolio"] },
      ],
    };
  }

  if (isData) {
    return {
      normalizedTitle: "Data Analyst",
      requiredSkills: [
        "sql", "python", "pandas", "excel",
        "power bi", "tableau", "statistics", "data visualization",
        "numpy", "git", "storytelling with data", "business intelligence",
      ],
      roadmapStages: [
        { title: "Foundations", skills: ["sql", "excel", "git"] },
        { title: "Programming", skills: ["python", "pandas", "numpy"] },
        { title: "Visualization", skills: ["power bi", "tableau", "data visualization"] },
        { title: "Analysis", skills: ["statistics", "storytelling with data"] },
        { title: "Placement Ready", skills: ["interview prep", "portfolio"] },
      ],
    };
  }

  if (isFrontend) {
    return {
      normalizedTitle: "Frontend Developer",
      requiredSkills: [
        "html", "css", "javascript", "typescript", "react",
        "next.js", "tailwind css", "git", "rest api",
        "responsive design", "state management", "testing",
      ],
      roadmapStages: [
        { title: "Foundations", skills: ["html", "css", "git"] },
        { title: "Core Skills", skills: ["javascript", "react", "responsive design"] },
        { title: "Modern Stack", skills: ["typescript", "tailwind css", "next.js"] },
        { title: "Advanced", skills: ["state management", "rest api", "testing"] },
        { title: "Placement Ready", skills: ["system design", "interview prep", "portfolio"] },
      ],
    };
  }

  if (isBackend) {
    return {
      normalizedTitle: "Backend Developer",
      requiredSkills: [
        "node.js", "express", "postgresql", "mongodb", "redis",
        "rest api", "docker", "git", "authentication",
        "typescript", "system design", "testing",
      ],
      roadmapStages: [
        { title: "Foundations", skills: ["git", "rest api", "authentication"] },
        { title: "Core Skills", skills: ["node.js", "express", "typescript"] },
        { title: "Databases", skills: ["postgresql", "mongodb", "redis"] },
        { title: "DevOps Basics", skills: ["docker", "testing"] },
        { title: "Placement Ready", skills: ["system design", "interview prep", "portfolio"] },
      ],
    };
  }

  // Default: Full Stack
  return {
    normalizedTitle: "Full Stack Developer",
    requiredSkills: [
      "html", "css", "javascript", "typescript", "react",
      "node.js", "express", "postgresql", "mongodb",
      "rest api", "git", "docker",
    ],
    roadmapStages: [
      { title: "Foundations", skills: ["html", "css", "git"] },
      { title: "Frontend", skills: ["javascript", "typescript", "react"] },
      { title: "Backend", skills: ["node.js", "express", "rest api"] },
      { title: "Databases & DevOps", skills: ["postgresql", "mongodb", "docker"] },
      { title: "Placement Ready", skills: ["system design", "interview prep", "portfolio"] },
    ],
  };
}

// ---------------------------------------------------------------------------
// Roadmap builder (no hardcoded role map — uses dynamic RoleIntelligence)
// ---------------------------------------------------------------------------

function buildRoadmap(
  careerFit: string,
  roleIntelligence: RoleIntelligence,
  options: {
    resumeSkills: string[];
    profileSkills: string[];
    manualSkills: string[];
    weeklyDone: WeeklyDoneEntry[];
  }
): { weeks: WeeklyPlan[]; stages: RoadmapStage[] } {
  const { resumeSkills, profileSkills, manualSkills, weeklyDone } = options;

  const resumeSet = new Set(resumeSkills.map(normaliseSkill));
  const profileSet = new Set(profileSkills.map(normaliseSkill));
  const manualSet = new Set(manualSkills.map(normaliseSkill));

  const allUserSkills = new Set([...resumeSet, ...profileSet, ...manualSet]);

  function sourceFor(skill: string): SkillSource | null {
    const ns = normaliseSkill(skill);
    if (manualSet.has(ns)) return "manual";
    if (resumeSet.has(ns)) return "resume";
    if (profileSet.has(ns)) return "profile";
    return null;
  }

  // Build stages from Gemini's dynamic roadmap template
  const stages: RoadmapStage[] = roleIntelligence.roadmapStages.map((s, i) => {
    const skills: RoadmapSkill[] = s.skills.map((name) => {
      const known = userHasSkill(name, allUserSkills);
      return {
        name,
        known,
        source: known ? sourceFor(name) : null,
        resources: resourcesForSkill(name),
      };
    });

    const knownCount = skills.filter((x) => x.known).length;
    const total = skills.length;
    const progress = total ? Math.round((knownCount / total) * 100) : 0;

    return {
      stage: `Stage ${i + 1}`,
      title: s.title,
      skills,
      knownSkills: skills.filter((x) => x.known).map((x) => x.name),
      gapSkills: skills.filter((x) => !x.known).map((x) => x.name),
      knownCount,
      total,
      progress,
      status: "locked" as StageStatus,
    };
  });

  // Sequential gating: each stage unlocks only after previous is completed
  let prevCompleted = true;
  for (const stage of stages) {
    if (!prevCompleted) {
      stage.status = "locked";
      continue;
    }
    if (stage.total > 0 && stage.knownCount === stage.total) {
      stage.status = "completed";
    } else {
      stage.status = "active";
      prevCompleted = false;
    }
  }

  // Weekly plan: 2 gap-skills per week across all stages in order
  const allGaps = stages.flatMap((s) => s.gapSkills);
  const uniqueGaps = Array.from(new Set(allGaps));

  const doneKeys = new Set(
    (weeklyDone || []).map((w) => `${w.week}::${w.taskKey}`)
  );

  const weeks: WeeklyPlan[] = [];
  let week = 1;
  for (let i = 0; i < uniqueGaps.length; i += 2) {
    const focusNames = uniqueGaps.slice(i, i + 2);
    const tasks: WeeklyTask[] = focusNames.map((name) => ({
      key: name,
      label: `Study and build a small project with ${name}`,
      done:
        doneKeys.has(`${week}::${name}`) || userHasSkill(name, allUserSkills),
    }));
    weeks.push({
      week,
      title: `Week ${week}`,
      focus: focusNames,
      tasks,
      goal:
        focusNames.length > 1
          ? `Learn ${focusNames[0]} and ${focusNames[1]}`
          : `Master ${focusNames[0]}`,
    });
    week += 1;
    if (week > 8) break;
  }

  // If user already knows everything, give them a polish week
  if (weeks.length === 0) {
    weeks.push({
      week: 1,
      title: "Week 1",
      focus: ["portfolio polish"],
      tasks: [
        {
          key: "portfolio polish",
          label: `Build a portfolio project showcasing ${careerFit}`,
          done: doneKeys.has(`1::portfolio polish`),
        },
      ],
      goal: `Build a portfolio project showcasing ${careerFit}`,
    });
  }

  return { weeks, stages };
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export async function runAnalysis({
  user,
  skills,
  careerGoal,
  resumePath,
  githubUrl,
  linkedinUrl,
  manualSkills = [],
  weeklyProgress = [],
  resumeText: preExtractedText,
  cachedRoleIntelligence,
}: RunAnalysisInput): Promise<RunAnalysisResult> {

  const goal = careerGoal || user?.careerGoal || "Full Stack Developer";

  // ── 1. Extract resume text ──────────────────────────────────────────────
  let resumeText = preExtractedText || "";
  if (!resumeText && resumePath) {
    resumeText = await extractResumeText(resumePath);
  }

  const profileSkills = (skills || []).map(normaliseSkill).filter(Boolean);
  const manualSkillList = (manualSkills || []).map(normaliseSkill).filter(Boolean);

  // ── 2. Ask Gemini what this role actually requires ──────────────────────
  const roleIntelligence = await getRoleIntelligence(
    goal,
    resumeText,
    [...profileSkills, ...manualSkillList],
    cachedRoleIntelligence
  );

  const required = roleIntelligence.requiredSkills.map(normaliseSkill);
  const careerFit = roleIntelligence.normalizedTitle;

  // ── 3. Analyse resume against dynamic required skills ──────────────────
  let resumeAnalysis: ResumeAnalysis = {
    ok: false,
    resumeScore: 0,
    atsScore: 0,
    foundSkills: [],
    missingKeywords: required,
    sectionsFound: [],
    wordCount: 0,
    contact: {},
  };

  if (resumeText) {
    resumeAnalysis = analyzeResumeText(resumeText, required) as ResumeAnalysis;
  }

  const resumeSkillList = (resumeAnalysis.foundSkills || []).map(normaliseSkill);

  // ── 4. Build unified skill set ──────────────────────────────────────────
  const allUserSkills = new Set<string>([
    ...profileSkills,
    ...resumeSkillList,
    ...manualSkillList,
  ]);

  // ── 5. Match against required skills (fuzzy) ───────────────────────────
  const strengths = required.filter((s) => userHasSkill(s, allUserSkills));
  const gaps = required.filter((s) => !userHasSkill(s, allUserSkills));

  const matchScore = required.length
    ? Math.round((strengths.length / required.length) * 100)
    : 0;

  // ── 6. Profile completeness ─────────────────────────────────────────────
  const profileFields = [
    user?.college,
    user?.bio,
    user?.github,
    user?.linkedin,
    user?.age,
    goal,
    resumePath || resumeText,
  ];
  const profileCompleteness = Math.round(
    (profileFields.filter(Boolean).length / profileFields.length) * 100
  );

  // ── 7. GitHub & LinkedIn ────────────────────────────────────────────────
  const githubProfile: GithubProfile = githubUrl
    ? await fetchGithubProfile(githubUrl)
    : { ok: false, reason: "No GitHub URL" };

  const githubScoreResult: GithubScoreResult = scoreGithub(githubProfile, required);
  const linkedinScoreResult: LinkedInScoreResult = scoreLinkedIn(linkedinUrl);

  // ── 8. Composite scores ─────────────────────────────────────────────────
  const skillCountScore = Math.min(100, allUserSkills.size * 8);

  const readinessScore = Math.round(
    matchScore * 0.35 +
    resumeAnalysis.resumeScore * 0.20 +
    profileCompleteness * 0.15 +
    skillCountScore * 0.10 +
    githubScoreResult.score * 0.10 +
    linkedinScoreResult.score * 0.05 +
    resumeAnalysis.atsScore * 0.05
  );

  const recruiterVisibility = Math.round(
    linkedinScoreResult.score * 0.40 +
    githubScoreResult.score * 0.40 +
    resumeAnalysis.atsScore * 0.20
  );

  // ── 9. Roadmap ──────────────────────────────────────────────────────────
  const { weeks: roadmap, stages: roadmapStages } = buildRoadmap(
    careerFit,
    roleIntelligence,
    {
      resumeSkills: resumeSkillList,
      profileSkills,
      manualSkills: manualSkillList,
      weeklyDone: weeklyProgress,
    }
  );

  // ── 10. Skill proficiency ───────────────────────────────────────────────
  const githubLangs = new Set<string>(
    Object.keys(githubProfile?.languageBytes || {}).map(normaliseSkill)
  );

  const skillProficiency: SkillProficiencyEntry[] = required.map((skill) => {
    const inProfile = profileSkills.some((s) => skillsMatch(s, skill));
    const inResume = resumeSkillList.some((s) => skillsMatch(s, skill));
    const inManual = manualSkillList.some((s) => skillsMatch(s, skill));
    const inGithub = [...githubLangs].some((s) => skillsMatch(s, skill));

    const evidence: string[] = [];
    if (inResume) evidence.push("resume");
    if (inProfile) evidence.push("profile");
    if (inGithub) evidence.push("github");
    if (inManual) evidence.push("completed");

    let level: SkillProficiencyEntry["level"];
    let currentPct: number;
    let gapPct: number;

    if (evidence.length >= 3) {
      level = "Confident"; currentPct = 95; gapPct = 0;
    } else if (evidence.length === 2) {
      level = "Confident"; currentPct = 80; gapPct = 5;
    } else if (evidence.length === 1) {
      level = "Practising"; currentPct = 55; gapPct = 35;
    } else {
      level = "Beginner"; currentPct = 10; gapPct = 90;
    }

    return {
      name: skill,
      level,
      currentPct,
      targetPct: 100,
      gapPct,
      evidence,
      known: evidence.length > 0,
    };
  });

  // ── 11. Strengths & suggestions text ───────────────────────────────────
  const strengthsText: StrengthEntry[] = [];

  if (strengths.length >= 4)
    strengthsText.push({
      title: "Strong technical skill coverage",
      description: `You match ${strengths.length} of ${required.length} required skills for ${careerFit}.`,
      status: "Good",
      color: "bg-[#e7f7ea] text-green-700",
    });

  if (resumeAnalysis.sectionsFound.length >= 4)
    strengthsText.push({
      title: "Resume sections well-structured",
      description: `Detected ${resumeAnalysis.sectionsFound.length} key sections (${resumeAnalysis.sectionsFound.join(", ")}).`,
      status: "Strong",
      color: "bg-[#e7f7ea] text-green-700",
    });

  if (githubScoreResult.score >= 50)
    strengthsText.push({
      title: "Active GitHub presence",
      description: `${githubProfile.ownRepoCount ?? 0} public repos, ${githubProfile.totalStars ?? 0} total stars.`,
      status: "Good",
      color: "bg-[#e7f7ea] text-green-700",
    });

  if (resumeAnalysis.wordCount > 250)
    strengthsText.push({
      title: "Resume has sufficient detail",
      description: `Word count ${resumeAnalysis.wordCount} — within the recommended range.`,
      status: "Good",
      color: "bg-[#e7f7ea] text-green-700",
    });

  const aiSuggestions: SuggestionEntry[] = [];

  if (gaps.length > 0)
    aiSuggestions.push({
      title: "Add missing role keywords",
      description: `Your resume is missing key terms for ${careerFit}: ${gaps.slice(0, 5).join(", ")}.`,
    });

  if (resumeAnalysis.sectionsFound.length < 4)
    aiSuggestions.push({
      title: "Add more standard resume sections",
      description: `Detected only ${resumeAnalysis.sectionsFound.length} sections. Add: education, experience, projects, skills.`,
    });

  if (githubScoreResult.score < 50)
    aiSuggestions.push({
      title: "Strengthen your GitHub",
      description: githubProfile.ok
        ? `Only ${githubProfile.ownRepoCount} repos. Pin 4-6 projects and add READMEs to boost recruiter discovery.`
        : `We couldn't read your GitHub profile (${githubProfile.reason}). Make sure the URL is correct and public.`,
    });

  if (linkedinScoreResult.score < 60)
    aiSuggestions.push({
      title: "Improve LinkedIn",
      description: linkedinScoreResult.ok
        ? "Add a headline that mentions your target role and update your About section."
        : linkedinScoreResult.reason ?? "Add your LinkedIn URL to your profile.",
    });

  if (resumeAnalysis.wordCount < 200)
    aiSuggestions.push({
      title: "Expand your resume",
      description: `Resume is only ${resumeAnalysis.wordCount} words — add measurable bullet points to projects/experience.`,
    });

  return {
    careerFit,
    readinessScore,
    matchScore,
    profileCompleteness,
    skillCountScore,
    skillStrengths: strengths,
    skillGaps: gaps,
    recommendedSkills: gaps.slice(0, 5),
    extractedSkills: Array.from(allUserSkills),
    requiredSkills: required,
    roleIntelligence: {
      ...roleIntelligence,
      requiredSkills: required,
    },
    roleGoalSnapshot: goal,
    skillProficiency,
    roadmap,
    roadmapStages,
    resume: {
      score: resumeAnalysis.resumeScore,
      atsScore: resumeAnalysis.atsScore,
      foundSkills: resumeAnalysis.foundSkills,
      missingKeywords: resumeAnalysis.missingKeywords,
      sectionsFound: resumeAnalysis.sectionsFound,
      wordCount: resumeAnalysis.wordCount,
      contact: resumeAnalysis.contact,
      ok: resumeAnalysis.ok,
      breakdown: resumeAnalysis.breakdown,
    },
    github: {
      score: githubScoreResult.score,
      breakdown: githubScoreResult.breakdown,
      languagesMatched: githubScoreResult.languagesMatched,
      profile: githubProfile,
    },
    linkedin: linkedinScoreResult,
    recruiterVisibility,
    strengthsText,
    aiSuggestions,
  };
}
