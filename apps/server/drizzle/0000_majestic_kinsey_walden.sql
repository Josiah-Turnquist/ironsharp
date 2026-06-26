CREATE TABLE "bible_chapters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"translation" text DEFAULT 'KJV' NOT NULL,
	"book" text NOT NULL,
	"testament" text NOT NULL,
	"book_order" integer NOT NULL,
	"chapter" integer NOT NULL,
	"verses" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bible_chapters_unique" UNIQUE("translation","book","chapter")
);
--> statement-breakpoint
CREATE TABLE "community_devotionals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"publish_date" date NOT NULL,
	"title" text NOT NULL,
	"subtitle" text,
	"passage_reference" text NOT NULL,
	"passage_context" text,
	"study_notes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"reflection_q1" text NOT NULL,
	"reflection_q2" text NOT NULL,
	"prayer_prompt" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"created_by_user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "community_devotionals_publish_date_unique" UNIQUE("publish_date")
);
--> statement-breakpoint
CREATE TABLE "community_reactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"response_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"reaction_type" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "community_reactions_unique" UNIQUE("response_id","user_id","reaction_type")
);
--> statement-breakpoint
CREATE TABLE "community_responses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"community_devotional_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"response1" text,
	"response2" text,
	"prayer" text,
	"q1_private" boolean DEFAULT false NOT NULL,
	"q2_private" boolean DEFAULT false NOT NULL,
	"prayer_private" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "community_responses_unique" UNIQUE("community_devotional_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "custom_questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"discipleship_relationship_id" uuid NOT NULL,
	"disciple_id" text NOT NULL,
	"question_text" text NOT NULL,
	"for_date" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "custom_questions_unique" UNIQUE("discipleship_relationship_id","for_date")
);
--> statement-breakpoint
CREATE TABLE "devotional_days" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plan_id" uuid NOT NULL,
	"day_number" integer NOT NULL,
	"chapter" text NOT NULL,
	"theme" text,
	"passage_context" text,
	"study_notes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"reflection" text,
	"reflection_q1" text NOT NULL,
	"reflection_q2" text NOT NULL,
	"prayer_prompt" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "devotional_days_plan_day_unique" UNIQUE("plan_id","day_number")
);
--> statement-breakpoint
CREATE TABLE "devotional_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"subtitle" text,
	"description" text,
	"category" text NOT NULL,
	"total_days" integer DEFAULT 7 NOT NULL,
	"how_to_use" text,
	"image_url" text,
	"source" text DEFAULT 'curated' NOT NULL,
	"created_by_user_id" text,
	"is_public" boolean DEFAULT true NOT NULL,
	"match_key" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "devotional_submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"plan_id" uuid NOT NULL,
	"day_number" integer NOT NULL,
	"group_id" uuid,
	"response1" text,
	"response2" text,
	"response3" text,
	"prayer" text,
	"voice_memo_url" text,
	"audio_q1_url" text,
	"audio_q2_url" text,
	"q1_private" boolean DEFAULT false NOT NULL,
	"q2_private" boolean DEFAULT false NOT NULL,
	"q3_private" boolean DEFAULT false NOT NULL,
	"prayer_private" boolean DEFAULT true NOT NULL,
	"voice_memo_private" boolean DEFAULT false NOT NULL,
	"submission_source" text DEFAULT 'typed' NOT NULL,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "disciple_relationships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"discipler_id" text NOT NULL,
	"disciple_id" text NOT NULL,
	"group_id" uuid,
	"status" text DEFAULT 'active' NOT NULL,
	"privacy_notice_accepted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "disciple_relationships_unique" UNIQUE("discipler_id","disciple_id")
);
--> statement-breakpoint
CREATE TABLE "discipler_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"from_user_id" text NOT NULL,
	"to_user_id" text NOT NULL,
	"note" text NOT NULL,
	"related_submission_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "flagged_responses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"discipleship_relationship_id" uuid NOT NULL,
	"response_id" uuid NOT NULL,
	"question_type" text NOT NULL,
	"flagged_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "flagged_responses_unique" UNIQUE("discipleship_relationship_id","response_id","question_type")
);
--> statement-breakpoint
CREATE TABLE "group_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"group_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"member_role" text DEFAULT 'member' NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"done_today" boolean DEFAULT false NOT NULL,
	"streak_count" integer DEFAULT 0 NOT NULL,
	"last_streak_date" date,
	CONSTRAINT "group_members_unique" UNIQUE("group_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "group_plan_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"group_id" uuid NOT NULL,
	"plan_id" uuid,
	"plan_title" text NOT NULL,
	"completed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"group_type" text NOT NULL,
	"current_plan_id" uuid,
	"current_day" integer DEFAULT 1 NOT NULL,
	"streak_count" integer DEFAULT 0 NOT NULL,
	"last_streak_date" date,
	"invite_code" text NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "groups_invite_code_unique" UNIQUE("invite_code")
);
--> statement-breakpoint
CREATE TABLE "mailbox_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"discipleship_relationship_id" uuid NOT NULL,
	"sender_id" text NOT NULL,
	"message_type" text DEFAULT 'text' NOT NULL,
	"message_text" text,
	"audio_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"read_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "passage_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"book" text NOT NULL,
	"chapter" integer NOT NULL,
	"passage_reference" text NOT NULL,
	"context" text,
	"notes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "passage_notes_book_chapter_unique" UNIQUE("book","chapter")
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"display_name" text NOT NULL,
	"avatar_url" text,
	"primary_role" text DEFAULT 'disciple' NOT NULL,
	"streak_count" integer DEFAULT 0 NOT NULL,
	"last_streak_date" date,
	"total_completed" integer DEFAULT 0 NOT NULL,
	"generated_count" integer DEFAULT 0 NOT NULL,
	"generated_window_start" timestamp with time zone,
	"plan_unlocks_count" integer DEFAULT 0 NOT NULL,
	"plan_unlocks_window_start" timestamp with time zone,
	"church_name" text,
	"survey_name" text,
	"survey_age_range" text,
	"survey_gender" text,
	"survey_state" text,
	"survey_city" text,
	"survey_education" text,
	"survey_has_church" boolean,
	"survey_church_name" text,
	"survey_devotional_rating" integer,
	"survey_faith_journey" text,
	"survey_goals" text[],
	"survey_relationship_status" text,
	"survey_has_kids" boolean,
	"survey_completed_at" timestamp with time zone,
	"push_token" text,
	"notif_morning_reminder" boolean DEFAULT true NOT NULL,
	"notif_partner_done" boolean DEFAULT true NOT NULL,
	"notif_daily_nudge" boolean DEFAULT true NOT NULL,
	"notif_group_complete" boolean DEFAULT true NOT NULL,
	"family_code" text,
	"family_account_id" text,
	"membership_tier" text DEFAULT 'free' NOT NULL,
	"membership_started_at" timestamp with time zone,
	"membership_expires_at" timestamp with time zone,
	"membership_source" text DEFAULT 'none' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "profiles_user_id_unique" UNIQUE("user_id"),
	CONSTRAINT "profiles_family_code_unique" UNIQUE("family_code")
);
--> statement-breakpoint
CREATE TABLE "submission_reactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"submission_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"reaction_type" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "submission_reactions_unique" UNIQUE("submission_id","user_id","reaction_type")
);
--> statement-breakpoint
CREATE TABLE "user_plan_progress" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"plan_id" uuid NOT NULL,
	"current_day" integer DEFAULT 1 NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	CONSTRAINT "user_plan_progress_unique" UNIQUE("user_id","plan_id")
);
--> statement-breakpoint
ALTER TABLE "community_reactions" ADD CONSTRAINT "community_reactions_response_id_community_responses_id_fk" FOREIGN KEY ("response_id") REFERENCES "public"."community_responses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_responses" ADD CONSTRAINT "community_responses_community_devotional_id_community_devotionals_id_fk" FOREIGN KEY ("community_devotional_id") REFERENCES "public"."community_devotionals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "custom_questions" ADD CONSTRAINT "custom_questions_discipleship_relationship_id_disciple_relationships_id_fk" FOREIGN KEY ("discipleship_relationship_id") REFERENCES "public"."disciple_relationships"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "devotional_days" ADD CONSTRAINT "devotional_days_plan_id_devotional_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."devotional_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "devotional_submissions" ADD CONSTRAINT "devotional_submissions_plan_id_devotional_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."devotional_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "devotional_submissions" ADD CONSTRAINT "devotional_submissions_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "disciple_relationships" ADD CONSTRAINT "disciple_relationships_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discipler_notes" ADD CONSTRAINT "discipler_notes_related_submission_id_devotional_submissions_id_fk" FOREIGN KEY ("related_submission_id") REFERENCES "public"."devotional_submissions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flagged_responses" ADD CONSTRAINT "flagged_responses_discipleship_relationship_id_disciple_relationships_id_fk" FOREIGN KEY ("discipleship_relationship_id") REFERENCES "public"."disciple_relationships"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flagged_responses" ADD CONSTRAINT "flagged_responses_response_id_devotional_submissions_id_fk" FOREIGN KEY ("response_id") REFERENCES "public"."devotional_submissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_members" ADD CONSTRAINT "group_members_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_plan_history" ADD CONSTRAINT "group_plan_history_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_plan_history" ADD CONSTRAINT "group_plan_history_plan_id_devotional_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."devotional_plans"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "groups" ADD CONSTRAINT "groups_current_plan_id_devotional_plans_id_fk" FOREIGN KEY ("current_plan_id") REFERENCES "public"."devotional_plans"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mailbox_messages" ADD CONSTRAINT "mailbox_messages_discipleship_relationship_id_disciple_relationships_id_fk" FOREIGN KEY ("discipleship_relationship_id") REFERENCES "public"."disciple_relationships"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submission_reactions" ADD CONSTRAINT "submission_reactions_submission_id_devotional_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."devotional_submissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_plan_progress" ADD CONSTRAINT "user_plan_progress_plan_id_devotional_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."devotional_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_bible_chapters_lookup" ON "bible_chapters" USING btree ("translation","book","chapter");--> statement-breakpoint
CREATE INDEX "idx_community_devotionals_status_date" ON "community_devotionals" USING btree ("status","publish_date");--> statement-breakpoint
CREATE INDEX "idx_community_reactions_response" ON "community_reactions" USING btree ("response_id");--> statement-breakpoint
CREATE INDEX "idx_community_responses_devotional" ON "community_responses" USING btree ("community_devotional_id");--> statement-breakpoint
CREATE INDEX "idx_plans_browse" ON "devotional_plans" USING btree ("is_public","category");--> statement-breakpoint
CREATE INDEX "idx_plans_creator" ON "devotional_plans" USING btree ("created_by_user_id");--> statement-breakpoint
CREATE INDEX "idx_plans_match_key" ON "devotional_plans" USING btree ("match_key");--> statement-breakpoint
CREATE INDEX "idx_submissions_scope" ON "devotional_submissions" USING btree ("user_id","plan_id","day_number","group_id");--> statement-breakpoint
CREATE INDEX "idx_submissions_plan_day" ON "devotional_submissions" USING btree ("plan_id","day_number");--> statement-breakpoint
CREATE INDEX "idx_submissions_user" ON "devotional_submissions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_disciple_relationships_disciple" ON "disciple_relationships" USING btree ("disciple_id");--> statement-breakpoint
CREATE INDEX "idx_discipler_notes_thread" ON "discipler_notes" USING btree ("from_user_id","to_user_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_discipler_notes_recipient" ON "discipler_notes" USING btree ("to_user_id");--> statement-breakpoint
CREATE INDEX "idx_group_members_user" ON "group_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_group_plan_history_group" ON "group_plan_history" USING btree ("group_id");--> statement-breakpoint
CREATE INDEX "idx_mailbox_messages_thread" ON "mailbox_messages" USING btree ("discipleship_relationship_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_passage_notes_book_chapter" ON "passage_notes" USING btree ("book","chapter");--> statement-breakpoint
CREATE INDEX "idx_progress_user_completed" ON "user_plan_progress" USING btree ("user_id","completed_at");