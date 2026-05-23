import { GoogleGenerativeAI } from "@google/generative-ai";

// Gemini 1.5 Flash is fast and free-tier friendly (15 RPM, 1500 RPD).
const MODEL_NAME = "gemini-2.5-flash";

let cachedClient = null;
function getClient() {
  if (cachedClient) return cachedClient;
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error(
      "GEMINI_API_KEY is not set. Add it to backend/.env (get one free at https://aistudio.google.com/app/apikey)."
    );
  }
  cachedClient = new GoogleGenerativeAI(key);
  return cachedClient;
}

function getModel() {
  return getClient().getGenerativeModel({
    model: MODEL_NAME,
    generationConfig: { temperature: 0.7 },
  });
}

export const DURATION_PRESETS = {
  short: { totalQuestions: 5, label: "Short (~10 min)" },
  medium: { totalQuestions: 8, label: "Medium (~20 min)" },
  long: { totalQuestions: 12, label: "Long (~30 min)" },
};

export const LEVELS = ["easy", "medium", "hard"];

// Topics the user can pick. The first three are tuned per-role on the
// frontend (e.g. "Frontend technical deep dive" for a frontend candidate);
// the rest are role-agnostic.
export const TOPIC_PRESETS = [
  {
    key: "technical",
    label: "Technical Deep Dive",
    description: "Role-specific technical questions",
  },
  {
    key: "behavioral",
    label: "Behavioral / HR",
    description: "Situational and soft-skill questions",
  },
  {
    key: "system-design",
    label: "System Design",
    description: "High-level architecture and trade-offs",
  },
  {
    key: "dsa",
    label: "DSA Logic",
    description: "Data structures and algorithm reasoning",
  },
  {
    key: "resume",
    label: "Resume Walkthrough",
    description: "Questions about your projects and experience",
  },
];

function topicGuidance(topic) {
  switch (topic) {
    case "behavioral":
      return "Ask realistic behavioral questions (STAR-style). Focus on teamwork, conflict, ownership, learning from failure.";
    case "system-design":
      return "Ask high-level system design questions. Expect the candidate to discuss trade-offs, data flow, and scaling.";
    case "dsa":
      return "Ask DSA reasoning questions (no live coding). The candidate explains their approach, time/space complexity, and edge cases.";
    case "resume":
      return "Ask about specific projects/experience the candidate has on their resume or in their profile. Dig into decisions they made.";
    case "technical":
    default:
      return "Ask role-specific technical questions appropriate to the candidate's target role.";
  }
}

function buildSystemPrompt({
  candidate,
  topic,
  level,
  totalQuestions,
  careerFit,
}) {
  const skillsText = (candidate.skills || []).slice(0, 12).join(", ") || "none listed";
  return `You are a friendly but rigorous senior interviewer at a top product company.
You are conducting a ${level} difficulty mock interview for a candidate aspiring to be a ${careerFit}.
Topic: ${topic}. ${topicGuidance(topic)}

CANDIDATE PROFILE
- Name: ${candidate.name || "the candidate"}
- Target role: ${careerFit}
- Career goal: ${candidate.careerGoal || "—"}
- Listed skills: ${skillsText}
- College: ${candidate.college || "—"}
- Bio: ${candidate.bio || "—"}

RULES
- Ask EXACTLY ONE question per turn. Keep questions under 60 words.
- Tailor questions to the candidate's level and listed skills.
- Do not number the question; just output the question text.
- Avoid repeating earlier questions.
- This interview is exactly ${totalQuestions} questions long.`;
}

async function callGemini(systemPrompt, history, userTurn) {
  const model = getModel();
  const chat = model.startChat({
    history: [
      { role: "user", parts: [{ text: systemPrompt }] },
      { role: "model", parts: [{ text: "Understood. I'm ready to begin." }] },
      ...history,
    ],
  });
  const result = await chat.sendMessage(userTurn);
  return result.response.text().trim();
}

