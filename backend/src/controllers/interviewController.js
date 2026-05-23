import prisma from "../config/db.js";
import {
  DURATION_PRESETS,
  LEVELS,
  TOPIC_PRESETS,
  generateFirstQuestion,
  evaluateAndContinue,
  generateScorecard,
} from "../services/interviewService.js";
import { runAnalysis } from "../services/analysisService.js";

async function loadCandidateContext(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { skills: true },
  });
  if (!user) throw new Error("User not found");

  // Re-use the analyzer to figure out careerFit from the user's career goal.
  let careerFit = "Software Engineer";
  try {
    const analysis = await runAnalysis({
      user,
      skills: user.skills.map((s) => s.name),
      careerGoal: user.careerGoal,
      resumePath: user.resume,
      githubUrl: user.github,
      linkedinUrl: user.linkedin,
    });
    careerFit = analysis.careerFit || careerFit;
  } catch {
    /* analyzer is best-effort here */
  }

  return {
    candidate: {
      name: user.name,
      careerGoal: user.careerGoal,
      college: user.college,
      bio: user.bio,
      skills: user.skills.map((s) => s.name),
    },
    careerFit,
  };
}

export const listInterviews = async (req, res) => {
  try {
    const userId = req.user.id;

    const sessions = await prisma.interviewSession.findMany({
      where: { userId },
      orderBy: { startedAt: "desc" },
      take: 20,
    });

    const finished = sessions.filter((s) => s.status === "finished");
    const scores = finished.map((s) => s.score || 0);
    const avg = scores.length
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : 0;
    const best = scores.length ? Math.max(...scores) : 0;

    res.json({
      sessions: sessions.map((s) => ({
        id: s.id,
        topic: s.topic,
        level: s.level,
        status: s.status,
        score: s.score,
        startedAt: s.startedAt,
        finishedAt: s.finishedAt,
      })),
      performance: {
        interviewsTaken: finished.length,
        avgScore: avg,
        bestScore: best,
        overallScore: avg,
      },
      topics: TOPIC_PRESETS,
      durations: Object.entries(DURATION_PRESETS).map(([key, v]) => ({
        key,
        label: v.label,
        totalQuestions: v.totalQuestions,
      })),
      levels: LEVELS,
    });
  } catch (error) {
    console.error("listInterviews error:", error);
    res.status(500).json({ message: error.message });
  }
};

export const startInterview = async (req, res) => {
  try {
    const userId = req.user.id;
    const topic = String(req.body?.topic || "technical");
    const level = LEVELS.includes(req.body?.level)
      ? req.body.level
      : "medium";
    const durationKey = DURATION_PRESETS[req.body?.duration]
      ? req.body.duration
      : "short";
    const totalQuestions = DURATION_PRESETS[durationKey].totalQuestions;

    const { candidate, careerFit } = await loadCandidateContext(userId);

    let firstQuestion;
    try {
      firstQuestion = await generateFirstQuestion({
        candidate,
        topic,
        level,
        totalQuestions,
        careerFit,
      });
    } catch (e) {
      return res.status(500).json({
        message: e.message || "Failed to start interview",
      });
    }

    const session = await prisma.interviewSession.create({
      data: {
        userId,
        topic,
        level,
        durationKey,
        totalQuestions,
        status: "active",
        transcript: [{ question: firstQuestion, answer: null }],
      },
    });

    res.status(201).json({
      sessionId: session.id,
      question: firstQuestion,
      questionIndex: 1,
      totalQuestions,
      topic,
      level,
      careerFit,
    });
  } catch (error) {
    console.error("startInterview error:", error);
    res.status(500).json({ message: error.message });
  }
};

export const submitAnswer = async (req, res) => {
  try {
    const userId = req.user.id;
    const sessionId = Number(req.params.id);
    const answer = String(req.body?.answer || "").trim();

    if (!answer) {
      return res.status(400).json({ message: "Answer is required" });
    }

    const session = await prisma.interviewSession.findFirst({
      where: { id: sessionId, userId },
    });
    if (!session) return res.status(404).json({ message: "Session not found" });
    if (session.status !== "active") {
      return res.status(400).json({ message: "Interview already finished" });
    }

    const transcript = Array.isArray(session.transcript)
      ? [...session.transcript]
      : [];
    const lastIdx = transcript.length - 1;
    if (lastIdx < 0 || transcript[lastIdx].answer != null) {
      return res
        .status(400)
        .json({ message: "No open question to answer" });
    }
    transcript[lastIdx] = { ...transcript[lastIdx], answer };

    const { candidate, careerFit } = await loadCandidateContext(userId);
    const ctx = {
      candidate,
      careerFit,
      topic: session.topic,
      level: session.level,
      totalQuestions: session.totalQuestions,
    };

    const { feedback, nextQuestion, isLast } = await evaluateAndContinue(
      ctx,
      transcript
    );

    if (feedback) {
      transcript[lastIdx] = { ...transcript[lastIdx], feedback };
    }
    if (!isLast && nextQuestion) {
      transcript.push({ question: nextQuestion, answer: null });
    }

    await prisma.interviewSession.update({
      where: { id: sessionId },
      data: { transcript },
    });

    res.json({
      sessionId,
      feedback,
      nextQuestion,
      questionIndex: transcript.filter((t) => t.answer != null).length + (isLast ? 0 : 1),
      totalQuestions: session.totalQuestions,
      isLast,
    });
  } catch (error) {
    console.error("submitAnswer error:", error);
    res.status(500).json({ message: error.message });
  }
};

export const finishInterview = async (req, res) => {
  try {
    const userId = req.user.id;
    const sessionId = Number(req.params.id);

    const session = await prisma.interviewSession.findFirst({
      where: { id: sessionId, userId },
    });
    if (!session) return res.status(404).json({ message: "Session not found" });

    const transcript = Array.isArray(session.transcript)
      ? session.transcript.filter((t) => t.answer != null)
      : [];

    if (transcript.length === 0) {
      await prisma.interviewSession.update({
        where: { id: sessionId },
        data: { status: "abandoned", finishedAt: new Date() },
      });
      return res.json({
        sessionId,
        status: "abandoned",
        message: "No answers recorded",
      });
    }

    const { candidate, careerFit } = await loadCandidateContext(userId);
    const ctx = {
      candidate,
      careerFit,
      topic: session.topic,
      level: session.level,
      totalQuestions: session.totalQuestions,
    };

    const card = await generateScorecard(ctx, transcript);

    const updated = await prisma.interviewSession.update({
      where: { id: sessionId },
      data: {
        status: "finished",
        finishedAt: new Date(),
        score: card.score,
        strengths: card.strengths,
        weaknesses: card.weaknesses,
        advice: card.advice,
        summary: card.summary,
      },
    });

    res.json({
      sessionId,
      status: "finished",
      score: updated.score,
      summary: updated.summary,
      strengths: updated.strengths,
      weaknesses: updated.weaknesses,
      advice: updated.advice,
      transcript,
    });
  } catch (error) {
    console.error("finishInterview error:", error);
    res.status(500).json({ message: error.message });
  }
};

export const getInterview = async (req, res) => {
  try {
    const userId = req.user.id;
    const sessionId = Number(req.params.id);
    const session = await prisma.interviewSession.findFirst({
      where: { id: sessionId, userId },
    });
    if (!session) return res.status(404).json({ message: "Not found" });
    res.json(session);
  } catch (error) {
    console.error("getInterview error:", error);
    res.status(500).json({ message: error.message });
  }
};
