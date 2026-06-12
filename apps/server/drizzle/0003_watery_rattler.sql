CREATE TABLE "group_plan_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"group_id" uuid NOT NULL,
	"plan_id" uuid,
	"plan_title" text NOT NULL,
	"completed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "group_plan_history" ADD CONSTRAINT "group_plan_history_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_plan_history" ADD CONSTRAINT "group_plan_history_plan_id_devotional_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."devotional_plans"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_group_plan_history_group" ON "group_plan_history" USING btree ("group_id");