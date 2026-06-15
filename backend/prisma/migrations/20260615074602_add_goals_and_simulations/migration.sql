-- CreateTable
CREATE TABLE "WeeklyGoal" (
    "id" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "targetRole" TEXT NOT NULL,
    "skillsFocus" TEXT[],
    "weekStart" TIMESTAMP(3) NOT NULL,
    "weekGoal" TEXT,
    "dailyPlan" JSONB,
    "expectedGain" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WeeklyGoal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SimulationSnapshot" (
    "id" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "skillsToggled" JSONB NOT NULL,
    "projectedScore" INTEGER NOT NULL,
    "delta" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SimulationSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WeeklyGoal_userId_weekStart_idx" ON "WeeklyGoal"("userId", "weekStart");

-- CreateIndex
CREATE INDEX "SimulationSnapshot_userId_createdAt_idx" ON "SimulationSnapshot"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "WeeklyGoal" ADD CONSTRAINT "WeeklyGoal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SimulationSnapshot" ADD CONSTRAINT "SimulationSnapshot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
