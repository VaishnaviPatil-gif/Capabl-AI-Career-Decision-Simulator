import prisma from "../config/db.js";
import readinessService, {
  ReadinessProfile,
  DataCompleteness,
} from "../services/readinessService.js";
import { generateJson } from "../services/geminiText.js";
import { resourcesForSkill } from "../services/skillResources.js";

const normalize = (s: unknown): string => String(s ?? "").trim().toLowerCase();

/**
 * Confidence band from how many of the 5 evidence sources are present.
 * Fewer sources → wider band (less certain).
 */
function getConfidenceBand(dc: DataCompleteness): number {
  const count = Object.values(dc).filter(Boolean).length;
  if (count >= 4) return 5;
  if (count === 3) return 10;
  return 15;
}

// ---------------------------------------------------------------------------
// POST /api/whatif/simulate
// Body: { targetRole, skillsToComplete[] }  (userId comes from JWT)
// ---------------------------------------------------------------------------
export const simulate = async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    const targetRole = (req.body?.targetRole || "").trim() || "your target role";
    const skillsList: string[] = Array.isArray(req.body?.skillsToComplete)
      ? req.body.skillsToComplete.filter((s: any) => typeof s === "string" && s.trim())
      : [];

    const profile: ReadinessProfile | null =
      await readinessService.loadReadinessProfile(userId);
    if (!profile) {
      return res
        .status(400)
        .json({ error: "No analysis found yet. Run your AI analysis first." });
    }

    const currentScore = profile.currentScore;

    // Per-skill isolated gains (from readinessService — never hardcoded/AI).
    const gainMap: Record<string, number> = {};
    for (const skill of skillsList) {
      gainMap[skill] = readinessService.calculateIsolatedGain(
        profile.skills,
        skill,
        currentScore
      );
    }

    // Combined projection.
    const combinedGain = readinessService.calculateCombinedGain(
      profile.skills,
      skillsList,
      currentScore
    );
    const projectedScore = Math.min(99, currentScore + combinedGain);
    const delta = projectedScore - currentScore;
    const confidenceBand = getConfidenceBand(profile.dataCompleteness);

    // ── ONE Gemini call for ALL skill reasonings (text only) ──────────────
    const reasoningMap: Record<string, string> = {};
    if (skillsList.length) {
      const userSkills = profile.skills.map((s) => ({
        name: s.name,
        evidence: s.readiness,
      }));
      const prompt = `
You are a career advisor. For each skill listed, write ONE sentence
(max 18 words) explaining why it matters for a ${targetRole} role.
Be specific to this user's profile. No generic advice.

User current readiness: ${currentScore}%
User skills evidence: ${JSON.stringify(userSkills)}

Skills:
${skillsList.map((s, i) => `${i + 1}. ${s}`).join("\n")}

JSON only, no markdown:
{
  "reasonings": [
    { "skill": "skill name", "reasoning": "one sentence" }
  ]
}
`;
      const parsed = await generateJson(prompt);
      if (parsed && Array.isArray(parsed.reasonings)) {
        for (const r of parsed.reasonings) {
          if (r?.skill && r?.reasoning) {
            reasoningMap[normalize(r.skill)] = String(r.reasoning);
          }
        }
      }
    }

    // Hardcoded fallback per skill if Gemini missed it.
    const fallbackReasoning = (skill: string) =>
      `${skill} is a top gap for ${targetRole} based on current evidence.`;

    const skillReasonings = skillsList.map((skill) => ({
      skill,
      reasoning: reasoningMap[normalize(skill)] ?? fallbackReasoning(skill),
      gainIfCompleted: gainMap[skill] ?? 0,
    }));

    // Persist the snapshot only when something was toggled (avoid empty rows).
    if (skillsList.length) {
      await prisma.simulationSnapshot.create({
        data: {
          userId,
          skillsToggled: skillReasonings.map((s) => ({
            skill: s.skill,
            gain: s.gainIfCompleted,
          })),
          projectedScore,
          delta,
        },
      });
    }

    const history = await prisma.simulationSnapshot.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 3,
    });

    return res.json({
      currentScore,
      projectedScore,
      delta,
      confidenceBand,
      dataCompleteness: profile.dataCompleteness,
      skillReasonings,
      simulationHistory: history.map((h) => ({
        skillsToggled: h.skillsToggled,
        projectedScore: h.projectedScore,
        delta: h.delta,
        createdAt: h.createdAt,
      })),
    });
  } catch (error: any) {
    console.error("simulate error:", error);
    return res.status(500).json({ error: "Simulation failed" });
  }
};

