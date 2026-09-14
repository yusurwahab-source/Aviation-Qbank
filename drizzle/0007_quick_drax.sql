ALTER TABLE "questions" DROP CONSTRAINT "questions_difficulty_range";--> statement-breakpoint
DROP INDEX "questions_aircraft_status_difficulty_idx";--> statement-breakpoint
ALTER TABLE "questions" DROP COLUMN "difficulty";