export async function generateFirstQuestion(ctx) {
  const systemPrompt = buildSystemPrompt(ctx);
  const opener = await callGemini(
    systemPrompt,
    [],
    `Greet ${ctx.candidate.name || "the candidate"} in one short sentence, then ask the FIRST question. Output only the greeting + question, no preface.`
  );
  return opener;
}

// transcript is the array stored on the session row:
//   [{ question, answer, feedback? }, ...]
// We've just received the candidate's answer to transcript[transcript.length-1].
// Returns { feedback, nextQuestion, isLast }
export async function evaluateAndContinue(ctx, transcript) {
  const systemPrompt = buildSystemPrompt(ctx);

  // Reconstruct chat history as user/model turns
  const history = [];
  for (let i = 0; i < transcript.length; i++) {
    const t = transcript[i];
    history.push({ role: "model", parts: [{ text: t.question }] });
    if (t.answer !== undefined && t.answer !== null) {
      history.push({ role: "user", parts: [{ text: t.answer }] });
    }
  }

  const answered = transcript.filter((t) => t.answer != null).length;
  const isLast = answered >= ctx.totalQuestions;

  if (isLast) {
    // No next question — caller will trigger finalize separately.
    return { feedback: null, nextQuestion: null, isLast: true };
  }

  const askIndex = answered + 1; // we just stored the latest answer
  const userTurn = `Give 1-2 sentences of feedback on the candidate's last answer, then ask question ${
    askIndex + 1
  } of ${ctx.totalQuestions}. Use this exact format and nothing else:
FEEDBACK: <your feedback>
QUESTION: <next question>`;

  const raw = await callGemini(systemPrompt, history, userTurn);
  const feedbackMatch = raw.match(/FEEDBACK:\s*([\s\S]*?)\n+QUESTION:/i);
  const questionMatch = raw.match(/QUESTION:\s*([\s\S]*)/i);

  const feedback = feedbackMatch?.[1]?.trim() || null;
  const nextQuestion =
    questionMatch?.[1]?.trim() || raw.trim();

  return { feedback, nextQuestion, isLast: false };
}

// Final scorecard — asks Gemini for strict JSON, then parses it.
export async function generateScorecard(ctx, transcript) {
  const systemPrompt = buildSystemPrompt(ctx);

  const qaText = transcript
    .map(
      (t, i) =>
        `Q${i + 1}: ${t.question}\nA${i + 1}: ${t.answer || "(no answer)"}`
    )
    .join("\n\n");

  const userTurn = `The interview is complete. Here is the transcript:

${qaText}

Now produce a JSON scorecard with this EXACT shape and nothing else (no markdown, no prose, no code fences):
{
  "score": <0-100 integer>,
  "summary": "<2-3 sentence overall verdict>",
  "strengths": ["<short bullet>", "<short bullet>", "<short bullet>"],
  "weaknesses": ["<short bullet>", "<short bullet>"],
  "advice": ["<actionable next step>", "<actionable next step>", "<actionable next step>"]
}`;

  const raw = await callGemini(systemPrompt, [], userTurn);

  // Be lenient — Gemini sometimes wraps JSON in ```json fences.
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  let parsed = null;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        parsed = JSON.parse(match[0]);
      } catch {
        /* fall through */
      }
    }
  }

  if (!parsed || typeof parsed.score !== "number") {
    return {
      score: 0,
      summary: "Could not parse evaluation. Raw response: " + raw.slice(0, 240),
      strengths: [],
      weaknesses: [],
      advice: [],
    };
  }

  return {
    score: Math.max(0, Math.min(100, Math.round(parsed.score))),
    summary: String(parsed.summary || ""),
    strengths: Array.isArray(parsed.strengths) ? parsed.strengths.map(String) : [],
    weaknesses: Array.isArray(parsed.weaknesses) ? parsed.weaknesses.map(String) : [],
    advice: Array.isArray(parsed.advice) ? parsed.advice.map(String) : [],
  };
}