// ---------------------------------------------------------------------------
// POST /api/whatif/compare
// Body: { targetRole }  (userId from JWT)
//
// The decision engine: instead of asking the user to hand-pick skills, we
// auto-generate 2-3 STRATEGIC PATHS from their real readiness profile and model
// each one's tradeoffs side by side — projected score, effort, and (crucially)
// what each path does NOT address. This is the "Life Decision Simulator"
// surface: input (evidence) → reasoning (paths + tradeoffs) → decision input
// (the user chooses, we never auto-pick). Every score/gain comes from
// readinessService; the LLM only writes the human-readable tradeoff sentence.
// ---------------------------------------------------------------------------

interface PathSkill {
  name: string;
  readiness: number;
  weight: number;
  gain: number;
}

interface ComparisonPath {
  key: string;
  title: string;
  approach: string;
  rationale: string; // one-line "why this path" (deterministic, never AI)
  skills: PathSkill[];
  projectedScore: number;
  delta: number;
  effortWeeks: number;
  tradeoff: string;
  consideration: string; // honest hidden consideration (LLM-enriched, optional)
}

// Effort heuristic, documented so it is auditable (not a magic constant):
// each not-yet-proven skill needs study proportional to how far it sits from
// mastery (100 − readiness). We sum those "skill-equivalents of remaining work"
// and assume ~1.5 focused weeks per full skill-equivalent.
function estimateEffortWeeks(skills: PathSkill[]): number {
  const units = skills.reduce((sum, s) => sum + (100 - s.readiness) / 100, 0);
  return Math.max(1, Math.round(units * 1.5));
}

function buildTradeoff(
  pathSkills: PathSkill[],
  allSkills: ReadinessProfile["skills"]
): string {
  const covered = new Set(pathSkills.map((s) => normalize(s.name)));
  const uncovered = allSkills
    .filter((s) => !covered.has(normalize(s.name)) && s.readiness < 70)
    .sort((a, b) => b.weight - a.weight);
  if (!uncovered.length) {
    return "Addresses every major gap for this role — no high-weight skill left behind.";
  }
  const top = uncovered.slice(0, 2).map((s) => s.name).join(" and ");
  const weightLeft = Math.round(
    uncovered.reduce((sum, s) => sum + s.weight, 0)
  );
  return `Leaves ${top} unaddressed (~${weightLeft}% of role weight still in gaps).`;
}

