ALTER TABLE "disciple_relationships" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_plans_browse" ON "devotional_plans" USING btree ("is_public","category");--> statement-breakpoint
CREATE INDEX "idx_plans_creator" ON "devotional_plans" USING btree ("created_by_user_id");--> statement-breakpoint
CREATE INDEX "idx_progress_user_completed" ON "user_plan_progress" USING btree ("user_id","completed_at");