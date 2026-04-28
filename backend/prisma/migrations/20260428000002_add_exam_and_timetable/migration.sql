-- New enums
CREATE TYPE "ExamType" AS ENUM ('MCQ', 'SHORT_ANSWER', 'MIXED');
CREATE TYPE "ExamDifficulty" AS ENUM ('EASY', 'MEDIUM', 'HARD');
CREATE TYPE "ExamSessionStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'ABANDONED');
CREATE TYPE "TimetableStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'ARCHIVED');

-- exam_sessions
CREATE TABLE "exam_sessions" (
  "id"              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId"          UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "title"           TEXT NOT NULL,
  "examType"        "ExamType" NOT NULL DEFAULT 'MCQ',
  "difficulty"      "ExamDifficulty" NOT NULL DEFAULT 'MEDIUM',
  "questionCount"   INTEGER NOT NULL DEFAULT 10,
  "timeLimitMins"   INTEGER,
  "status"          "ExamSessionStatus" NOT NULL DEFAULT 'IN_PROGRESS',
  "totalScore"      DOUBLE PRECISION,
  "maxScore"        DOUBLE PRECISION,
  "percentageScore" DOUBLE PRECISION,
  "startedAt"       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "completedAt"     TIMESTAMPTZ,
  "noteIds"         TEXT[] NOT NULL DEFAULT '{}',
  "createdAt"       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX "exam_sessions_userId_createdAt_idx" ON "exam_sessions"("userId", "createdAt");
CREATE INDEX "exam_sessions_userId_status_idx"    ON "exam_sessions"("userId", "status");

-- exam_questions
CREATE TABLE "exam_questions" (
  "id"             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "sessionId"      UUID NOT NULL REFERENCES "exam_sessions"("id") ON DELETE CASCADE,
  "questionNumber" INTEGER NOT NULL,
  "questionText"   TEXT NOT NULL,
  "questionType"   "ExamType" NOT NULL,
  "options"        JSONB,
  "correctAnswer"  TEXT NOT NULL,
  "userAnswer"     TEXT,
  "scoreAwarded"   DOUBLE PRECISION,
  "maxScore"       DOUBLE PRECISION NOT NULL DEFAULT 1.0,
  "aiFeedback"     TEXT,
  "isCorrect"      BOOLEAN,
  "createdAt"      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX "exam_questions_sessionId_questionNumber_idx"
  ON "exam_questions"("sessionId", "questionNumber");

-- study_timetables
CREATE TABLE "study_timetables" (
  "id"          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId"      UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "title"       TEXT NOT NULL DEFAULT 'My Study Plan',
  "examDate"    TIMESTAMPTZ NOT NULL,
  "hoursPerDay" DOUBLE PRECISION NOT NULL,
  "status"      "TimetableStatus" NOT NULL DEFAULT 'ACTIVE',
  "noteIds"     TEXT[] NOT NULL DEFAULT '{}',
  "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX "study_timetables_userId_status_idx" ON "study_timetables"("userId", "status");

-- timetable_days
CREATE TABLE "timetable_days" (
  "id"          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "timetableId" UUID NOT NULL REFERENCES "study_timetables"("id") ON DELETE CASCADE,
  "dayNumber"   INTEGER NOT NULL,
  "date"        TIMESTAMPTZ NOT NULL,
  "isCompleted" BOOLEAN NOT NULL DEFAULT FALSE,
  "completedAt" TIMESTAMPTZ,
  "reminderId"  UUID
);
CREATE INDEX "timetable_days_timetableId_date_idx" ON "timetable_days"("timetableId", "date");

-- timetable_day_slots
CREATE TABLE "timetable_day_slots" (
  "id"        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "dayId"     UUID NOT NULL REFERENCES "timetable_days"("id") ON DELETE CASCADE,
  "noteId"    UUID NOT NULL,
  "noteTitle" TEXT NOT NULL,
  "minutes"   INTEGER NOT NULL,
  "order"     INTEGER NOT NULL
);
CREATE INDEX "timetable_day_slots_dayId_idx" ON "timetable_day_slots"("dayId");