export const comparePaths = async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    const targetRole = (req.body?.targetRole || "").trim() || "your target role";

    const profile = await readinessService.loadReadinessProfile(userId);
    if (!profile) {
      return res
        .status(400)
        .json({ error: "No analysis found yet. Run your AI analysis first." });
    }

    const currentScore = profile.currentScore;
    const confidenceBand = getConfidenceBand(profile.dataCompleteness);

    const withGain = (names: string[]): PathSkill[] =>
      names
        .map((name) => {
          const s = profile.skills.find((x) => normalize(x.name) === normalize(name));
          if (!s) return null;
          return {
            name: s.name,
            readiness: s.readiness,
            weight: Math.round(s.weight),
            gain: readinessService.calculateIsolatedGain(
              profile.skills,
              s.name,
              currentScore
            ),
          };
        })
        .filter(Boolean) as PathSkill[];

    // Each strategy selects by a DIFFERENT objective over the same pool of
    // not-yet-mastered skills, so the paths differ in emphasis even when a
    // user's readiness is uniformly low (the common resume-only case). We do
    // not gate by readiness band — that would leave a path empty for blank-slate
    // users. Identical sets are de-duped after the fact.
    const improvable = profile.skills.filter((s) => s.readiness < 90);

    // Path 1 — Quick Wins: skills closest to proficient (momentum, least effort).
    const quickWinNames = [...improvable]
      .sort((a, b) => b.readiness - a.readiness)
      .slice(0, 3)
      .map((s) => s.name);

    // Path 2 — Close Critical Gaps: the highest role-importance skills that are
    // genuinely UNMET (readiness < 70). Filtering out already-proven skills stops
    // this path from surfacing strengths an advanced user has effectively mastered
    // (which add ~0 gain) and keeps it meaningfully different from Quick Wins.
    const criticalPool = improvable.filter((s) => s.readiness < 70);
    const criticalNames = [...(criticalPool.length ? criticalPool : improvable)]
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 3)
      .map((s) => s.name);

    // Path 3 — Balanced Sprint: best score gain per unit of effort. A FIXED
    // start-up cost is added to each skill's effort so this favors high-impact
    // skills that are also reachable — not a pure re-sort of either list above.
    const roi = (s: ReadinessProfile["skills"][number]) => {
      const gain = readinessService.calculateIsolatedGain(
        profile.skills,
        s.name,
        currentScore
      );
      const effort = 1 + (100 - s.readiness) / 100; // fixed + remaining-distance
      return gain / effort;
    };
    const balancedNames = [...improvable]
      .sort((a, b) => roi(b) - roi(a))
      .slice(0, 4)
      .map((s) => s.name);

    const rawPaths = [
      {
        key: "quick-wins",
        title: "Quick Wins",
        approach: "Finish skills you're already close on — lock in proficiency fast.",
        rationale: "Fastest route to interview readiness — least effort per point gained.",
        skills: withGain(quickWinNames),
      },
      {
        key: "critical-gaps",
        title: "Close Critical Gaps",
        approach: "Tackle the highest-weight skills this role demands most.",
        rationale: "Addresses the largest hiring gaps for your target role.",
        skills: withGain(criticalNames),
      },
      {
        key: "balanced-sprint",
        title: "Balanced Sprint",
        approach: "Best score gain for the least effort — the efficient route.",
        rationale: "Best overall score gain per week of effort invested.",
        skills: withGain(balancedNames),
      },
    ]
      // Drop empty/duplicate paths (e.g. a strong user with no developing skills).
      .filter((p) => p.skills.length > 0)
      .map((p) => {
        const names = p.skills.map((s) => s.name);
        const gain = readinessService.calculateCombinedGain(
          profile.skills,
          names,
          currentScore
        );
        return {
          ...p,
          projectedScore: Math.min(99, currentScore + gain),
          delta: gain,
          effortWeeks: estimateEffortWeeks(p.skills),
          tradeoff: buildTradeoff(p.skills, profile.skills),
        };
      });

    // De-duplicate paths that resolved to the same skill set.
    const seen = new Set<string>();
    const paths = rawPaths.filter((p) => {
      const sig = p.skills.map((s) => normalize(s.name)).sort().join("|");
      if (seen.has(sig)) return false;
      seen.add(sig);
      return true;
    });

    // ── ONE optional Gemini call: a one-line honest "hidden consideration" per
    //    path. Scores/efforts are NOT sent to or taken from the model. ────────
    const considerations: Record<string, string> = {};
    if (paths.length) {
      const prompt = `
You are a career advisor helping a student weigh strategies for a ${targetRole}
role. For each strategy below, write ONE sentence (max 22 words) naming a HIDDEN
consideration or honest caveat a student might overlook — not a summary, not hype.

Strategies:
${paths
  .map(
    (p, i) =>
      `${i + 1}. key="${p.key}" | ${p.title}: focuses on ${p.skills
        .map((s) => s.name)
        .join(", ")}`
  )
  .join("\n")}

JSON only, no markdown:
{ "considerations": [ { "key": "strategy key", "note": "one sentence" } ] }
`;
      const parsed = await generateJson(prompt);
      if (parsed && Array.isArray(parsed.considerations)) {
        for (const c of parsed.considerations) {
          if (c?.key && c?.note) considerations[String(c.key)] = String(c.note);
        }
      }
    }

    const result: ComparisonPath[] = paths.map((p) => ({
      ...p,
      consideration:
        considerations[p.key] ||
        `Estimated outcome assumes consistent weekly effort; real pace varies.`,
    }));

    return res.json({
      currentScore,
      confidenceBand,
      dataCompleteness: profile.dataCompleteness,
      targetRole,
      paths: result,
    });
  } catch (error: any) {
    console.error("comparePaths error:", error);
    return res.status(500).json({ error: "Path comparison failed" });
  }
};

