ALTER TABLE "AIAnalysis"
ADD COLUMN "requiredSkills" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "roleIntelligence" JSONB,
ADD COLUMN "roleGoalSnapshot" TEXT;
