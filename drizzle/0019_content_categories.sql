DO $$ BEGIN
 CREATE TYPE "public"."content_category" AS ENUM('type-rating', 'light-aircraft', 'flying-knowledge');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "aircraft"
ADD COLUMN "category" "content_category" DEFAULT 'type-rating' NOT NULL;
--> statement-breakpoint
ALTER TABLE "questions"
ADD COLUMN "category" "content_category" DEFAULT 'type-rating' NOT NULL;
--> statement-breakpoint
UPDATE "aircraft"
SET "category" = CASE
  WHEN "code" = 'DA40' THEN 'light-aircraft'::"content_category"
  WHEN "code" = 'B737' THEN 'type-rating'::"content_category"
  ELSE 'type-rating'::"content_category"
END;
--> statement-breakpoint
UPDATE "questions" AS "q"
SET "category" = "a"."category"
FROM "aircraft" AS "a"
WHERE "q"."aircraft_code" = "a"."code";