// ---------------------------------------------------------------------------
// POST /api/goals/commit
// Body: { targetRole, skillsToFocus[], weekStartDate }  (userId from JWT)
// ---------------------------------------------------------------------------
function fallbackPlan(targetRole: string, skillsToFocus: string[]) {
  const first = skillsToFocus[0] || "the skill";
  return {
    weekGoal: `Build foundational knowledge in ${skillsToFocus.join(" and ")} this week.`,
    days: [
      { day: "Monday", task: `Watch intro tutorial for ${first}`, resource: "YouTube", duration: "1h" },
      { day: "Tuesday", task: "Follow official quickstart docs", resource: "Official docs", duration: "2h" },
      { day: "Wednesday", task: "Build a small practice project", resource: "GitHub", duration: "2h" },
      { day: "Thursday", task: "Add the skill to an existing portfolio project", resource: "Your repo", duration: "2h" },
      { day: "Friday", task: "Complete one practice problem or exercise", resource: "freeCodeCamp", duration: "1h" },
      { day: "Saturday", task: "Review and consolidate notes", resource: "Notion", duration: "1h" },
      { day: "Sunday", task: "Push completed work to GitHub", resource: "GitHub", duration: "1h" },
    ],
  };
}

export const commitGoal = async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    const targetRole = (req.body?.targetRole || "").trim() || "Target Role";
    const skillsToFocus: string[] = Array.isArray(req.body?.skillsToFocus)
      ? req.body.skillsToFocus.filter((s: any) => typeof s === "string" && s.trim())
      : [];

    if (!skillsToFocus.length) {
      return res.status(400).json({ error: "Select at least one skill to focus on." });
    }

    const profile = await readinessService.loadReadinessProfile(userId);
    if (!profile) {
      return res
        .status(400)
        .json({ error: "No analysis found yet. Run your AI analysis first." });
    }

    const currentScore = profile.currentScore;
    const expectedGain = readinessService.calculateCombinedGain(
      profile.skills,
      skillsToFocus,
      currentScore
    );
    const projectedScoreByWeekend = Math.min(99, currentScore + expectedGain);

    const parsedDate = req.body?.weekStartDate ? new Date(req.body.weekStartDate) : new Date();
    const weekStart = isNaN(parsedDate.getTime()) ? new Date() : parsedDate;

    // ── ONE Gemini call for the 7-day plan text (no scores) ───────────────
    const prompt = `
Create a 7-day plan for someone targeting ${targetRole} focusing on
${skillsToFocus.join(", ")} this week. Current readiness: ${currentScore}%.

JSON only, no markdown:
{
  "weekGoal": "one sentence of what they achieve by Sunday",
  "days": [
    { "day": "Monday", "task": "...", "resource": "...", "duration": "Xh" }
  ]
}

Rules:
- Each task under 15 words
- Resources must be free (YouTube, official docs, freeCodeCamp, Kaggle)
- Be specific to the skills listed, not generic productivity advice
- Do NOT include any score or number — scores are computed separately
`;
    const parsed = await generateJson(prompt);
    const plan =
      parsed && parsed.weekGoal && Array.isArray(parsed.days) && parsed.days.length
        ? { weekGoal: String(parsed.weekGoal), days: parsed.days }
        : fallbackPlan(targetRole, skillsToFocus);

    const goal = await prisma.weeklyGoal.create({
      data: {
        userId,
        targetRole,
        skillsFocus: skillsToFocus,
        weekStart,
        weekGoal: plan.weekGoal,
        dailyPlan: plan.days,
        expectedGain,
      },
    });

    // Curated, real learning links per focused skill (never AI-hallucinated URLs).
    const resources = skillsToFocus.map((skill) => ({
      skill,
      links: resourcesForSkill(skill).slice(0, 3),
    }));

    return res.json({
      goalId: goal.id,
      weekGoal: plan.weekGoal,
      expectedGain,
      projectedScoreByWeekend,
      days: plan.days,
      resources,
    });
  } catch (error: any) {
    console.error("commitGoal error:", error);
    return res.status(500).json({ error: "Failed to commit goal" });
  }
};
