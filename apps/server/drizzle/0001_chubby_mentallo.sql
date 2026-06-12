ALTER TABLE "group_members" ADD COLUMN "last_streak_date" date;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "survey_gender" text;--> statement-breakpoint
CREATE INDEX "idx_disciple_relationships_disciple" ON "disciple_relationships" USING btree ("disciple_id");--> statement-breakpoint
CREATE INDEX "idx_group_members_user" ON "group_members" USING btree ("user_id");